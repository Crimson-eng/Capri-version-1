#!/usr/bin/env bash
# Entrena la voz propia de Capri (Piper) con las grabaciones exportadas desde Capri.
# Uso (en Ubuntu/WSL2, con tarjeta NVIDIA):   bash entrenar_voz.sh /mnt/c/CapriVoz
# La carpeta es donde descomprimiste capri-voz-entrenar.zip (tiene metadata.csv y wavs/).
# Si lo paras con Ctrl+C, vuelve a correr el mismo comando y sigue donde se quedó.
set -euo pipefail

DATA="$(realpath "${1:?Falta la carpeta del zip descomprimido. Ejemplo: bash entrenar_voz.sh /mnt/c/CapriVoz}")"
WORK="${CAPRI_WORK:-$HOME/capri-entrenar}"       # aquí se instala todo y se guardan los checkpoints
EPOCHS="${EPOCHS:-2000}"                         # receta de Piper para afinar con menos de 5 h de audio
BATCH="${BATCH:-16}"                             # 16 cabe en 8 GB de VRAM; con 12 GB o más prueba 24 o 32
NAME="es_MX-capri-medium"

[ -f "$DATA/metadata.csv" ] && [ -d "$DATA/wavs" ] || { echo "✗ En $DATA no están metadata.csv y la carpeta wavs/"; exit 1; }
command -v nvidia-smi >/dev/null && nvidia-smi -L || echo "⚠ No veo una tarjeta NVIDIA. Sin GPU el entrenamiento tardaría días."

echo "== 1/5 Paquetes del sistema =="
if ! dpkg -s build-essential cmake ninja-build espeak-ng python3-venv git >/dev/null 2>&1; then
  sudo apt-get update && sudo apt-get install -y build-essential cmake ninja-build espeak-ng python3-venv python3-dev git
fi

echo "== 2/5 Piper (código de entrenamiento) =="
mkdir -p "$WORK" && cd "$WORK"
[ -d piper1-gpl ] || git clone --depth 1 https://github.com/OHF-Voice/piper1-gpl.git
cd piper1-gpl
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
if [ ! -f .capri-listo ]; then
  python3 -m pip install -U pip wheel
  python3 -m pip install -e '.[train]' huggingface_hub
  ./build_monotonic_align.sh
  python3 setup.py build_ext --inplace
  touch .capri-listo
fi

echo "== 3/5 Voz base para afinar (se baja una vez) =="
BASE="$WORK/base.ckpt"
if [ ! -f "$BASE" ]; then
  python3 - "$BASE" <<'PY'
import sys, shutil
from huggingface_hub import list_repo_files, hf_hub_download
repo = "rhasspy/piper-checkpoints"
files = [f for f in list_repo_files(repo, repo_type="dataset") if f.endswith(".ckpt") and "/medium/" in f]
# primero una voz en español de calidad medium; si no hay, Lessac (inglés), que también sirve de base
pref = ["es/es_MX/", "es/es_ES/", "es/", "en/en_US/lessac/medium/"]
pick = next((f for p in pref for f in files if f.startswith(p)), files[0] if files else None)
if not pick: sys.exit("No encontré checkpoints en " + repo)
print("Base:", pick)
shutil.copy(hf_hub_download(repo, pick, repo_type="dataset"), sys.argv[1])
PY
fi

echo "== 4/5 Entrenando (horas; puedes dejarlo de noche) =="
python3 - "$DATA" <<'PY'
import sys, wave, glob, os
ds = [wave.open(f).getnframes() / 22050 for f in glob.glob(os.path.join(sys.argv[1], "wavs", "*.wav"))]
print(f"{len(ds)} frases, {sum(ds)/60:.1f} min de audio, {sum(ds)/len(ds):.1f} s en promedio")
if sum(ds) < 15 * 60: print("⚠ Menos de 15 minutos: va a salir, pero mientras más grabes, mejor.")
PY
RUN="$WORK/run"; mkdir -p "$RUN" "$WORK/cache"
LAST="$(ls -t "$RUN"/lightning_logs/version_*/checkpoints/last.ckpt 2>/dev/null | head -1 || true)"
ARGS=(--data.voice_name capri --data.csv_path "$DATA/metadata.csv" --data.audio_dir "$DATA/wavs"
  --model.sample_rate 22050 --data.espeak_voice es-419 --data.cache_dir "$WORK/cache"
  --data.config_path "$WORK/$NAME.onnx.json" --data.batch_size "$BATCH" --data.length_bucketing true
  --trainer.max_epochs "$EPOCHS" --trainer.default_root_dir "$RUN")
if [ -n "$LAST" ]; then echo "Sigo desde $LAST"; python3 -m piper.train fit "${ARGS[@]}" --ckpt_path "$LAST"
else python3 -m piper.train fit "${ARGS[@]}" --model.warmstart_ckpt "$BASE"; fi

echo "== 5/5 Exportando la voz =="
LAST="$(ls -t "$RUN"/lightning_logs/version_*/checkpoints/last.ckpt | head -1)"
OUT="$DATA/voz-capri"; mkdir -p "$OUT"
python3 -m piper.train.export_onnx --checkpoint "$LAST" --output-file "$OUT/$NAME.onnx"
cp "$WORK/$NAME.onnx.json" "$OUT/$NAME.onnx.json"
echo "✓ Lista. En Capri: Ajustes → Voz de Capri → Voz de tu PC → 📁 Desde archivo, y elige los dos archivos de:"
echo "   $OUT"
