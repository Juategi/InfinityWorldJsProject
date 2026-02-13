# Setup - Infinity World

## Requisitos previos

- Node.js (v20+)
- Docker Desktop (para PostgreSQL y Redis)

## 1. Servicios (Docker)

```bash
# Levantar PostgreSQL + Redis
docker compose up -d

# Verificar que estan corriendo
docker ps

# Parar servicios
docker compose down

# Parar y borrar datos persistidos
docker compose down -v
```

## 2. Backend

```bash
cd InfinityWorldJsBackend

# Instalar dependencias
npm install

# Ejecutar migraciones (requiere Docker corriendo)
npm run migrate:up

# Servidor de desarrollo (hot reload)
npm run dev
```

El backend corre en `http://localhost:3000`.

### Comandos de migraciones

```bash
npm run migrate:up       # Aplicar migraciones pendientes
npm run migrate:down     # Revertir ultima migracion
npm run migrate:create   # Crear nueva migracion vacia
```

### Health check

```
GET http://localhost:3000/health
```

## 3. Frontend

```bash
cd InfinityWorldJsFrontend

# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev
```

El frontend corre en `http://localhost:5173`.

## Arranque rápido (un solo comando)

```bash
# Windows
start.bat

# Git Bash / Linux / macOS
./start.sh
```

Levanta Docker, ejecuta migraciones, seeds, backend y frontend automáticamente.

## Orden de arranque (manual)

1. `docker compose up -d`
2. `cd InfinityWorldJsBackend && npm run migrate:up && npm run seed && npm run dev`
3. `cd InfinityWorldJsFrontend && npm run dev`
