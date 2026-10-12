# VOKO — Architecture Decision Records (ADRs)
**Versión:** 1.0.0 — Hito 0  
**Estado:** Propuesto  

---

### ADR-001: Adopción de Monolito Modular en NestJS
- **Contexto:** Se requiere construir una plataforma SaaS multi-tenant comercial, mantenible y escalable, que soporte múltiples rubros y tres modalidades de reserva.
- **Decisión:** Implementar un **Monolito Modular** utilizando NestJS en Node.js/TypeScript en lugar de una arquitectura de microservicios distribuidos.
- **Justificación:**
  - Los microservicios introducen una sobrecarga masiva de infraestructura (red, transacciones distribuidas con 2PC o Sagas, serialización, latencia y observabilidad compleja).
  - Un monolito modular mantiene los dominios desacoplados a nivel de código (`modules/auth`, `modules/appointments`, etc.), permitiendo transacciones ACID locales inmediatas en PostgreSQL para el motor de disponibilidad y reservas.
  - Si un módulo específico requiere escalar de forma independiente en el futuro, los límites de dominio ya estarán claramente delimitados.

---

### ADR-002: Modelo de Aislamiento Multi-Tenant con Base de Datos Compartida
- **Contexto:** El sistema atiende a múltiples empresas (barberías, consultorios, gimnasios). Los datos de cada negocio deben estar estrictamente aislados.
- **Decisión:** Utilizar el patrón de **Shared Database, Discriminator Column (`business_id`)** con validación centralizada de contexto en el backend.
- **Justificación:**
  - Base de datos por tenant o esquema por tenant aumentaría exponencialmente el costo de gestión de migraciones y pool de conexiones en el entorno de desarrollo y primeras etapas comerciales.
  - La columna `business_id` en todas las tablas de tenant con índices compuestos y foreign keys forzosas garantiza integridad referencial y alto rendimiento de consultas.
  - La seguridad se garantiza a nivel de capa de aplicación mediante `TenantContextGuard` y repositorios que nunca aceptan `business_id` sin validar la membresía del usuario autenticado en la sesión.

---

### ADR-003: Persistencia en PostgreSQL 16 con TypeORM y Migraciones Obligatorias
- **Contexto:** Se requiere un motor relacional sólido para transacciones críticas, integridad referencial y cálculos temporales.
- **Decisión:** Utilizar **PostgreSQL 16** con **TypeORM**, prohibiendo expresamente `synchronize: true`.
- **Justificación:**
  - PostgreSQL ofrece soporte nativo para extensiones temporales, rangos, tipos de fecha con zona horaria (`TIMESTAMPTZ`) y bloqueos a nivel de fila (`FOR UPDATE`).
  - Las migraciones versionadas garantizan reproducibilidad determinista del esquema entre desarrollo, staging y producción.

---

### ADR-004: Modelo Temporal en UTC con Timezones IANA por Negocio
- **Contexto:** Clientes y negocios pueden operar en diferentes zonas horarias, y las reservas deben ser inmunes a problemas de cambio de horario estacional (DST).
- **Decisión:** Guardar todos los instantes temporales en **UTC (`TIMESTAMPTZ`)** en PostgreSQL, almacenando el identificador IANA del negocio (ej. `America/Argentina/Buenos_Aires`).
- **Justificación:**
  - Evita ambigüedades en comparaciones cronológicas y cálculos de duración.
  - Permite renderizar agendas exactamente en la hora local del establecimiento físico o en la hora local del cliente según el contexto de uso.

---

### ADR-005: Prevención de Condiciones de Carrera y Dobles Reservas con Transacciones Pesimistas
- **Contexto:** Dos clientes pueden intentar reservar el mismo turno o el último cupo de una clase grupal exactamente en el mismo instante.
- **Decisión:** Utilizar transacciones atómicas con **bloqueos pesimistas (`SELECT ... FOR UPDATE`)** y verificación de solapamiento antes de confirmar cualquier reserva.
- **Justificación:**
  - El bloqueo optimista (versión de entidad) arrojaría errores de reintento que degradan la experiencia de usuario.
  - El bloqueo pesimista en PostgreSQL sobre el recurso o sobre la fila de la sesión grupal garantiza serialización inmediata en el motor de base de datos con cero posibilidades de overbooking.

---

### ADR-006: Desacoplamiento de Comunicaciones mediante Transactional Outbox
- **Contexto:** Las confirmaciones y cancelaciones deben enviar correos o notificaciones (n8n, email), pero una falla de red externa no debe tumbar una reserva válida.
- **Decisión:** Implementar el patrón **Transactional Outbox** con la tabla `notifications`.
- **Justificación:**
  - Garantiza entrega al menos una vez (at-least-once delivery) sin acoplar la latencia del proveedor de correo a la respuesta HTTP del cliente.
  - El sistema continúa operando al 100% incluso si el proveedor de correos o n8n sufre caídas temporales.

---

### ADR-007: Autenticación Robusta con Argon2id, Tokens de Sesión y Cookies HttpOnly
- **Contexto:** La plataforma gestionará credenciales de clientes y administradores con acceso a agendas y datos operativos.
- **Decisión:** Hash de contraseñas con **Argon2id**. Sesiones con Access Token JWT de corta vida (15 min) y Refresh Token persistido con hash en base de datos, transmitido en cookie `HttpOnly; Secure; SameSite=Lax`.
- **Justificación:**
  - Argon2id es el estándar actual más seguro contra ataques GPU y side-channel.
  - Las cookies `HttpOnly` mitigan el robo de tokens por ataques XSS en navegadores web.
