#!/bin/sh
# Doble clic para abrir el Estudio Bíblico en el navegador (deja esta ventana abierta).
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Falta Node.js. Descárgalo de https://nodejs.org (versión LTS), instálalo"
  echo "  y vuelve a abrir este archivo."
  echo ""
  open "https://nodejs.org"
  read -r _
  exit 1
fi
node tools/servidor.mjs --abrir /biblia/
