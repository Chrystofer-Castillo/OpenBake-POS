@echo off
title Detener OpenBake-POS
echo ===================================================
echo   🛑 Deteniendo OpenBake-POS...
echo ===================================================

taskkill /F /IM "openbake-pos.exe" 2>nul
taskkill /F /IM "OpenBake-POS.exe" 2>nul
taskkill /F /IM "dulce-arte.exe" 2>nul

for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    echo Cerrando proceso en puerto 5173 (PID: %%a)...
    taskkill /F /PID %%a 2>nul
)

echo ✅ OpenBake-POS detenido correctamente.
timeout /t 2 /nobreak >nul
