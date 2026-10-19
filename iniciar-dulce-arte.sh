#!/bin/bash
# ================================================================
# DULCE ARTE ERP — Lanzador de Escritorio
# ================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🍰 Iniciando Dulce Arte ERP..."

# Verificar si el servidor ya está activo, si no, iniciarlo
if ! curl -s http://localhost:5173 > /dev/null; then
  echo "🚀 Levantando servidor local..."
  npx vite --port 5173 --host &
  SERVER_PID=$!
  sleep 2
fi

# Detectar navegador para abrir en modo aplicación de escritorio nativa (sin barra de direcciones)
if command -v google-chrome &> /dev/null; then
  google-chrome --app="http://localhost:5173" --window-size=1280,820 &
elif command -v brave-browser &> /dev/null; then
  brave-browser --app="http://localhost:5173" --window-size=1280,820 &
elif command -v chromium &> /dev/null; then
  chromium --app="http://localhost:5173" --window-size=1280,820 &
elif command -v chromium-browser &> /dev/null; then
  chromium-browser --app="http://localhost:5173" --window-size=1280,820 &
elif command -v xdg-open &> /dev/null; then
  xdg-open "http://localhost:5173" &
else
  python3 -m webbrowser "http://localhost:5173" &
fi

echo "✅ Dulce Arte ERP ejecutándose en ventana de escritorio."
