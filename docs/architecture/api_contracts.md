# VOKO — Contratos de API REST v1 y Especificación de Endpoints
**Versión:** 1.0.0 — Hito 0  
**Prefijo Global:** `/api/v1`  
**Formato de Transferencia:** `application/json`  
**Documentación Interactiva:** OpenAPI 3.0 / Swagger en `/api/docs`  

---

## 1. Convenciones Globales y Formato de Respuestas

### 1.1. Respuestas Exitosas
Toda respuesta de la API responde con códigos de estado HTTP semánticos:
- `200 OK`: Consulta o mutación exitosa.
- `201 Created`: Recurso creado con éxito (retorna objeto creado y cabecera opcional `Location`).
- `204 No Content`: Operación completada sin contenido de retorno.

Estructura estándar de respuesta de colección paginada:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 154,
    "totalPages": 8
  }
}
```

### 1.2. Respuestas de Error (RFC 7807 Problem Details)
En caso de error, la API responde con el formato estándar `application/problem+json`:
```json
{
  "statusCode": 409,
  "errorCode": "BOOKING_SLOT_CONFLICT",
  "message": "El horario seleccionado ya fue reservado por otro usuario.",
  "timestamp": "2026-10-11T19:45:00.000Z",
  "path": "/api/v1/public/businesses/barberia-central/appointments",
  "details": [
    {
      "field": "startTime",
      "issue": "Horario no disponible para el recurso solicitado"
    }
  ]
}
```

---

## 2. Especificación de Endpoints Principales por Módulo

### 2.1. Autenticación y Cuentas (`/api/v1/auth`)
- `POST /auth/register` — Registro de cliente o usuario independiente.
  - Body: `{ firstName, lastName, email, password, phone? }`
- `POST /auth/login` — Inicio de sesión con credenciales.
  - Body: `{ email, password }`
  - Response: Set-Cookie con `refreshToken` (HttpOnly), body con `{ accessToken, user }`.
- `POST /auth/refresh` — Rotación de refresh token y emisión de nuevo access token.
  - Headers/Cookie: Cookie `refreshToken`.
- `POST /auth/logout` — Revocación de sesión activa y borrado de cookie.
- `POST /auth/forgot-password` — Solicitud de enlace de recuperación (idempotente para evitar enumeración de correos).
  - Body: `{ email }`
- `POST /auth/reset-password` — Aplicación de nueva contraseña con token criptográfico.
  - Body: `{ token, newPassword }`

### 2.2. Invitaciones (`/api/v1/invitations`)
- `GET /invitations/verify?token=xyz` — Validación pública del estado y expiración de una invitación.
- `POST /invitations/accept` — Aceptación de invitación y activación/vinculación de cuenta.
  - Body: `{ token, password?, firstName?, lastName? }`

### 2.3. Portal Público y Reservas de Clientes (`/api/v1/public`)
- `GET /public/businesses/:slug` — Perfil público del negocio, sucursales y branding.
- `GET /public/businesses/:slug/services` — Listado de servicios activos con precio, duración y modalidad.
- `GET /public/businesses/:slug/resources?serviceId=uuid` — Recursos/profesionales habilitados para un servicio.
- `GET /public/businesses/:slug/availability` — Consulta de franjas y slots disponibles.
  - Query: `date=YYYY-MM-DD&serviceId=uuid&branchId=uuid&resourceId=uuid?`
  - Response: `{ date, availableSlots: [{ startTime, endTime, resourceId }] }`
- `GET /public/businesses/:slug/sessions` — Sesiones grupales disponibles con cupos restantes.
  - Query: `serviceId=uuid&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Response: `[{ id, startTime, endTime, maxCapacity, currentAttendees, spotsLeft, instructorName }]`
- `POST /public/businesses/:slug/appointments` — Creación de reserva pública atómica.
  - Body: `{ serviceId, branchId, resourceId?, sessionId?, startTime?, customerNotes, customer: { firstName, lastName, email, phone } }`
  - Respuestas: `201 Created` o `409 Conflict (BOOKING_SLOT_CONFLICT | GROUP_SESSION_FULL)`

### 2.4. Área Privada del Cliente (`/api/v1/client`)
- `GET /client/appointments` — Listado de turnos del cliente (próximos y pasados) con filtrado.
- `GET /client/appointments/:id` — Detalle del turno.
- `POST /client/appointments/:id/cancel` — Cancelación por parte del cliente (validando plazo `cancellation_deadline_minutes`).
  - Body: `{ reason? }`
- `POST /client/appointments/:id/reschedule` — Reprogramación atómica dentro del plazo permitido.
  - Body: `{ newStartTime, newResourceId? }`
- `GET /client/profile` / `PUT /client/profile` — Datos personales del cliente.

### 2.5. Administración del Negocio (`/api/v1/business/:businessId`)
*(Todos estos endpoints requieren autenticación y membresía activa con rol `OWNER`, `ADMIN` o `STAFF` con permisos específicos).*

- **Agenda & Turnos:**
  - `GET /business/:businessId/appointments` — Consulta de agenda filtrable por rango de fechas, sucursal, profesional y estado.
  - `POST /business/:businessId/appointments` — Creación manual de turno (permite asociar cliente existente o nuevo).
  - `PATCH /business/:businessId/appointments/:id/status` — Cambio de estado (`CONFIRMED`, `COMPLETED`, `NO_SHOW`, `CANCELLED_BY_BUSINESS`).
  - `POST /business/:businessId/appointments/:id/reschedule` — Reprogramación por parte de administración.
  - `GET /business/:businessId/appointments/:id/history` — Trazabilidad y auditoría de eventos del turno.
- **Servicios:**
  - `GET /business/:businessId/services`
  - `POST /business/:businessId/services`
  - `PUT /business/:businessId/services/:id`
  - `PATCH /business/:businessId/services/:id/toggle-active`
- **Recursos y Personal:**
  - `GET /business/:businessId/resources`
  - `POST /business/:businessId/resources`
  - `PUT /business/:businessId/resources/:id`
  - `POST /business/:businessId/resources/:id/assign-services` — Asignación N:M de servicios.
- **Disponibilidad & Excepciones:**
  - `GET /business/:businessId/availability/rules`
  - `PUT /business/:businessId/availability/rules` — Actualización de matriz semanal de horarios.
  - `GET /business/:businessId/availability/exceptions`
  - `POST /business/:businessId/availability/exceptions` — Alta de feriado, vacaciones, pausa o apertura extraordinaria.
  - `DELETE /business/:businessId/availability/exceptions/:id`
- **Sesiones Grupales:**
  - `GET /business/:businessId/sessions`
  - `POST /business/:businessId/sessions`
  - `PATCH /business/:businessId/sessions/:id/cancel`
- **Clientes del Negocio:**
  - `GET /business/:businessId/customers` — Búsqueda y listado paginado con historial de asistencias y cancelaciones.
  - `POST /business/:businessId/customers/invite` — Envío de invitación al cliente.
- **Reportes:**
  - `GET /business/:businessId/reports/summary` — Ocupación, total reservas, cancelaciones, inasistencias en rango de fechas.

### 2.6. Superadministración Global (`/api/v1/superadmin`)
*(Requiere usuario con bandera `is_superadmin = true`).*
- `GET /superadmin/businesses` — Listado completo de tenants en la plataforma con estado y métricas.
- `POST /superadmin/businesses` — Creación manual de un nuevo negocio y primer admin.
- `PATCH /superadmin/businesses/:id/status` — Suspensión cautelar o reactivación de un tenant.
- `GET /superadmin/metrics` — Métricas agregadas a nivel plataforma.
- `GET /superadmin/audit-logs` — Registro de auditoría global.
