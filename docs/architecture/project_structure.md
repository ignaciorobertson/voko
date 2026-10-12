# VOKO — Estructura del Proyecto y Convenciones de Código
**Versión:** 1.0.0 — Hito 0  
**Patrón de Organización:** Monorepo Modular / Clean Modular Architecture  

---

## 1. Estructura de Directorios Propuesta

```
proyecto-voko-turnos/
├── .github/                      # Workflows de CI/CD (lint, test, build)
├── apps/
│   ├── api/                      # Backend NestJS (Node.js + TypeScript)
│   │   ├── src/
│   │   │   ├── common/           # Interceptores, guards, decoradores, filtros globales
│   │   │   │   ├── decorators/   # @CurrentUser(), @CurrentTenant(), @RequirePermissions()
│   │   │   │   ├── filters/      # HttpExceptionFilter (RFC 7807)
│   │   │   │   ├── guards/       # JwtAuthGuard, TenantContextGuard, RolesGuard
│   │   │   │   ├── interceptors/ # LoggingInterceptor, TransformInterceptor
│   │   │   │   └── pipes/        # ValidationPipe estricto
│   │   │   ├── config/           # Configuración tipada de entorno (@nestjs/config)
│   │   │   ├── database/         # Data source de TypeORM, migraciones y semillas
│   │   │   │   ├── migrations/   # Migraciones versionadas (001_initial_schema.ts, etc.)
│   │   │   │   ├── seeds/        # Datos de prueba para desarrollo
│   │   │   │   └── data-source.ts
│   │   │   ├── modules/          # Módulos de dominio aislados
│   │   │   │   ├── auth/         # Autenticación, tokens, sesiones, Argon2id
│   │   │   │   ├── users/        # Usuarios y perfiles
│   │   │   │   ├── businesses/   # Negocios, configuración, sucursales
│   │   │   │   ├── memberships/  # Roles, permisos y miembros de negocios
│   │   │   │   ├── services/     # Catálogo de servicios reservables
│   │   │   │   ├── resources/    # Profesionales y recursos físicos
│   │   │   │   ├── availability/ # Motor de reglas de disponibilidad y excepciones
│   │   │   │   ├── sessions/     # Sesiones grupales con cupos
│   │   │   │   ├── appointments/ # Núcleo de turnos y prevención de colisiones
│   │   │   │   ├── invitations/  # Invitaciones con tokens seguros
│   │   │   │   ├── notifications/# Transactional outbox y despacho de emails
│   │   │   │   ├── superadmin/   # Portal global de la plataforma
│   │   │   │   └── reports/      # Métricas de negocio
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/                 # Pruebas de integración y concurrencia (Supertest)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                      # Frontend React (Vite + TypeScript + Tailwind)
│       ├── public/               # Assets estáticos (incluyendo logotipos oficiales)
│       ├── src/
│       │   ├── api/              # Clientes HTTP tipados con Axios / Fetch
│       │   ├── assets/           # Iconos e imágenes locales
│       │   ├── components/       # Sistema de componentes accesibles y reutilizables
│       │   │   ├── ui/           # Botones, inputs, modales, alertas, badges, tablas
│       │   │   ├── calendar/     # Vistas de agenda (diaria, semanal, selector de turnos)
│       │   │   ├── layout/       # Sidebars, Navbar, Shells (admin, cliente, público)
│       │   │   └── feedback/     # Spinners de carga, empty states, error boundaries
│       │   ├── context/          # Contextos globales (AuthContext, TenantContext)
│       │   ├── hooks/            # Custom hooks (useAppointments, useAvailability, etc.)
│       │   ├── pages/            # Páginas de la aplicación por portal
│       │   │   ├── public/       # Landing de Voko, página del negocio, booking público
│       │   │   ├── auth/         # Login, registro, recuperar contraseña, aceptar invitación
│       │   │   ├── client/       # Portal del cliente (mis turnos, perfil)
│       │   │   ├── admin/        # Panel de administración del negocio (agenda, servicios, etc.)
│       │   │   └── superadmin/   # Panel de operador de la plataforma
│       │   ├── routes/           # Configuración de React Router con rutas protegidas
│       │   ├── styles/           # Tokens de diseño, Tailwind CSS, fuentes
│       │   ├── types/            # Tipos de TypeScript del frontend
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   └── shared/                   # Tipos TypeScript compartidos, enums y DTOs de validación
│       ├── src/
│       │   ├── enums/            # Roles, AppointmentStatus, BookingMode, etc.
│       │   ├── types/            # Contratos de datos comunes
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker/                       # Docker Compose para PostgreSQL en desarrollo
│   └── docker-compose.dev.yml
├── docs/                         # Documentación técnica del proyecto
│   └── architecture/             # Especificaciones, ADRs, contratos y diagramas
├── .env.example                  # Plantilla de variables de entorno seguras
├── package.json                  # Root monorepo (npm workspaces)
├── README.md                     # Guía de inicio rápido y desarrollo
└── tsconfig.base.json
```

---

## 2. Convenciones de Código y Nomenclatura

1. **Archivos y Carpetas:**
   - Carpetas: `kebab-case` (ej. `service-resources`, `business-settings`).
   - Archivos TypeScript: `kebab-case.ts` (ej. `create-appointment.dto.ts`, `appointment.entity.ts`).
   - Componentes React: `PascalCase.tsx` (ej. `CalendarView.tsx`, `AppointmentCard.tsx`).
   - Hooks: `camelCase.ts` con prefijo `use` (ej. `useAvailabilitySlots.ts`).

2. **Base de Datos:**
   - Tablas: `snake_case` en plural (ej. `users`, `business_memberships`, `availability_rules`).
   - Columnas: `snake_case` (ej. `first_name`, `buffer_before_minutes`).
   - Claves Primarias: `id` tipo UUID v4.
   - Claves Foráneas: `[entidad_singular]_id` (ej. `business_id`, `service_id`).

3. **TypeScript:**
   - Tipos e Interfaces: `PascalCase` (ej. `CreateAppointmentPayload`).
   - Enums: `PascalCase` con valores `SCREAMING_SNAKE_CASE`.
   - Modo estricto (`strict: true`) obligatorio sin excepciones (`noImplicitAny`, `strictNullChecks`).
   - Prohibido el uso de `any`; se debe utilizar `unknown` con type guards o tipado explícito.
