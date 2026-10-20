@echo off
title Detener Dulce Arte ERP
echo ===================================================
echo   🛑 Deteniendo Dulce Arte ERP...
echo ===================================================

:: Detener proceso ejecutable de Tauri si estuviera activo
taskkill /F /IM "dulce-arte.exe" >nul 2>&1
taskkill /F /IM "app.exe" >nul 2>&1

:: Detener proceso de Vite escuchando en el puerto 5173
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo ✨ Todos los procesos de Dulce Arte han sido cerrados correctamente.
timeout /t 2 /nobreak >nul
exit
