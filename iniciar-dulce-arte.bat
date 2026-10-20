@echo off
title Dulce Arte ERP
echo ===================================================
echo   🍰 Iniciando Dulce Arte ERP en Windows...
echo ===================================================

cd /d "%~dp0"

:: Verificar si el puerto 5173 ya esta en uso
netstat -ano | find "5173" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 🚀 Iniciando servidor interno...
    start /b "" npx vite --port 5173 --host
    timeout /t 2 /nobreak >nul
)

:: 1. Si existe el ejecutable nativo Tauri (.exe), abrirlo directamente
if exist "src-tauri\target\release\dulce-arte.exe" (
    echo 🖥️ Abriendo ejecutable nativo Tauri...
    start "" "src-tauri\target\release\dulce-arte.exe"
    exit
)

if exist "src-tauri\target\debug\dulce-arte.exe" (
    echo 🖥️ Abriendo ejecutable nativo Tauri...
    start "" "src-tauri\target\debug\dulce-arte.exe"
    exit
)

:: 2. Alternativa: Ventana de escritorio dedicada con Microsoft Edge o Chrome
echo 🖥️ Abriendo ventana de escritorio dedicada...
start msedge --app=http://localhost:5173 --window-size=1280,820 2>nul || start chrome --app=http://localhost:5173 --window-size=1280,820 2>nul || start http://localhost:5173

echo ✅ Dulce Arte ERP listo.
exit
