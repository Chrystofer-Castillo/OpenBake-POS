#!/bin/bash
# ================================================================
# DULCE ARTE ERP — Detener todos los servicios
# ================================================================

echo "🛑 Deteniendo Dulce Arte ERP..."

# Terminar proceso nativo Tauri si existe
pkill -9 -f "src-tauri/target/debug/app" 2>/dev/null

# Terminar servidor Vite local
pkill -9 -f "vite --port 5173" 2>/dev/null

echo "✨ Todos los procesos de Dulce Arte han sido cerrados correctamente."
