#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor RVC de Capri (2.19)
============================
Deja que Capri use TU modelo RVC tal cual sale del entrenamiento (.pth + .index), sin convertirlo a ONNX,
con la mejor calidad (tono con RMVPE, índice de timbre, GPU si tienes NVIDIA). También separa la voz
de la música de una canción para que Capri la cante.

No trae RVC adentro: usa tu instalación de Applio (open source, licencia MIT):
    https://github.com/IAHispano/Applio
Se corre con el Python de Applio, por ejemplo en Windows:
    C:\\Applio\\env\\python.exe capri_rvc_servidor.py --applio C:\\Applio
(la app de escritorio de Capri lo arranca sola con «Iniciar servidor» en RELIC → Voz → RVC).

Solo escucha en 127.0.0.1 (tu propia PC). Solo para modelos legales: tu voz, la de alguien que te dio
permiso, o con una licencia que lo permita.

Rutas:
    GET  /estado                      → {"ok":true, "modelos":[...], "separar":bool, "gpu":"..."}
    POST /convertir?modelo=NOMBRE&tono=0&metodo=rmvpe&indice=0.5&protect=0.33&autotune=0&fuerza=1
         cuerpo = audio WAV            → audio WAV con la voz del modelo
    POST /separar   cuerpo = audio     → {"id":"..."}  (voz y música por separado)
    GET  /separado/ID/voz.wav  y  /separado/ID/musica.wav
"""
import argparse
import hashlib
import inspect
import json
import os
import shutil
import sys
import tempfile
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

VERSION = "2.19"
ORIGENES = {
    "http://127.0.0.1:47823",          # la app de escritorio de Capri
    "http://localhost:47823",
    "https://crimson-eng.github.io",   # la página publicada
    "http://127.0.0.1:8080", "http://localhost:8080",  # pruebas locales
}
MAX_CUERPO = 300 * 1024 * 1024
METODOS = {"rmvpe", "crepe", "crepe-tiny", "fcpe", "harvest", "pm", "dio"}

args = None
TMP = None
lock = threading.Lock()          # una conversión a la vez (la GPU no se reparte bien)
estado_carga = {"applio": None, "error": None}
separados = {}                   # id → {"voz": ruta, "musica": ruta, "t": tiempo}


def log(*a):
    print(time.strftime("[%H:%M:%S]"), *a, flush=True)


# ---------------------------------------------------------------- Applio
_conv = None


def applio():
    """Carga Applio una sola vez (el modelo se queda en memoria entre frases: menos latencia)."""
    global _conv
    if _conv is not None:
        return _conv
    d = os.path.abspath(args.applio)
    if not os.path.isfile(os.path.join(d, "core.py")):
        raise RuntimeError(f"No encuentro Applio en {d} (falta core.py). Pasa --applio CARPETA_DE_APPLIO")
    os.chdir(d)                  # Applio busca sus modelos base (rmvpe, contentvec) relativo a su carpeta
    if d not in sys.path:
        sys.path.insert(0, d)
    try:
        from rvc.infer.infer import VoiceConverter
        _conv = ("vc", VoiceConverter())
    except Exception as e:      # versiones viejas o nuevas: probamos por core.py
        log("VoiceConverter no cargó directo (", e, "); uso core.run_infer_script")
        import core  # noqa
        _conv = ("core", core)
    estado_carga["applio"] = d
    return _conv


def _filtra(fn, kw):
    """Pasa solo los parámetros que esa versión de Applio acepta (cambian entre versiones)."""
    try:
        sig = inspect.signature(fn)
    except (TypeError, ValueError):
        return kw
    if any(p.kind == p.VAR_KEYWORD for p in sig.parameters.values()):
        return kw
    return {k: v for k, v in kw.items() if k in sig.parameters}


def convertir(entrada, salida, modelo, tono, metodo, indice, protect, autotune, fuerza):
    tipo, obj = applio()
    kw = dict(
        audio_input_path=entrada, audio_output_path=salida,
        model_path=modelo["pth"], index_path=modelo.get("index") or "",
        pitch=tono, f0_method=metodo, index_rate=indice, protect=protect,
        volume_envelope=1.0, hop_length=128, split_audio=False,
        f0_autotune=autotune, f0_autotune_strength=fuerza,
        clean_audio=False, export_format="WAV", embedder_model="contentvec", sid=0,
    )
    if tipo == "vc":
        obj.convert_audio(**_filtra(obj.convert_audio, kw))
    else:
        kc = dict(kw, input_path=entrada, output_path=salida, pth_path=modelo["pth"],
                  proposed_pitch=False, proposed_pitch_threshold=155.0, embedder_model_custom=None)
        obj.run_infer_script(**_filtra(obj.run_infer_script, kc))
    if not os.path.isfile(salida):
        raise RuntimeError("Applio no dejó el audio de salida")


# ---------------------------------------------------------------- modelos
def carpetas_modelos():
    out = []
    if args.modelos:
        out.append(os.path.abspath(args.modelos))
    if args.applio:
        out.append(os.path.join(os.path.abspath(args.applio), "logs"))
        out.append(os.path.join(os.path.abspath(args.applio), "assets", "weights"))
    return [d for d in out if os.path.isdir(d)]


def _es_checkpoint(nombre):
    n = nombre.lower()
    return n.startswith(("g_", "d_")) or n in ("g.pth", "d.pth") or "pretrain" in n


def lista_modelos():
    """Busca .pth (con su .index si lo hay) en la carpeta de modelos de Capri y en logs/ de Applio."""
    vistos, out = set(), []

    def agrega(pth, carpeta_idx, prefijo):
        stem = os.path.splitext(os.path.basename(pth))[0]
        idx = ""
        try:
            cand = [f for f in os.listdir(carpeta_idx) if f.lower().endswith(".index")]
        except OSError:
            cand = []
        base = stem.split("_")[0].lower()
        # primero el índice que se llame como el modelo; si no, «added_…» (el que usa RVC); si no, cualquiera
        cand.sort(key=lambda f: (base not in f.lower(), "added" not in f.lower(), f))
        if cand:
            idx = os.path.join(carpeta_idx, cand[0])
        nombre = (prefijo + "/" if prefijo else "") + stem
        if nombre in vistos:
            return
        vistos.add(nombre)
        out.append({"nombre": nombre, "pth": pth, "index": idx,
                    "mb": round(os.path.getsize(pth) / 1048576, 1)})

    for d in carpetas_modelos():
        try:
            items = sorted(os.listdir(d))
        except OSError:
            continue
        for f in items:
            p = os.path.join(d, f)
            if os.path.isfile(p) and f.lower().endswith(".pth") and not _es_checkpoint(f):
                agrega(p, d, "")
            elif os.path.isdir(p):
                try:
                    sub = sorted(os.listdir(p))
                except OSError:
                    continue
                for g in sub:
                    if g.lower().endswith(".pth") and not _es_checkpoint(g):
                        agrega(os.path.join(p, g), p, f)
    return out


# ---------------------------------------------------------------- separar voz / música
def puede_separar():
    try:
        import importlib.util
        return importlib.util.find_spec("audio_separator") is not None
    except Exception:
        return False


_sep = None


def separar(entrada, carpeta):
    global _sep
    from audio_separator.separator import Separator
    if _sep is None:
        _sep = Separator(output_dir=carpeta)
        _sep.load_model()        # el modelo por defecto (Roformer) se baja una vez
    else:
        _sep.output_dir = carpeta
    archivos = _sep.separate(entrada)
    voz = musica = None
    for f in archivos:
        p = f if os.path.isabs(f) else os.path.join(carpeta, f)
        n = os.path.basename(p).lower()
        if "instrumental" in n or "no_vocals" in n or "(other)" in n:
            musica = p
        elif voz is None and "vocals" in n:
            voz = p
    if not voz or not musica:
        raise RuntimeError("el separador no devolvió voz y música: " + ", ".join(map(str, archivos)))
    return voz, musica


def gpu():
    try:
        import torch
        if torch.cuda.is_available():
            return torch.cuda.get_device_name(0)
    except Exception:
        pass
    return "sin GPU (procesador)"


# ---------------------------------------------------------------- HTTP
class H(BaseHTTPRequestHandler):
    server_version = "CapriRVC/" + VERSION

    def log_message(self, fmt, *a):
        if args.verbose:
            log(self.address_string(), fmt % a)

    def _cors(self):
        o = self.headers.get("Origin")
        if o and (o in ORIGENES or o in args.origen):
            self.send_header("Access-Control-Allow-Origin", o)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            # la página corre con COEP «credentialless»: esto deja que el audio se use sin bloqueos
            self.send_header("Cross-Origin-Resource-Policy", "cross-origin")

    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _archivo(self, ruta, tipo="audio/wav"):
        with open(ruta, "rb") as f:
            b = f.read()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _origen_ok(self):
        o = self.headers.get("Origin")
        return o is None or o in ORIGENES or o in args.origen

    def _cuerpo(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_CUERPO:
            raise ValueError("audio vacío o demasiado grande")
        return self.rfile.read(n)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        if not self._origen_ok():
            return self._json(403, {"ok": False, "error": "origen no permitido"})
        u = urlparse(self.path)
        if u.path in ("/", "/estado"):
            return self._json(200, {
                "ok": True, "version": VERSION, "applio": os.path.abspath(args.applio),
                "listo": estado_carga["applio"] is not None, "error": estado_carga["error"],
                "gpu": GPU, "separar": puede_separar(),
                "carpetas": carpetas_modelos(),
                "modelos": [{k: m[k] for k in ("nombre", "mb")} | {"index": bool(m["index"])} for m in lista_modelos()],
            })
        p = u.path.strip("/").split("/")
        if len(p) == 3 and p[0] == "separado" and p[1] in separados and p[2] in ("voz.wav", "musica.wav"):
            return self._archivo(separados[p[1]]["voz" if p[2] == "voz.wav" else "musica"])
        self._json(404, {"ok": False, "error": "no existe"})

    def do_POST(self):
        if not self._origen_ok():
            return self._json(403, {"ok": False, "error": "origen no permitido"})
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        try:
            if u.path == "/convertir":
                return self._convertir(q)
            if u.path == "/separar":
                return self._separar()
        except Exception as e:
            traceback.print_exc()
            return self._json(500, {"ok": False, "error": str(e)[:400]})
        self._json(404, {"ok": False, "error": "no existe"})

    def _convertir(self, q):
        mods = {m["nombre"]: m for m in lista_modelos()}
        m = mods.get(q.get("modelo", ""))
        if not m:
            return self._json(404, {"ok": False, "error": "no encuentro ese modelo", "modelos": list(mods)})
        tono = max(-24, min(24, int(float(q.get("tono", 0)))))
        metodo = q.get("metodo", "rmvpe")
        metodo = metodo if metodo in METODOS else "rmvpe"
        indice = max(0.0, min(1.0, float(q.get("indice", 0.5))))
        protect = max(0.0, min(0.5, float(q.get("protect", 0.33))))
        autotune = q.get("autotune", "0") in ("1", "true", "si")
        fuerza = max(0.0, min(1.0, float(q.get("fuerza", 1))))
        cuerpo = self._cuerpo()
        d = tempfile.mkdtemp(dir=TMP)
        try:
            ent, sal = os.path.join(d, "entrada.wav"), os.path.join(d, "salida.wav")
            with open(ent, "wb") as f:
                f.write(cuerpo)
            t0 = time.time()
            with lock:
                convertir(ent, sal, m, tono, metodo, indice, protect, autotune, fuerza)
            log(f"✓ {m['nombre']}: {len(cuerpo) // 1024} KB en {time.time() - t0:.1f} s")
            self._archivo(sal)
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def _separar(self):
        if not puede_separar():
            return self._json(501, {"ok": False, "error": "falta audio-separator (instálalo con instalar_separador)"})
        cuerpo = self._cuerpo()
        sid = hashlib.sha1(cuerpo).hexdigest()[:16]
        if sid in separados and all(os.path.isfile(separados[sid][k]) for k in ("voz", "musica")):
            return self._json(200, {"ok": True, "id": sid})
        d = os.path.join(TMP, "sep_" + sid)
        os.makedirs(d, exist_ok=True)
        ent = os.path.join(d, "cancion" + (os.path.splitext(self.headers.get("X-Nombre", ""))[1] or ".wav"))
        with open(ent, "wb") as f:
            f.write(cuerpo)
        t0 = time.time()
        with lock:
            voz, musica = separar(ent, d)
        separados[sid] = {"voz": voz, "musica": musica, "t": time.time()}
        # se guardan solo las 4 últimas canciones
        for k in sorted(separados, key=lambda k: separados[k]["t"])[:-4]:
            shutil.rmtree(os.path.dirname(separados.pop(k)["voz"]), ignore_errors=True)
        log(f"✓ separada en {time.time() - t0:.0f} s")
        self._json(200, {"ok": True, "id": sid})


def main():
    global args, TMP, GPU
    ap = argparse.ArgumentParser(description="Servidor RVC local de Capri (usa Applio)")
    ap.add_argument("--applio", default=os.environ.get("CAPRI_APPLIO", "."), help="carpeta de Applio (donde está core.py)")
    ap.add_argument("--modelos", default=os.environ.get("CAPRI_RVC_MODELOS", ""), help="carpeta con tus .pth y .index")
    ap.add_argument("--puerto", type=int, default=5050)
    ap.add_argument("--origen", action="append", default=[], help="otro origen web permitido")
    ap.add_argument("--sin-precarga", action="store_true", help="no cargar Applio al arrancar")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()
    args.origen = set(args.origen)
    if args.modelos:
        os.makedirs(args.modelos, exist_ok=True)
    TMP = tempfile.mkdtemp(prefix="capri_rvc_")
    GPU = "?"
    if not args.sin_precarga:
        try:
            applio()
            log("✓ Applio cargado desde", estado_carga["applio"])
        except Exception as e:
            estado_carga["error"] = str(e)[:300]
            log("✗ Applio:", e)
    GPU = gpu()
    srv = ThreadingHTTPServer(("127.0.0.1", args.puerto), H)
    log(f"Servidor RVC de Capri {VERSION} en http://127.0.0.1:{args.puerto}  ·  {GPU}")
    for m in lista_modelos():
        log("  modelo:", m["nombre"], "(con índice)" if m["index"] else "(sin índice)")
    log("Carpetas de modelos:", ", ".join(carpetas_modelos()) or "(ninguna)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        shutil.rmtree(TMP, ignore_errors=True)


GPU = "?"
if __name__ == "__main__":
    main()
