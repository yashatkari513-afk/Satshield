@echo off
title Satellite Health Detector - Dev Launcher
echo ===================================================
echo Starting Satellite Health Detector Servers...
echo ===================================================

set SCRIPT_DIR=%~dp0

echo [1/2] Launching Python FastAPI ML Backend on port 8000...
start "FastAPI ML Backend (Port 8000)" cmd /k "cd /d "%SCRIPT_DIR%backend" && (py -3 api\main.py || python api\main.py || python3 api\main.py)"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Vite Frontend on port 5173...
start "Vite Frontend (Port 5173)" cmd /k "cd /d "%SCRIPT_DIR%." && (npm.cmd run dev || npm run dev)"

timeout /t 3 /nobreak >nul

echo.
echo ===================================================
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API: http://127.0.0.1:8000
echo Swagger Docs: http://127.0.0.1:8000/docs
echo ===================================================
echo Opening frontend in default browser...
start http://localhost:5173
pause

