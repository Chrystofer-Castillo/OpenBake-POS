@echo off
setlocal
chcp 65001 >nul
title Compilar OpenBake-POS (.exe)

echo =======================================================
echo   🚀 Compilando OpenBake-POS para Windows (.exe)
echo =======================================================
echo.

echo [1/3] Compilando frontend (Vite + TypeScript)...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Error al compilar el frontend.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Compilando instalador nativo con Tauri...
call npm run tauri:build
if %errorlevel% neq 0 (
    echo ❌ Error al compilar con Tauri. Asegúrate de tener Rust y WebView2 instalados.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Copiando el .exe a la carpeta /releases...
call node scripts/copy-release.js

echo.
echo =======================================================
echo   🎉 ¡LISTO! Tu archivo .exe se encuentra en:
echo   📁 releases\
echo =======================================================
echo.
pause
