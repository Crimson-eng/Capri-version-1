#!/usr/bin/env bash
# Servidor RVC de Capri en Linux/Mac con tu Applio (https://github.com/IAHispano/Applio, MIT).
# Uso:  bash iniciar_rvc.sh [carpeta de Applio]
set -euo pipefail
APPLIO="${1:-${CAPRI_APPLIO:-$HOME/Applio}}"
PY=""
for p in "$APPLIO/.venv/bin/python" "$APPLIO/env/bin/python" "$APPLIO/venv/bin/python"; do [ -x "$p" ] && PY="$p" && break; done
[ -f "$APPLIO/core.py" ] && [ -n "$PY" ] || { echo "No encontré Applio instalado en $APPLIO (corre su run-install.sh primero)"; exit 1; }
MODELOS="${CAPRI_RVC_MODELOS:-$HOME/Documents/Capri/RVC/modelos}"
mkdir -p "$MODELOS"
echo "Applio:  $APPLIO"
echo "Modelos: $MODELOS  (pon aquí tu .pth y tu .index)"
exec "$PY" -u "$(dirname "$0")/capri_rvc_servidor.py" --applio "$APPLIO" --modelos "$MODELOS" --puerto 5050
