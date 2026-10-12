# VOKO — Inventario del Entorno de Desarrollo y Herramientas
**Versión:** 1.0.0 — Hito 0  
**Fecha de Inspección:** 11 de Octubre de 2026  

---

## 1. Diagnóstico del Entorno del Sistema Anfitrión

| Componente | Versión / Estado Detectado | Notas Operativas |
|---|---|---|
| **Sistema Operativo** | Windows 10/11 x64 | Shell nativa PowerShell |
| **Node.js** | `v24.14.0` (LTS/Current) | Compatible con NestJS 11 y React 19 / Vite |
| **npm** | `11.9.0` | Soporte nativo para `npm workspaces` (monorepo) |
| **pnpm / yarn** | No instalados globalmente | Utilizaremos npm nativo con archivo de bloqueo `package-lock.json` |
| **Git** | `2.41.0.windows.3` | Instalado y operativo |
| **Docker Engine** | CLI `29.3.0`, Compose `v5.1.0` | Docker Desktop está instalado; requiere iniciarse para levantar el contenedor de PostgreSQL en el Hito 1 |
| **PostgreSQL Local** | No detectado como servicio Windows | Se proveerá de manera reproducible mediante `docker compose` en `docker/docker-compose.dev.yml` |

---

## 2. Inspección del Directorio del Proyecto

- **Ruta del Proyecto:** `c:\Users\Nachoo\Desktop\Proyecto Voko Turnos`
- **Estado Inicial:** Directorio limpio, sin código preexistente ni archivos residuales.
- **Activos de Marca:** No se detectó archivo gráfico del logotipo en el directorio ni en rutas estándar del usuario. Se solicita su provisión en la entrega del Hito 0.

---

## 3. Pila de Dependencias Seleccionadas para Hito 1

### Backend (`apps/api`):
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`: v11.x
- `typeorm`: v0.3.x
- `pg`: v8.x (Driver PostgreSQL)
- `@nestjs/typeorm`: v11.x
- `@nestjs/config`: v4.x
- `@nestjs/swagger`, `swagger-ui-express`: Documentación OpenAPI
- `argon2`: v0.41.x (Hasing criptográfico de contraseñas)
- `class-validator`, `class-transformer`: Validación de DTOs en runtime
- `jest`, `supertest`: Suite de pruebas automatizadas

### Frontend (`apps/web`):
- `react`, `react-dom`: v19.x (o v18.3 compatible)
- `vite`: v6.x
- `typescript`: v5.x
- `react-router-dom`: v7.x
- `@tanstack/react-query`: v5.x
- `react-hook-form`: v7.x
- `zod`: v3.x (Validación isomórfica compartida)
- `tailwindcss`, `postcss`, `autoprefixer`: v3.4.x
- `lucide-react`: Iconografía vectorial accesible
- `date-fns`: Manipulación de fechas y cálculo de agendas
