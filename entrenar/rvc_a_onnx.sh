#!/usr/bin/env bash
# Convierte un modelo RVC v2 (.pth) al .onnx que Capri carga en RELIC → Voz → RVC.
# Uso (Ubuntu/WSL2, no necesita GPU):   bash rvc_a_onnx.sh /mnt/c/CapriVoz/mi_voz.pth
# Solo para modelos legales: tu voz, la de alguien que te dio permiso, o con licencia que lo permita.
set -euo pipefail

PTH="$(realpath "${1:?Falta el .pth. Ejemplo: bash rvc_a_onnx.sh /mnt/c/CapriVoz/mi_voz.pth}")"
OUT="${PTH%.*}.onnx"
WORK="${CAPRI_WORK:-$HOME/capri-rvc}"

if ! dpkg -s python3-venv git >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y python3-venv python3-dev git; fi
mkdir -p "$WORK" && cd "$WORK"
# la versión 2.2 de RVC WebUI es la que trae el exportador a ONNX (las nuevas ya no)
[ -d rvc ] || git clone --depth 1 --branch 2.2.231006 https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI.git rvc
cd rvc
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
if [ ! -f .capri-listo ]; then
  python3 -m pip install -U pip
  # torch 2.4 (CPU basta): exporta con el método clásico y lee los .pth viejos sin problema
  python3 -m pip install torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu
  python3 -m pip install numpy scipy onnx
  touch .capri-listo
fi
python3 - "$PTH" "$OUT" <<'PY'
import sys
from infer.modules.onnx.export import export_onnx
print(export_onnx(sys.argv[1], sys.argv[2]))
PY
echo "✓ Listo: $OUT"
echo "  En Capri: RELIC → Voz → RVC → «+ Cargar un modelo» y elige ese .onnx."
