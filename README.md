# VOKO — Plataforma SaaS Multiempresa de Gestión de Turnos

Bienvenido a **Voko**, una plataforma web genérica y configurable para la administración y reserva de citas individuales, sesiones grupales con cupos y reservas de recursos físicos (barberías, consultorios, gimnasios, talleres, canchas y complejos deportivos).

---

## 1. Requisitos Previos

- **Node.js:** Versión 20.x o superior (detectado v24.14.0 en el entorno).
- **npm:** Versión 10.x o superior (detectado v11.9.0).
- **Docker Desktop:** Recomendado para levantar la base de datos PostgreSQL 16 local de manera reproducible.

---

## 2. Puesta en Marcha Rápida (Entorno de Desarrollo)

### 2.1. Instalación de Dependencias
En la raíz del proyecto, ejecute:
```bash
npm install
```
Esto instalará y vinculará automáticamente los paquetes compartidos (`@voko/shared`), el backend (`@voko/api`) y el frontend (`@voko/web`).

### 2.2. Configuración de Variables de Entorno
Copie el archivo de ejemplo a su archivo local si no existe:
```bash
cp .env.example .env
```

### 2.3. Base de Datos PostgreSQL (Docker Compose)
Para iniciar el contenedor oficial de PostgreSQL 16:
```bash
npm run docker:up
```
*(Para detenerlo posteriormente: `npm run docker:down`)*

### 2.4. Ejecución de Migraciones de TypeORM
Para aplicar las migraciones versionadas a PostgreSQL:
```bash
npm run migration:run --workspace=apps/api
```
*(Para revertir la última migración si es necesario: `npm run migration:revert --workspace=apps/api`)*

### 2.5. Iniciar la Aplicación en Desarrollo
Para iniciar simultáneamente Frontend y Backend:
```bash
npm run dev
```

O puede iniciarlos en terminales separadas:
```bash
# Terminal 1 — Backend NestJS (Puerto 3000)
npm run dev:api

# Terminal 2 — Frontend React + Vite (Puerto 5173)
npm run dev:web
```

---

## 3. URLs del Sistema en Desarrollo

- **Frontend Web Voko:** [http://localhost:5173](http://localhost:5173)
- **Backend API Health Check:** [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- **Documentación Swagger OpenAPI:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## 4. Scripts de Calidad y Verificación

```bash
# Compilar todos los paquetes y aplicaciones (TypeScript estricto)
npm run build

# Ejecutar pruebas automatizadas (Jest)
npm run test

# Verificar linter y estilos de código
npm run lint
```

---

## 5. Estructura del Monorepo

- `apps/api`: Backend REST API construido con NestJS, TypeORM y PostgreSQL.
- `apps/web`: Frontend SPA construido con React, Vite, TypeScript y Tailwind CSS.
- `packages/shared`: Tipos, DTOs y enums de dominio compartidos.
- `docker/`: Archivos de configuración de Docker Compose para base de datos local.
- `docs/architecture/`: Documentación formal de arquitectura, modelo relacional, contratos de API y plan de pruebas del Hito 0.
