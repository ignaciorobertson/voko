# VOKO — Contrato de Webhooks para Automatizaciones con n8n

**Versión:** 1.0.0 — Hito 9  
**Propósito:** Especificar el contrato de interfaz, esquemas de payload, firmas criptográficas y acuerdos de servicio para la integración de Voko con flujos de trabajo en **n8n** (y plataformas webhook compatibles).

---

## 1. Principio de Autonomía y Desacoplamiento (ADR-006)

1. **Operación Autónoma de Voko:** El sistema Voko opera al **100% de su capacidad sin requerir una instancia de n8n activa**. Todas las funciones de reservas, gestión de clientes, cobros y notificaciones por correo electrónico (`channel: EMAIL`) funcionan independientemente de n8n.
2. **Transactional Outbox:** Si una automatización o webhook hacia n8n falla o experimenta latencia, **la reserva del cliente se persiste exitosamente**. El evento queda registrado en la tabla `notifications` y se reintenta automáticamente con backoff exponencial.

---

## 2. Protocolo de Comunicación y Encabezados HTTP

Cuando se despacha un evento hacia el Webhook Node de n8n (`POST <webhook_url>`), Voko incluye los siguientes encabezados HTTP obligatorios:

| Encabezado HTTP | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `Content-Type` | string | Formato del cuerpo del mensaje | `application/json` |
| `X-Voko-Event` | string | Nombre canónico del evento | `APPOINTMENT_CONFIRMED` |
| `X-Voko-Signature` | string | Firma HMAC SHA-256 del payload | `sha256=4f53b8a10d9...` |
| `X-Voko-Timestamp` | string (ISO-8601) | Marca de tiempo en UTC del despacho | `2026-10-15T14:30:00.000Z` |
| `X-Voko-Delivery-Id` | string (UUID) | Identificador único de entrega (Idempotency Key) | `9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d` |

### Verificación de Firma HMAC SHA-256 en n8n
Para validar la autenticidad del emisor en un nodo **Code (JavaScript)** de n8n:

```javascript
const crypto = require('crypto');

const secret = $env.VOKO_WEBHOOK_SECRET;
const receivedSignature = $headers['x-voko-signature'];
const rawBody = JSON.stringify($json);

const calculatedSignature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

if (receivedSignature !== calculatedSignature) {
  throw new Error('Firma de webhook inválida. Solicitud rechazada.');
}

return $input.all();
```

---

## 3. Catálogo de Eventos y Esquemas de Carga Útil (Payloads)

### 3.1. `APPOINTMENT_CONFIRMED`
Disparado cuando una reserva es confirmada (inmediatamente en modo automático o tras aprobación manual).

```json
{
  "event": "APPOINTMENT_CONFIRMED",
  "id": "e7b0e123-01ab-4c22-b5b6-71234a5b6c7d",
  "timestamp": "2026-10-15T15:30:00.000Z",
  "data": {
    "appointmentId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "businessId": "b0000000-0000-0000-0000-000000000001",
    "businessName": "Voko Barber Club",
    "customerName": "Lucas Paciente",
    "customerEmail": "lucas@ejemplo.com",
    "customerPhone": "+5491122334455",
    "serviceName": "Corte Clásico + Perfilado",
    "startTime": "2026-10-16T14:00:00.000Z",
    "endTime": "2026-10-16T14:45:00.000Z",
    "branchName": "Sede Central Recoleta",
    "branchAddress": "Av. Santa Fe 1234",
    "resourceName": "Mateo Barbero",
    "price": 12000,
    "currency": "ARS"
  }
}
```

### 3.2. `APPOINTMENT_CANCELLED`
Disparado cuando un cliente o un operador del negocio cancela un turno.

```json
{
  "event": "APPOINTMENT_CANCELLED",
  "id": "f8c1f234-02bc-4d33-a6c7-82345b6c7d8e",
  "timestamp": "2026-10-15T16:00:00.000Z",
  "data": {
    "appointmentId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "businessId": "b0000000-0000-0000-0000-000000000001",
    "businessName": "Voko Barber Club",
    "customerName": "Lucas Paciente",
    "serviceName": "Corte Clásico + Perfilado",
    "startTime": "2026-10-16T14:00:00.000Z",
    "reason": "Imprevisto laboral del cliente"
  }
}
```

### 3.3. `APPOINTMENT_RESCHEDULED`
Disparado cuando una cita cambia de horario o profesional.

```json
{
  "event": "APPOINTMENT_RESCHEDULED",
  "id": "d9d2e345-03cd-4e44-b7d8-93456c7d8e9f",
  "timestamp": "2026-10-15T16:15:00.000Z",
  "data": {
    "appointmentId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "businessId": "b0000000-0000-0000-0000-000000000001",
    "businessName": "Voko Barber Club",
    "customerName": "Lucas Paciente",
    "serviceName": "Corte Clásico + Perfilado",
    "previousStartTime": "2026-10-16T14:00:00.000Z",
    "startTime": "2026-10-17T11:00:00.000Z",
    "endTime": "2026-10-17T11:45:00.000Z",
    "branchName": "Sede Central Recoleta",
    "resourceName": "Mateo Barbero"
  }
}
```

### 3.4. `APPOINTMENT_REMINDER`
Disparado en las 24 horas previas a la cita para enviar recordatorios por WhatsApp o SMS vía n8n.

```json
{
  "event": "APPOINTMENT_REMINDER",
  "id": "c0e3f456-04de-4f55-c8e9-04567d8e9f0a",
  "timestamp": "2026-10-15T10:00:00.000Z",
  "data": {
    "appointmentId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "businessName": "Voko Barber Club",
    "customerName": "Lucas Paciente",
    "serviceName": "Corte Clásico + Perfilado",
    "startTime": "2026-10-16T14:00:00.000Z",
    "branchName": "Sede Central Recoleta",
    "branchAddress": "Av. Santa Fe 1234",
    "resourceName": "Mateo Barbero"
  }
}
```

---

## 4. Política de Respuestas y Reintentos

1. **Códigos de Aceptación:** n8n debe responder con código `200 OK`, `201 Created` o `204 No Content` en un lapso menor a **4000 ms**.
2. **Reintentos y Backoff:** Si n8n responde con error `5xx`, `429 Too Many Requests` o agota el tiempo de conexión (timeout):
   - El registro pasa a estado `RETRYING` en la base de datos de Voko.
   - Reintento 1: A los 2 segundos.
   - Reintento 2: A los 4 segundos.
   - Reintento 3: A los 8 segundos.
   - Tras 3 reintentos fallidos, pasa a `FAILED` para revisión manual desde el panel de control.
3. **Idempotencia:** n8n debe usar `id` (`X-Voko-Delivery-Id`) para descartar mensajes duplicados si un reintento llegase a producirse por timeout de red.
