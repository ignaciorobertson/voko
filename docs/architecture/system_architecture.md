# VOKO — Arquitectura del Sistema e Ingeniería de Software
**Versión:** 1.0.0 — Hito 0 (Diseño y Planificación)  
**Estado:** Propuesto para Aprobación  
**Autores:** Equipo Senior de Desarrollo Voko  

---

## 1. Visión General del Producto

**Voko** es una plataforma SaaS multiempresa de nivel comercial diseñada para gestionar y reservar turnos individuales, actividades grupales con cupos y recursos físicos compartidos (canchas, consultorios, boxes, equipos).

El sistema opera bajo los principios de:
1. **Aislamiento Multi-tenant Estricto:** Separación lógica blindada en base de datos y autorización a nivel de servidor.
2. **Genérico por Configuración:** Adaptable a barberías, consultorios, gimnasios, centros deportivos, talleres y consultorías sin código espagueti ni excepciones por rubro.
3. **Consistencia Transaccional y Anti-Overbooking:** Cero dobles reservas y control estricto de cupos bajo concurrencia real en PostgreSQL.
4. **Autonomía Operativa y Costo Cero:** El núcleo de reservas opera de manera independiente a servicios de automatización externos (sin n8n ni Redis); notificaciones internas en tiempo real y scheduler nativo en PostgreSQL.

---

## 2. Arquitectura Lógica del Sistema (Monolito Modular)

Se adopta una arquitectura de **Monolito Modular** organizada por dominios de negocio. Esta decisión evita la complejidad prematura y la sobrecarga operativa de microservicios distribuidos, al tiempo que mantiene límites estrictos entre módulos mediante contratos limpios.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENTES (APPS)                                   |
|   - Web Pública / Landing / Reservas (React + Vite + Tailwind + TanStack Query)   |
|   - Portal de Negocios & Administración (React + Vite + Componentes UI Accesibles)|
|   - Portal de Superadmin Global                                                   |
+-----------------------------------------------------------------------------------+
                                          | HTTPS / REST v1 / JSON
                                          v
+-----------------------------------------------------------------------------------+
|                           API GATEWAY / CORE (NestJS)                             |
|  [Security Headers] [Rate Limiter Throttler] [CORS] [Tenant Context Interceptor]  |
+-----------------------------------------------------------------------------------+
|                                MÓDULOS DE DOMINIO                                 |
|                                                                                   |
|  [Auth & Sessions]   [Users & Profiles]  [Businesses & Branches] [Memberships]    |
|         |                     |                     |                  |          |
|  [Services Catalog]  [Resources/Staff]   [Availability Engine]   [Sessions/Cupos] |
|         |                     |                     |                  |          |
|  [Appointments Core] [Booking State]     [Transactional Outbox]  [Invitations]    |
|         |                     |                     |                  |          |
|  [Notifications Svc] [Audit & Events]    [Superadmin Global]     [Reports]        |
+-----------------------------------------------------------------------------------+
                                          | TypeORM (Migrations Only)
                                          v
+-----------------------------------------------------------------------------------+
|                         BASE DE DATOS (PostgreSQL 16)                             |
|   - Relaciones Fuertes (FKs)        - Índices Compuestos (business_id, ...)       |
|   - Constraints CHECK y UNIQUE      - Bloqueos pesimistas (SELECT ... FOR UPDATE) |
+-----------------------------------------------------------------------------------+
```

### 2.1. Módulos de Dominio y Responsabilidades

1. **Auth & Sessions (`auth`)**:
   - Autenticación con hash seguro Argon2id.
   - Access tokens de corta duración (JWT en memoria/Authorization header).
   - Refresh tokens con rotación obligatoria persistidos en base de datos y transportados en cookies `HttpOnly; Secure; SameSite=Lax`.
   - Recuperación de contraseña con tokens criptográficos de un solo uso.
   - Rate limiting adaptativo contra fuerza bruta.

2. **Users & Profiles (`users`)**:
   - Identidad unificada de la persona (email normalizado y único globalmente).
   - Perfil de usuario, datos de contacto y preferencias.
   - Soporte para baja lógica (`deleted_at`).
   - Un usuario puede interactuar con múltiples negocios sin duplicar su cuenta.

3. **Businesses & Branches (`businesses`, `branches`)**:
   - Datos del negocio: nombre, slug único, logo, timezone IANA oficial (e.g. `America/Argentina/Buenos_Aires`), moneda, reglas globales.
   - Sucursales (`branches`): soporte para sucursal principal por defecto y múltiples ubicaciones físicas con horarios propios.

4. **Memberships & Permissions (`memberships`)**:
   - Vínculo N:M entre `users` y `businesses`.
   - Roles: `OWNER`, `ADMIN`, `STAFF` (empleado/profesional), `CUSTOMER`.
   - Permisos granulares configurables (PBAC + RBAC).

5. **Services Catalog (`services`)**:
   - Catálogo de prestaciones con:
     - `duration_minutes`
     - `price` y `currency` opcionales
     - `buffer_before_minutes` y `buffer_after_minutes` (márgenes de preparación y limpieza)
     - `min_booking_notice_minutes` (anticipación mínima)
     - `max_booking_advance_days` (anticipación máxima)
     - `cancellation_deadline_minutes` (plazo límite de cancelación)
     - `booking_mode`: `INDIVIDUAL` (1 a 1), `GROUP_SESSION` (cupos), `RESOURCE_ONLY` (recurso puro).
     - `confirmation_mode`: `AUTOMATIC` o `MANUAL_APPROVAL`.

6. **Resources & Staff (`resources`, `service-resources`)**:
   - Modelado unificado de recursos humanos (`STAFF`) y físicos (`ROOM`, `COURT`, `BOX`, `EQUIPMENT`).
   - Relación N:M `service_resources` que define qué recursos están capacitados/habilitados para cada servicio.

7. **Availability Engine (`availability`)**:
   - `availability_rules`: Reglas periódicas semanales (lunes a domingo, franjas múltiples, horarios cortados/partidos).
   - `availability_exceptions`: Modificaciones extraordinarias (feriados, bloqueos parciales, vacaciones, pausas, aperturas excepcionales).
   - Generador y validador algorítmico de slots libres en el backend.

8. **Group Sessions (`sessions`)**:
   - Instancias programadas de actividades grupales asociadas a un servicio.
   - Control de `max_capacity` y `current_attendees`.
   - Asignación de profesional o sala responsable.

9. **Appointments Core (`appointments`, `appointment-events`)**:
   - Ciclo de vida completo del turno: `PENDING`, `CONFIRMED`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_BUSINESS`, `COMPLETED`, `NO_SHOW`.
   - Snapshot inmutable histórico: precio, duración y notas al momento de reservar.
   - Auditoría de eventos (`appointment_events`): quién cambió qué estado y cuándo.
   - Prevención atómica de solapamiento mediante bloqueos en PostgreSQL.

10. **Invitations (`invitations`)**:
    - Generación de invitaciones seguras con token hasheado (SHA-256), expiración configurable y consumo único.
    - Soporte para invitar administradores, profesionales o clientes.

11. **Notifications, In-App & Schedulers (`notifications`)**:
    - Sistema propio de notificaciones internas (`in_app_notifications`) en PostgreSQL con centro de avisos en frontend para clientes, profesionales y administradores (leídas/no leídas).
    - Despacho de email externo desacoplado exclusivamente para recuperación de contraseñas (Resend / Brevo / Local) sin agotar cuotas en operaciones cotidianas.
    - Automatizaciones y tareas programadas nativas con `@nestjs/schedule` y persistencia relacional con control de concurrencia e idempotencia (recordatorios de turnos de 24h y purga de sesiones/tokens expirados) sin requerir Redis ni BullMQ.

12. **Superadmin Global (`superadmin`)**:
    - Vista general de todos los tenants de la plataforma.
    - Activación, suspensión cautelar y auditoría.
    - Métricas globales agregadas sin exposición de datos personales sensibles.

13. **Reports & Metrics (`reports`)**:
    - Indicadores reales calculados con agregaciones SQL: ocupación, cancelaciones, inasistencias y distribución de demanda por servicio.

---

## 3. Las Tres Modalidades de Reserva

### Modalidad A: Turnos Individuales (1 a 1)
- **Caso típico:** Corte de pelo, consulta médica, sesión de kinesiología, servicio técnico.
- **Entidades:** 1 Cliente + 1 Servicio + 1 Recurso asignado (tipo `STAFF`).
- **Cálculo de Disponibilidad:**
  $$Slot_{valido} = [T_{inicio}, T_{fin}] \quad \text{donde} \quad T_{fin} = T_{inicio} + Duracion$$
  $$Intervalo_{ocupado} = [T_{inicio} - Buffer_{before}, T_{fin} + Buffer_{after}]$$
- **Garantía Anti-Overbooking:** La inserción de la reserva se realiza en una transacción con bloqueo pesimista sobre el horario del recurso (`SELECT ... FOR UPDATE` sobre la franja o control de solapamiento con exclusion constraints en PostgreSQL).

### Modalidad B: Sesiones Grupales con Cupos (Clases / Talleres)
- **Caso típico:** Clase de yoga, taller de cerámica, entrenamiento funcional.
- **Entidades:** Sesión (`sessions`) con fecha, hora, duración, instructor y `max_capacity`. Cada cliente reserva un cupo mediante un registro en `appointments` que referencia la `session_id`.
- **Garantía Anti-Overbooking:**
  1. Inicio de transacción en PostgreSQL.
  2. `SELECT id, current_attendees, max_capacity, status FROM sessions WHERE id = :sessionId FOR UPDATE;`
  3. Validación estricta: `if (current_attendees >= max_capacity || status != 'OPEN') throw ConflictException('Cupos agotados');`
  4. Inserción del `appointment` vinculado a la sesión.
  5. `UPDATE sessions SET current_attendees = current_attendees + 1 WHERE id = :sessionId;`
  6. Commit de la transacción.

### Modalidad C: Reservas de Recursos Físicos
- **Caso típico:** Alquiler de cancha de pádel, sala de reuniones, box de kinesiología, equipo especializado.
- **Entidades:** 1 Cliente + 1 Servicio + 1 Recurso físico (tipo `ROOM`, `COURT`, `BOX`, `EQUIPMENT`), con o sin profesional asociado.
- **Garantía Anti-Overbooking:** Mismo principio de reserva individual, validando que el recurso físico no presente superposición de intervalos con turnos existentes ni excepciones de bloqueo.

---

## 4. Estrategia de Aislamiento Multi-Tenant y Seguridad

### 4.1. Estrategia de Base de Datos
- **Patrón:** Base de datos compartida con discriminador de inquilino (`business_id`) en cada tabla perteneciente a un negocio.
- **Índices de Aislamiento:** Todas las tablas de tenant cuentan con índices compuestos donde `business_id` es el primer elemento de la clave (e.g. `CREATE INDEX idx_appointments_business_start ON appointments(business_id, start_time);`).
- **Foreign Keys Obligatorias:** Todas las entidades vinculadas (sucursales, servicios, recursos, reservas) tienen restricciones de clave foránea a `businesses(id) ON DELETE RESTRICT`.

### 4.2. Autorización y Contexto de Inquilino en el Backend
- Ningún controlador de NestJS acepta ni confía en un `business_id` recibido libremente en parámetros de consulta, cuerpo JSON o cabeceras sin validación.
- **Flujo de Autorización:**
  1. `JwtAuthGuard`: Valida la firma del token y extrae el `user_id`.
  2. `TenantContextGuard`:
     - Determina el negocio objetivo (desde la ruta `/businesses/:businessId/...` o slug).
     - Consulta la tabla `business_memberships` para comprobar que `user_id` pertenece a `business_id` y está activo.
     - Inyecta el objeto de membresía y permisos validados en `request.tenantContext`.
  3. `PermissionsGuard`: Verifica que el rol o permisos específicos del usuario permitan la acción solicitada.
  4. Los repositorios y servicios siempre filtran con la cláusula `WHERE business_id = request.tenantContext.businessId`.
- **Excepción Clientes Públicos:** En reservas públicas de un negocio, el tenant se resuelve mediante el `slug` del negocio y se restringe a operaciones estrictamente públicas (consultar servicios activos, consultar horarios disponibles y solicitar reserva con validación).

### 4.3. Criptografía y Gestión de Secretos
- **Contraseñas:** Algoritmo Argon2id con parámetros recomendados por OWASP (memory cost 64MB, time cost 3 iteraciones, paralelismo 4).
- **Tokens de Invitación / Recuperación:** Criptográficamente aleatorios (32 bytes / 256 bits generados con `crypto.randomBytes`), almacenados como hash SHA-256 en base de datos.
- **Rotación de Refresh Tokens:** Cada uso de un refresh token genera un nuevo par de tokens e invalida el token previo. Si se detecta reutilización de un token revocado, se revocan todas las sesiones del usuario como medida preventiva.

---

## 5. Manejo Temporal y Zonas Horarias

1. **Almacenamiento Estándar:** Todos los instantes temporales (`start_time`, `end_time`, `created_at`, etc.) se almacenan en PostgreSQL como `TIMESTAMPTZ` en **UTC**.
2. **Timezone del Negocio:** La tabla `businesses` almacena el identificador IANA oficial del establecimiento (ej: `America/Argentina/Buenos_Aires`).
3. **Cálculo de Disponibilidad:**
   - La fecha que el cliente consulta (ej: `2026-10-15`) se interpreta según la zona horaria del negocio.
   - Las reglas semanales de horario habitual (ej: "Lunes de 09:00 a 13:00") se convierten a instantes UTC específicos para esa fecha y zona horaria antes de evaluar conflictos.
   - De esta manera, los cambios de horario estacional (DST) se manejan de forma nativa sin desfasar la agenda.

---

## 6. Orquestación de Agentes y Trabajo en Paralelo (Directiva 2.6)

1. **Agente Principal (Tech Lead y Coordinador):**
   - Mantiene la coherencia arquitectónica y decisiones aprobadas.
   - Divide cada hito en tareas pequeñas, claras y verificables.
   - Determina qué tareas pueden ejecutarse en paralelo y las asigna según especialización.
   - Define contratos de API, tipos compartidos e interfaces antes de delegar tareas dependientes.
   - Evita modificaciones simultáneas sobre los mismos archivos, integra resultados y ejecuta pruebas de integración consolidadas.
   - Elabora el informe final del hito y detiene el desarrollo esperando aprobación explícita.
2. **Agente Especializado en Backend y Datos:**
   - Responsable de NestJS, PostgreSQL, TypeORM, contratos REST, autorización, motor de disponibilidad, reservas y concurrencia.
3. **Agente Especializado en Frontend y UI/UX:**
   - Responsable de React, TypeScript, sistema de diseño Voko, agendas, formularios y validación Zod.
4. **Agente Especializado en QA y Seguridad:**
   - Responsable de planes de prueba independientes, detección de dobles reservas, aislamiento multi-tenant y verificación de integridad.
5. **Reglas de Coordinación:**
   - No delegar tareas con dependencias mutuas sobre los mismos archivos en paralelo.
   - No aceptar código sin ejecutar pruebas de integración.
   - Los agentes secundarios no pueden avanzar de hito ni declarar aprobado un hito de forma autónoma.

