# VOKO — Plataforma SaaS Multiempresa de Gestión de Turnos

Bienvenido a **Voko**, una plataforma SaaS moderna, robusta, altamente eficiente y económica para la administración y reserva de citas individuales, sesiones grupales con control de cupos y gestión de recursos compartidos (consultorios, clínicas, barberías, estudios deportivos y complejos de servicios).

---

## 1. Principios Arquitectónicos y Decisiones Clave

Voko está diseñado bajo un principio de **máxima autonomía y simplicidad operativa**, minimizando costos fijos, dependencias de infraestructura y servicios externos pagos:

1. **Persistencia Central en PostgreSQL 16**: Toda la lógica transaccional, estados de reservas, sesiones, multi-tenancy, auditoría y outbox residen en PostgreSQL con soporte estricto de claves foráneas, restricciones de concurrencia y migraciones versionadas.
2. **Sin n8n**: Toda la lógica de negocio y automatizaciones se ejecuta de forma nativa en TypeScript dentro de NestJS. No se requiere ni utiliza n8n.
3. **Sin Redis ni BullMQ**: Las tareas programadas y colas de notificación operan mediante `@nestjs/schedule` y un patrón de Transactional Outbox persistido en PostgreSQL.
4. **Sin WhatsApp / SMS**: No se integran proveedores pagos de mensajería externa. La comunicación con clientes y staff se realiza a través del Centro de Notificaciones Interno In-App y enlaces directos de autoservicio.
5. **Resend Exclusivo para Recuperación de Contraseña**:
   - Integración oficial con el SDK `resend`.
   - Interfaz desacoplada (`IEmailProvider`): en desarrollo o si no se provee `RESEND_API_KEY`, activa automáticamente el proveedor local seguro (`LocalLogEmailProvider`) registrando los enlaces en consola.
   - Plantilla HTML adaptable profesional + fallback texto plano.
   - Tokens de un solo uso con hash seguro (SHA-256), expiración (1 hora) y revocación de sesiones previas al completarse el cambio.
6. **Notificaciones Internas Nativas (In-App)**:
   - Tabla `in_app_notifications` con soporte para roles, estados de lectura, contadores de no leídas y filtrado en tiempo real.
   - Avisos automáticos ante creación, reprogramación y cancelación de reservas.
   - Schedulers automáticos para recordatorios con 24 horas de anticipación e idempotencia estricta.

---

## 2. Requisitos Previos

- **Node.js**: Versión 20.x o superior (Node v24+ compatible).
- **npm**: Versión 10.x o superior.
- **Docker Desktop**: Para levantar el contenedor oficial de PostgreSQL 16 local.

---

## 3. Puesta en Marcha Rápida

### 3.1. Instalación de Dependencias
En la raíz del proyecto:
```bash
npm install
```

### 3.2. Configuración de Variables de Entorno
Cree o copie su archivo `.env` a partir de la plantilla:
```bash
cp .env.example .env
```

Variables clave en `.env`:
```env
# Conexión PostgreSQL
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=voko_user
DB_PASSWORD=voko_secure_password
DB_NAME=voko_db
DB_SSL=false

# URLs
APP_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3000/api/v1

# Resend (Opcional en desarrollo, requerido en producción)
RESEND_API_KEY=
RESEND_FROM_EMAIL=Voko <onboarding@resend.dev>
```

### 3.3. Iniciar PostgreSQL (Docker Compose)
Para iniciar la base de datos de desarrollo persistente:
```bash
npm run docker:up
```
*(Los datos se conservan en el volumen Docker `voko_postgres_data` persistiendo tras reinicios).*

### 3.4. Ejecución de Migraciones
Para aplicar las 3 migraciones versionadas sobre PostgreSQL:
```bash
npm run migration:run
```
*(Las migraciones también se validan y aplican de forma automática al iniciar la API).*

### 3.5. Cargar Datos de Prueba (Seeds)
Para popular datos iniciales representativos (superadmin, negocios, servicios, recursos, clientes y turnos):
```bash
npm run seed
```

### 3.6. Iniciar la Aplicación en Desarrollo
Para ejecutar simultáneamente Backend y Frontend en modo watch:
```bash
npm run dev
```

O en terminales separadas:
```bash
# Terminal 1 — Backend NestJS (Puerto 3000)
npm run dev:api

# Terminal 2 — Frontend React + Vite (Puerto 5173)
npm run dev:web
```

---

## 4. URLs y Accesos del Sistema

- **Frontend Web Voko:** [http://localhost:5173](http://localhost:5173)
- **Backend API Health Check:** [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- **Documentación Swagger OpenAPI:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### Credenciales de Prueba (Seeds)

| Rol | Email | Contraseña |
| :--- | :--- | :--- |
| **Superadmin** | `superadmin@voko.test` | `VokoSuperAdmin2026!` |
| **Propietario Negocio 1** | `owner@vokobarber.test` | `Password123!` |
| **Propietario Negocio 2** | `owner@dentalvoko.test` | `Password123!` |
| **Staff / Profesional** | `barbero@vokobarber.test` | `Password123!` |
| **Cliente** | `cliente1@test.com` | `Password123!` |

---

## 5. Scripts de Verificación y Testing

```bash
# Compilar todos los paquetes y aplicaciones (TypeScript estricto)
npm run build

# Ejecutar suite completa de pruebas (104+ tests unitarios y de integración)
npm run test

# Ejecutar pruebas del backend
npm test --workspace=apps/api
```

---

## 6. Estructura del Proyecto

- `apps/api`: Backend REST API con NestJS, TypeORM, PostgreSQL y Resend.
  - `src/database/entities/`: 19 entidades TypeORM que modelan el dominio completo.
  - `src/database/migrations/`: Migraciones versionadas e incrementales.
  - `src/modules/auth/`: Autenticación JWT, sesiones persistidas y recuperación de contraseña desacoplada con Resend.
  - `src/modules/notifications/`: Notificaciones In-App, outbox persistente y schedulers de recordatorios.
- `apps/web`: Frontend SPA con React, Vite, TypeScript, Tailwind CSS y Lucide Icons.
  - `src/pages/`: Vistas de login, portal de clientes, reservas públicas y dashboards de administración.
  - `src/components/notifications/`: Campana y panel de notificaciones en tiempo real para usuarios.
- `packages/shared`: Enums, interfaces de dominio y DTOs comunes.
- `docker/`: Configuración de PostgreSQL 16 con `docker-compose.dev.yml`.
