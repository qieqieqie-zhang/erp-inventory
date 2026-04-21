@echo off
echo Starting Amazon ERP System...
echo.

:: Start backend
echo [1/2] Starting Backend Server...
cd /d %~dp0backend
start "Backend Server" cmd /k "npm start"

:: Wait a moment
timeout /t 3 /nobreak >nul

:: Start frontend
echo [2/2] Starting Frontend Server...
cd /d %~dp0frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to exit...
pause >nul
