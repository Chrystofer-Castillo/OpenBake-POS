#!/bin/bash
# ================================================================
# DULCE ARTE ERP — Lanzador Oficial de Escritorio
# ================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🍰 Iniciando Dulce Arte ERP..."

# Asegurar que el servidor Vite esté activo en segundo plano totalmente desacoplado
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "🚀 Iniciando servidor interno..."
  nohup npx vite --port 5173 --host > /dev/null 2>&1 &
  sleep 2
fi

# 1. Si el binario nativo de escritorio Tauri existe, iniciarlo directamente
if [ -f "$DIR/src-tauri/target/debug/app" ]; then
  echo "🖥️  Abriendo ventana nativa de escritorio (Tauri)..."
  nohup "$DIR/src-tauri/target/debug/app" > /dev/null 2>&1 &
  disown
  echo "✅ Dulce Arte listo. Tu terminal queda libre."
  exit 0
fi

# 2. Alternativa: Ventana de escritorio dedicada en modo Web App
if command -v brave-browser &> /dev/null; then
  nohup brave-browser --app="http://localhost:5173" --window-size=1280,820 > /dev/null 2>&1 &
elif command -v google-chrome &> /dev/null; then
  nohup google-chrome --app="http://localhost:5173" --window-size=1280,820 > /dev/null 2>&1 &
elif command -v chromium &> /dev/null; then
  nohup chromium --app="http://localhost:5173" --window-size=1280,820 > /dev/null 2>&1 &
elif command -v xdg-open &> /dev/null; then
  nohup xdg-open "http://localhost:5173" > /dev/null 2>&1 &
fi

disown
echo "✅ Dulce Arte listo. Tu terminal queda libre."
