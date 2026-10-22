@echo off
title OpenBake-POS
echo ===================================================
echo   🧁 Iniciando OpenBake-POS en Windows...
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
if exist "releases\OpenBake-POS.exe" (
    echo 🖥️ Abriendo ejecutable nativo desde releases...
    start "" "releases\OpenBake-POS.exe"
    exit
)

if exist "src-tauri\target\release\openbake-pos.exe" (
    echo 🖥️ Abriendo ejecutable nativo Tauri...
    start "" "src-tauri\target\release\openbake-pos.exe"
    exit
)

:: 2. Alternativa: Ventana de escritorio dedicada con Microsoft Edge o Chrome
echo 🖥️ Abriendo ventana de escritorio dedicada...
start msedge --app=http://localhost:5173 --window-size=1280,820 2>nul || start chrome --app=http://localhost:5173 --window-size=1280,820 2>nul || start http://localhost:5173

echo ✅ OpenBake-POS listo.
exit
