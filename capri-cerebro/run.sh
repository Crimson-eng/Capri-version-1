#!/bin/sh
# Cerebro de Capri en Linux o Mac. Solo necesita Python 3.8+ (ya viene en casi todos).
cd "$(dirname "$0")"
PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then
  echo "No encuentro Python 3. Instálalo: sudo apt install python3  (Linux)  o  https://www.python.org/downloads/ (Mac)"
  exit 1
fi
exec "$PY" capri_cerebro.py --abrir "$@"
