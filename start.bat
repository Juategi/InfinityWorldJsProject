@echo off
setlocal

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%InfinityWorldJsBackend
set FRONTEND_DIR=%ROOT_DIR%InfinityWorldJsFrontend

echo ==> Starting Docker services (PostgreSQL + Redis)...
docker compose -f "%ROOT_DIR%docker-compose.yml" up -d
if errorlevel 1 (
    echo ERROR: Docker failed to start. Is Docker Desktop running?
    exit /b 1
)

echo ==> Waiting for PostgreSQL...
set READY=0
for /l %%i in (1,1,30) do (
    if !READY!==0 (
        docker exec iw-postgres pg_isready -U iw_user -d infinity_world >nul 2>&1
        if not errorlevel 1 (
            echo     PostgreSQL ready.
            set READY=1
        ) else (
            timeout /t 1 /nobreak >nul
        )
    )
)

echo ==> Installing backend dependencies...
cd /d "%BACKEND_DIR%"
call npm install --silent

echo ==> Running migrations...
call npm run migrate:up

echo ==> Running seeds...
call npm run seed

echo ==> Starting backend (dev)...
start "IW-Backend" cmd /c "cd /d "%BACKEND_DIR%" && npm run dev"

echo ==> Waiting for backend on :3000...
timeout /t 5 /nobreak >nul

echo ==> Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
call npm install --silent

echo ==> Starting frontend (dev)...
start "IW-Frontend" cmd /c "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ==========================================
echo   Infinity World running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo   Health:   http://localhost:3000/health
echo ==========================================
echo   Close the Backend/Frontend windows to stop.
echo.

endlocal
