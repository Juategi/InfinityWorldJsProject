#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/InfinityWorldJsBackend"
FRONTEND_DIR="$ROOT_DIR/InfinityWorldJsFrontend"

cleanup() {
  echo ""
  echo "Stopping..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# 1. Docker services
echo "==> Starting Docker services (PostgreSQL + Redis)..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

echo "==> Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker exec iw-postgres pg_isready -U iw_user -d infinity_world >/dev/null 2>&1; then
    echo "    PostgreSQL ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    ERROR: PostgreSQL did not start in time."
    exit 1
  fi
  sleep 1
done

# 2. Backend: install, migrate, seed, dev
echo "==> Installing backend dependencies..."
cd "$BACKEND_DIR" && npm install --silent

echo "==> Running migrations..."
npm run migrate:up

echo "==> Running seeds..."
npm run seed

echo "==> Starting backend (dev)..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to be reachable
echo "==> Waiting for backend on :3000..."
for i in $(seq 1 20); do
  if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "    Backend ready."
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "    WARNING: Backend not responding yet, continuing anyway..."
  fi
  sleep 1
done

# 3. Frontend: install, dev
echo "==> Installing frontend dependencies..."
cd "$FRONTEND_DIR" && npm install --silent

echo "==> Starting frontend (dev)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "  Infinity World running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000"
echo "  Health:   http://localhost:3000/health"
echo "=========================================="
echo "  Press Ctrl+C to stop everything."
echo ""

wait
