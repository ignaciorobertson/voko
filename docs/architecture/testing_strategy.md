# VOKO — Plan y Estrategia Integral de Pruebas (QA)
**Versión:** 1.0.0 — Hito 0  
**Enfoque:** Calidad y Verificación Funcional Continua  

---

## 1. Filosofía de Calidad de Voko

En Voko no se declara ninguna funcionalidad terminada basándose únicamente en que el código compile o en pruebas manuales ad-hoc. Toda regla crítica del negocio —especialmente la prevención de dobles reservas, el control de cupos y el aislamiento multi-tenant— debe contar con cobertura automatizada ejecutable y verificable.

```
       / \
      / E2E \       Flujos críticos de punta a punta (Playwright)
     /-------\
    /  Integ. \     Pruebas de API con PostgreSQL real (Supertest + Jest)
   /-----------\
  /   Unitarias \   Lógica pura de disponibilidad y validaciones (Jest)
 /---------------\
```

---

## 2. Niveles de Pruebas y Herramientas

| Nivel | Herramienta | Alcance |
|---|---|---|
| **Unitarias** | Jest / Vitest | Cálculo algorítmico de slots, solapamiento de rangos, transformaciones de timezone, validadores DTO con Zod/class-validator. |
| **Integración** | Jest + Supertest + PostgreSQL | Transacciones de base de datos, migraciones, aislamiento multi-tenant en consultas, guards de NestJS, persistencia real. |
| **Concurrencia** | Scripts Node.js / Jest (`Promise.all`) | Pruebas de estrés y condición de carrera: 10 solicitudes simultáneas para el mismo turno o para el último cupo grupal. |
| **End-to-End (E2E)** | Playwright | Flujo completo de reserva pública, login, gestión en panel de control, validación responsive en mobile y desktop. |

---

## 3. Matriz de Casos de Prueba Críticos Obligatorios

### 3.1. Autenticación y Autorización Multi-Tenant
1. **Acceso Anónimo a Rutas Protegidas:** Solicitud sin cabecera `Authorization` ni cookie válida debe retornar `401 Unauthorized`.
2. **Acceso Cruzado entre Negocios (Cross-Tenant Leak):**
   - Un usuario con rol `ADMIN` en el negocio A intenta consultar `/api/v1/business/:businessBId/appointments`.
   - **Resultado Esperado:** `403 Forbidden` y registro del intento en auditoría.
3. **Escalamiento de Privilegios:**
   - Un usuario con rol `CUSTOMER` intenta invocar endpoints administrativos de su propio negocio.
   - **Resultado Esperado:** `403 Forbidden`.
4. **Acceso a Datos de Clientes Ajenos:**
   - Cliente X intenta ver el turno de Cliente Y modificando el UUID en la URL.
   - **Resultado Esperado:** `404 Not Found` o `403 Forbidden`.
5. **Invitación Expirada o Reutilizada:**
   - Intento de aceptar una invitación con fecha de vencimiento superada -> `400 Bad Request (INVITATION_EXPIRED)`.
   - Intento de aceptar una invitación ya utilizada -> `400 Bad Request (INVITATION_ALREADY_USED)`.

### 3.2. Motor de Disponibilidad
1. **Horario Habitual con Franja Única:** Generación correcta de slots de duración $D$ en el intervalo $[T_{inicio}, T_{fin}]$.
2. **Horarios Divididos (Mañana y Tarde):** No se generan slots en el intervalo del corte (almuerzo/pausa).
3. **Buffers Antes y Después:** Un turno de 45 minutos con 15 minutos de buffer posterior bloquea 60 minutos en la agenda del recurso.
4. **Feriados y Cierres Completos:** Una excepción de tipo `HOLIDAY` en fecha $F$ bloquea todos los slots de dicha fecha para el negocio o sucursal.
5. **Apertura Extraordinaria:** Una excepción de tipo `EXTRAORDINARY_OPENING` en un día normalmente no laborable habilita slots válidos.
6. **Anticipación Mínima y Máxima:** No se pueden consultar ni reservar slots con menos de $X$ minutos ni más de $Y$ días de antelación.

### 3.3. Prevención de Dobles Reservas y Concurrencia
1. **Reserva Simultánea de Turno Individual (Race Condition Test):**
   - Se disparan 5 solicitudes concurrentes en el mismo milisegundo para reservar exactamente el mismo slot de un recurso.
   - **Resultado Esperado:** Exactamente 1 solicitud responde `201 Created` y las 4 restantes responden `409 Conflict (SLOT_UNAVAILABLE)`.
   - Verificación en base de datos: Solo 1 fila creada en `appointments`.
2. **Cupos de Sesión Grupal Agotados (Overbooking Test):**
   - Una clase tiene `max_capacity = 10` y `current_attendees = 9`.
   - Se disparan 5 solicitudes concurrentes.
   - **Resultado Esperado:** Exactamente 1 solicitud es aceptada y 4 son rechazadas con `409 Conflict (GROUP_SESSION_FULL)`.
   - Verificación en base de datos: `current_attendees` queda exactamente en 10.
3. **Reprogramación Atómica:**
   - Intento de reprogramar una reserva existente hacia un horario ya ocupado.
   - **Resultado Esperado:** Falla con `409 Conflict`, y la reserva en su horario original se mantiene intacta en estado `CONFIRMED`.

### 3.4. Resiliencia de Notificaciones (Transactional Outbox)
1. **Fallo en Proveedor de Correo:**
   - Se crea una reserva exitosa, pero el servicio de email arroja error de timeout.
   - **Resultado Esperado:** La reserva se persiste correctamente (`201 Created`); el registro en `notifications` queda en estado `RETRYING` para el worker asíncrono.
