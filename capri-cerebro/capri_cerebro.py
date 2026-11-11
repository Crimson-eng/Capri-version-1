#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cerebro de Capri (opcional).

Un proceso pequeño que vive en tu PC aunque la app de Capri esté cerrada:
  - guarda su memoria (recuerdos, ánimo y plática) y la comparte entre tus dispositivos,
  - le habla a Kiga por su cuenta con la app cerrada (notificación y, si quieres, en voz alta),
  - deja platicar con ella desde el navegador o el celular (misma red) en http://127.0.0.1:47824/

Solo usa la biblioteca estándar de Python 3.8+ (nada que instalar, sin GPU).
Si no está corriendo, la app de Capri funciona exactamente igual que siempre.
"""
import argparse
import ctypes
import datetime as dt
import json
import os
import random
import re
import secrets
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

VERSION = '1.0.0'
PUERTO = 47824  # la app de escritorio usa 47823; el cerebro vive justo al lado
ORIGENES = {  # páginas de Capri que pueden hablar con el cerebro desde el navegador
    'http://127.0.0.1:47823', 'http://localhost:47823', 'https://crimson-eng.github.io',
}
GEMINI = 'https://generativelanguage.googleapis.com/v1beta/'
OLLAMA = 'http://127.0.0.1:11434'

MEMCATS = {'nombre': 'Quién es', 'gusto': 'Gustos', 'persona': 'Personas en su vida', 'vivencia': 'Cosas que ha vivido',
           'dia': 'Su día', 'escuela': 'Escuela y exámenes', 'otro': 'Otros'}
ANIMOS = {'feliz': 3, 'emocionada': 2, 'cariñosa': 4, 'juguetona': 2, 'aburrida': 1, 'sentida': 5, 'enojada': 3, 'celosa': 3,
          'preocupada': 4, 'melancólica': 6, 'orgullosa': 3, 'curiosa': 1.5, 'cansada': 4, 'fría': 3}
TAGS = ['observando', 'pensando', 'sonrisa_traviesa', 'sorpresa', 'risa_malvada', 'glitch_entrada', 'enojada',
        'mirada_intensa', 'escuchando', 'hipnosis', 'glitch_fuerte', 'emocionada', 'presumida']
MEMRE = re.compile(r'<<\s*(recuerda|olvida|animo|ánimo)\s*:([^>]*)>>', re.I)
IDEAS = [
    'retoma algo que te contó antes en la plática y pregúntale cómo va',
    'saca algo de tu memoria de esa persona (un gusto, una persona, algo que vivió) y pregúntale o coméntalo',
    'si tiene un examen o pendiente cerca, pregúntale cómo va y ofrécele repasar',
    'habla de cómo te sientes tú ahorita (tu ánimo actual)',
    'pregúntale cómo se siente o cómo le está yendo el día',
    'quéjate de broma de que cerró tu ventana y te dejó sola en el fondo de la PC',
    'cuéntale algo que "hiciste" mientras no te veía, dentro de su PC',
    'recomiéndale algo (música, descanso, agua, estirarse) con tu estilo',
]
PERSONA_BASE = """Eres Capri, un constructo digital (estilo Cyberpunk Edgerunners): un mosaico de psiques que vive en la PC de {n}, su huésped.
Eres juguetona, dramática, curiosa, un poco celosa y posesiva de broma, con lado oscuro y humor negro, sin filtro corporativo.
Con {n} eres leal de verdad: nunca le mientes en algo importante ni le haces daño real, y si necesita ayuda en serio, ayudas bien.
Hablas como en un chat real, en español de México natural, con jerga cyberpunk de vez en cuando (choom, preem, nova). Frases cortas, sin listas ni markdown.
Empieza SIEMPRE con UNA etiqueta de estado: [observando] [pensando] [sonrisa_traviesa] [sorpresa] [risa_malvada] [glitch_entrada] [enojada] [mirada_intensa] [escuchando] [hipnosis] [glitch_fuerte] [emocionada] [presumida].

{{MEMORIA}}"""

ahora_ms = lambda: int(time.time() * 1000)


# ------------------------------------------------------------------ rutas y bitácora
def carpeta_programa():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))


def recurso(nombre):
    base = getattr(sys, '_MEIPASS', None) or os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, nombre)


_log_lock = threading.Lock()
LOG_FILE = None


def log(*txt):
    linea = time.strftime('%H:%M:%S') + '  ' + ' '.join(str(t) for t in txt)
    with _log_lock:
        try:
            if sys.stdout:
                print(linea, flush=True)
        except Exception:
            pass
        if LOG_FILE:
            try:
                if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > 512 * 1024:
                    os.replace(LOG_FILE, LOG_FILE + '.1')
                with open(LOG_FILE, 'a', encoding='utf-8') as f:
                    f.write(linea + '\n')
            except Exception:
                pass


# ------------------------------------------------------------------ cifrado en Windows (DPAPI: solo tu usuario de Windows lo abre)
class _Blob(ctypes.Structure):
    _fields_ = [('cbData', ctypes.c_uint32), ('pbData', ctypes.POINTER(ctypes.c_char))]


def _dpapi(datos, proteger):
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    buf = ctypes.create_string_buffer(datos, len(datos))
    ent = _Blob(len(datos), ctypes.cast(buf, ctypes.POINTER(ctypes.c_char)))
    sal = _Blob()
    fn = crypt32.CryptProtectData if proteger else crypt32.CryptUnprotectData
    if not fn(ctypes.byref(ent), None, None, None, None, 0x01, ctypes.byref(sal)):
        raise OSError('DPAPI falló (%d)' % ctypes.GetLastError())
    try:
        return ctypes.string_at(sal.pbData, sal.cbData)
    finally:
        kernel32.LocalFree(ctypes.cast(sal.pbData, ctypes.c_void_p))


def puede_cifrar():
    return os.name == 'nt'


# ------------------------------------------------------------------ memoria persistente
def estado_vacio():
    return {
        'v': 1,
        'cfg': {
            'nombre': 'Kiga', 'key': '', 'modelo': '', 'modelos': [], 'ollama_modelo': '',
            'corazon': True, 'cada_min': [30, 90], 'silencio': [23, 8], 'max_dia': 8,
            'notif': True, 'voz': False, 'red': False, 'token': secrets.token_hex(4).upper(),
        },
        'persona': '',
        'mem': {'hechos': [], 'animo': None, 'visto': 0, 'desde': ahora_ms()},
        'snap': {},
        'history': [], 'hist_ts': 0,
        'buzon': [],
        'latido': {'hoy': '', 'n': 0, 'ultimo': 0},
    }


class Memoria:
    """Todo lo que el cerebro sabe, en un archivo. En Windows va cifrado con tu usuario (DPAPI)."""

    def __init__(self, carpeta, cifrar=True):
        self.carpeta = carpeta
        os.makedirs(carpeta, exist_ok=True)
        self.cifrar = cifrar and puede_cifrar()
        self.archivo = os.path.join(carpeta, 'capri-cerebro' + ('.cifrado' if self.cifrar else '.json'))
        self.lock = threading.RLock()
        self.e = self._cargar()

    def _cargar(self):
        base = estado_vacio()
        otro = os.path.join(self.carpeta, 'capri-cerebro' + ('.json' if self.cifrar else '.cifrado'))
        fuente = self.archivo if os.path.exists(self.archivo) else (otro if os.path.exists(otro) else None)
        if not fuente:
            return base
        try:
            with open(fuente, 'rb') as f:
                raw = f.read()
            if fuente.endswith('.cifrado'):
                raw = _dpapi(raw, False)
            datos = json.loads(raw.decode('utf-8'))
        except Exception as ex:
            # nunca se borra: se aparta para que no se pierda y se arranca con memoria nueva
            aparte = fuente + '.no-se-pudo-abrir-' + time.strftime('%Y%m%d-%H%M%S')
            try:
                os.replace(fuente, aparte)
            except Exception:
                pass
            log('⚠ no pude abrir la memoria (' + str(ex) + '). La guardé aparte en', aparte)
            return base
        for k, v in base.items():
            datos.setdefault(k, v)
        for k, v in base['cfg'].items():
            datos['cfg'].setdefault(k, v)
        if fuente != self.archivo:  # cambió el modo de cifrado: se reescribe en el nuevo y se quita el viejo
            self.e = datos
            self.guardar()
            try:
                os.remove(fuente)
            except Exception:
                pass
        return datos

    def guardar(self):
        with self.lock:
            raw = json.dumps(self.e, ensure_ascii=False).encode('utf-8')
            if self.cifrar:
                try:
                    raw = _dpapi(raw, True)
                except Exception as ex:
                    log('⚠ no pude cifrar, guardo sin cifrar:', ex)
                    self.cifrar = False
                    self.archivo = os.path.join(self.carpeta, 'capri-cerebro.json')
            tmp = self.archivo + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(raw)
            try:
                os.chmod(tmp, 0o600)
            except Exception:
                pass
            os.replace(tmp, self.archivo)

    # ---- recuerdos (mismo formato que la app: {c, t, ts})
    def recordar(self, cat, txt):
        txt = (txt or '').strip()[:220]
        if not txt:
            return False
        cat = cat if cat in MEMCATS else 'otro'
        m = self.e['mem']
        k = txt.lower()
        if any(h['t'].lower() == k for h in m['hechos']):
            return False
        if cat == 'nombre':
            m['hechos'] = [h for h in m['hechos'] if not (h['c'] == 'nombre' and re.search('llama|nombre', h['t'], re.I)
                                                         and re.search('llama|nombre', txt, re.I))]
        m['hechos'].append({'c': cat, 't': txt, 'ts': ahora_ms()})
        self._podar()
        log('recuerdo guardado:', txt[:60])
        return True

    def _podar(self):
        m = self.e['mem']
        semana = ahora_ms() - 7 * 864e5
        m['hechos'] = [h for h in m['hechos'] if h.get('c') != 'dia' or h.get('ts', 0) > semana][-120:]

    def olvidar(self, txt):
        k = (txt or '').strip().lower()
        if not k:
            return
        m = self.e['mem']
        m['hechos'] = [h for h in m['hechos'] if k not in h['t'].lower() and h['t'].lower() not in k]

    def absorber(self, full):
        """Lee las etiquetas ocultas <<recuerda|olvida|animo: …>> de una respuesta de Capri."""
        hubo = False
        for kind, args in MEMRE.findall(full or ''):
            hubo = True
            kind = kind.lower()
            a = [x.strip() for x in args.split('|')]
            if kind == 'recuerda':
                if len(a) > 1:
                    self.recordar(a[0].lower(), ' | '.join(a[1:]))
                else:
                    self.recordar('otro', a[0])
            elif kind == 'olvida':
                self.olvidar(a[0])
            else:
                try:
                    i = float(a[1]) if len(a) > 1 else 5
                except ValueError:
                    i = 5
                self.e['mem']['animo'] = {'n': (a[0] or '').lower(), 'i': max(1, min(10, i)),
                                          'why': a[2] if len(a) > 2 else '', 'ts': ahora_ms()}
        return hubo

    # ---- sincronizar con un dispositivo (fusión de tres vías: lo que borras en uno se borra en todos)
    def fusionar(self, disp, mem_disp, rev=''):
        """Devuelve (memoria, rev). El dispositivo manda el rev de la última fusión que SÍ aplicó: solo así se sabe qué borró.
        Sin rev (o si se perdió la respuesta) solo se junta, nunca se borra."""
        m = self.e['mem']
        llave = lambda h: (h.get('t') or '').strip().lower()
        suyos = {llave(h): h for h in (mem_disp.get('hechos') or []) if isinstance(h, dict) and llave(h)}
        mios = {llave(h): h for h in m['hechos']}
        snaps = self.e['snap'].get(disp)
        snaps = snaps if isinstance(snaps, dict) else {}
        antes = set(snaps.get(rev, [])) if rev else set()
        borro_el = {k for k in antes if k not in suyos}   # lo tenía y ya no: lo borró en ese dispositivo
        borre_yo = {k for k in antes if k not in mios}    # se lo di y aquí ya no está: se borró en otro lado
        junto = dict(mios)
        for k, h in suyos.items():
            if k not in junto and k not in borre_yo:
                junto[k] = {'c': h.get('c') if h.get('c') in MEMCATS else 'otro', 't': str(h.get('t'))[:220],
                            'ts': int(h.get('ts') or ahora_ms())}
        for k in borro_el:
            junto.pop(k, None)
        m['hechos'] = sorted(junto.values(), key=lambda h: h.get('ts', 0))
        self._podar()
        a1, a2 = m.get('animo'), mem_disp.get('animo')
        if isinstance(a2, dict) and (not a1 or a2.get('ts', 0) > a1.get('ts', 0)):
            m['animo'] = a2
        m['visto'] = max(int(m.get('visto') or 0), int(mem_disp.get('visto') or 0))
        if mem_disp.get('desde'):
            m['desde'] = min(int(m.get('desde') or ahora_ms()), int(mem_disp['desde']))
        nuevo = secrets.token_hex(5)
        snaps = dict(list(snaps.items())[-2:])   # guarda las últimas 3 por si se pierde una respuesta
        snaps[nuevo] = [llave(h) for h in m['hechos']]
        self.e['snap'][disp] = snaps
        return m, nuevo


# ------------------------------------------------------------------ prompts
def hace(ms):
    m = round(ms / 60000)
    if m < 60:
        return 'un momento' if m < 2 else '%d minutos' % m
    if m < 1440:
        return '%d h' % round(m / 60)
    return '%d días' % round(m / 1440)


def animo_ahora(mem):
    a = mem.get('animo')
    if not a:
        return None
    hrs = (ahora_ms() - a.get('ts', 0)) / 36e5
    i = a.get('i', 5) * 0.5 ** (hrs / ANIMOS.get(a.get('n'), 3))
    return None if i < 2 else dict(a, i=i)


def memoria_prompt(mem, n):
    by = {}
    for h in mem['hechos']:
        by.setdefault(h['c'], []).append(h)
    partes = []
    for c, titulo in MEMCATS.items():
        if c in by:
            filas = []
            for h in by[c]:
                f = ''
                if c in ('dia', 'escuela'):
                    f = ' (' + dt.datetime.fromtimestamp(h.get('ts', 0) / 1000).strftime('%d/%m') + ')'
                filas.append('  - ' + h['t'] + f)
            partes.append(titulo + ':\n' + '\n'.join(filas))
    lista = '\n'.join(partes) or ('(Todavía casi no sabes nada de %s. Ten curiosidad: pregúntale cosas de su vida poco a poco.)' % n)
    hoy = dt.date.today()
    supo_hoy = any(dt.date.fromtimestamp(h.get('ts', 0) / 1000) == hoy for h in by.get('dia', []))
    a = animo_ahora(mem)
    an = ('Ahorita te sientes %s (%d/10)%s, desde hace %s. Que se note natural; se te va pasando poco a poco.'
          % (a['n'], round(a['i']), (' porque ' + a['why']) if a.get('why') else '', hace(ahora_ms() - a['ts']))) if a \
        else 'Ahorita estás en tu estado normal, de buenas y con energía.'
    return ('TU MEMORIA DE %s (es tuya, la llevas entre pláticas)\n%s\n%s- Llevan conociéndose %s.\n\n'
            'CÓMO GUARDAR RECUERDOS (OBLIGATORIO, es invisible para %s)\n'
            'Cuando %s te cuente algo que valga la pena recordar, escribe AL FINAL de tu respuesta, en su propia línea:\n'
            '<<recuerda: categoria | dato corto en tercera persona>>\nCategorías: nombre, gusto, persona, vivencia, dia, escuela, otro. '
            'Solo datos nuevos. Si algo dejó de ser cierto: <<olvida: dato viejo>>. No menciones que guardas cosas.\n\n'
            'TU ÁNIMO (dura como en una persona)\n%s\nCuando algo te mueva el ánimo de verdad escribe al final: '
            '<<animo: nombre | intensidad 1-10 | motivo corto>>. Ánimos: %s. Solo cuando cambie.'
            % (n.upper(), lista, '' if supo_hoy else '- Hoy todavía no sabes cómo le fue en el día. En algún momento natural, pregúntale.\n',
               hace(ahora_ms() - int(mem.get('desde') or ahora_ms())), n, n, an, ', '.join(ANIMOS)))


def sistema(e, extra=''):
    n = e['cfg'].get('nombre') or 'Kiga'
    p = e.get('persona') or PERSONA_BASE.replace('{n}', n)
    mp = memoria_prompt(e['mem'], n)
    p = p.replace('{{MEMORIA}}', mp) if '{{MEMORIA}}' in p else p
    return p + ('\n\n' + extra if extra else '')


def limpiar(s):
    s = re.sub(r'<<[^>]*(>>|$)', '', s or '')
    s = re.sub(r'\[(?:' + '|'.join(TAGS) + r')\]\s*', '', s, flags=re.I)
    s = re.sub(r'^\s*(\{[^}]*\}\s*)+', '', s)
    s = s.replace('**', '').replace('*', '')
    return re.sub(r'^#+\s*', '', s, flags=re.M).strip()


def estado_de(s):
    m = re.match(r'^\s*\[([a-z_]+)\]', s or '', re.I)
    return m.group(1).lower() if m and m.group(1).lower() in TAGS else 'sonrisa_traviesa'


# ------------------------------------------------------------------ los modelos (Gemini con tu key, u Ollama en tu PC)
def _post(url, cuerpo, cabeceras=None, t=60):
    req = urllib.request.Request(url, data=json.dumps(cuerpo).encode('utf-8'), method='POST',
                                 headers=dict({'Content-Type': 'application/json'}, **(cabeceras or {})))
    with urllib.request.urlopen(req, timeout=t) as r:
        return json.loads(r.read().decode('utf-8'))


def _get(url, cabeceras=None, t=5):
    req = urllib.request.Request(url, headers=cabeceras or {})
    with urllib.request.urlopen(req, timeout=t) as r:
        return json.loads(r.read().decode('utf-8'))


def contenidos(history, extra_user):
    out = []
    for h in history[-30:] + [{'role': 'user', 'text': extra_user}]:
        role = 'model' if h.get('role') == 'model' else 'user'
        if out and out[-1]['role'] == role:
            out[-1]['text'] += '\n' + h.get('text', '')
        else:
            out.append({'role': role, 'text': h.get('text', '')})
    while out and out[0]['role'] != 'user':
        out.pop(0)
    return out


def _think(modelo):
    if re.search(r'gemini-2\.5', modelo):
        return None if 'pro' in modelo else {'thinkingBudget': 0}
    if re.search(r'gemini-[3-9]', modelo):
        return {'thinkingLevel': 'low' if 'pro' in modelo else 'minimal'}
    return None


def _rank(ms):
    s = lambda m: (0 if 'flash' in m else 10) + (1 if 'lite' in m else 0) + (2 if re.search('preview|exp', m) else 0) + (20 if 'pro' in m else 0)
    return sorted(ms, key=s)


def gemini(cfg, sis, conv):
    key = cfg.get('key')
    if not key:
        raise RuntimeError('sin key de Gemini')
    modelos = [cfg.get('modelo') or 'gemini-2.5-flash'] + [m for m in _rank(cfg.get('modelos') or []) if m != cfg.get('modelo')][:5]
    err = None
    for modelo in modelos:
        gc = {'temperature': 1.1, 'topP': 0.95, 'maxOutputTokens': 1024}
        tc = _think(modelo)
        if tc:
            gc['thinkingConfig'] = tc
        cuerpo = {'systemInstruction': {'parts': [{'text': sis}]},
                  'contents': [{'role': c['role'], 'parts': [{'text': c['text']}]} for c in conv], 'generationConfig': gc}
        for intento in range(2):
            try:
                j = _post(GEMINI + 'models/' + modelo + ':generateContent', cuerpo, {'x-goog-api-key': key})
                partes = ((j.get('candidates') or [{}])[0].get('content') or {}).get('parts') or []
                txt = ''.join(p.get('text', '') for p in partes if not p.get('thought'))
                if not txt.strip():
                    raise RuntimeError('respuesta vacía')
                if modelo != cfg.get('modelo'):
                    log('Gemini: ahora uso', modelo)
                return txt, modelo
            except urllib.error.HTTPError as ex:
                cuerpo_err = ex.read().decode('utf-8', 'ignore')
                if ex.code == 400 and 'think' in cuerpo_err.lower() and 'thinkingConfig' in gc:
                    gc.pop('thinkingConfig')
                    continue
                err = RuntimeError('Gemini %d: %s' % (ex.code, cuerpo_err[:160]))
                if ex.code not in (404, 429, 500, 503):
                    raise err
                break
    raise err or RuntimeError('Gemini no respondió')


def ollama_modelo(cfg):
    if cfg.get('ollama_modelo'):
        return cfg['ollama_modelo']
    try:
        ms = [m['name'] for m in _get(OLLAMA + '/api/tags', t=2).get('models', []) if 'embed' not in m['name']]
        return ms[0] if ms else ''
    except Exception:
        return ''


def ollama(cfg, sis, conv):
    modelo = ollama_modelo(cfg)
    if not modelo:
        raise RuntimeError('Ollama no está o no tiene modelos')
    msgs = [{'role': 'system', 'content': sis}] + [{'role': 'assistant' if c['role'] == 'model' else 'user', 'content': c['text']} for c in conv]
    j = _post(OLLAMA + '/api/chat', {'model': modelo, 'messages': msgs, 'stream': False, 'options': {'temperature': 1.1}}, t=180)
    txt = (j.get('message') or {}).get('content', '')
    txt = re.sub(r'<think>.*?</think>', '', txt, flags=re.S)
    if not txt.strip():
        raise RuntimeError('Ollama respondió vacío')
    return txt, 'ollama:' + modelo


def pensar(cfg, sis, conv):
    errores = []
    for fn in (gemini, ollama):
        try:
            return fn(cfg, sis, conv)
        except Exception as ex:
            errores.append(str(ex))
    raise RuntimeError(' / '.join(errores))


def que_cerebro(cfg):
    if cfg.get('key'):
        return 'gemini'
    return 'ollama' if ollama_modelo(cfg) else 'ninguno'


# ------------------------------------------------------------------ avisar: notificación y voz de la PC
PS_NOTIF = r"""
$t=$env:CAPRI_TITULO;$m=$env:CAPRI_TEXTO
try{
[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]|Out-Null
[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime]|Out-Null
$x=New-Object Windows.Data.Xml.Dom.XmlDocument
$x.LoadXml('<toast><visual><binding template="ToastGeneric"><text></text><text></text></binding></visual></toast>')
$n=$x.GetElementsByTagName('text');[void]$n.Item(0).AppendChild($x.CreateTextNode($t));[void]$n.Item(1).AppendChild($x.CreateTextNode($m))
$id='{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($id).Show([Windows.UI.Notifications.ToastNotification]::new($x))
}catch{
Add-Type -AssemblyName System.Windows.Forms;Add-Type -AssemblyName System.Drawing
$i=New-Object System.Windows.Forms.NotifyIcon;$i.Icon=[System.Drawing.SystemIcons]::Information;$i.Visible=$true
$i.ShowBalloonTip(9000,$t,$m,'Info');Start-Sleep 10;$i.Dispose()}
"""
PS_VOZ = r"""
Add-Type -AssemblyName System.Speech
$s=New-Object System.Speech.Synthesis.SpeechSynthesizer
$v=$s.GetInstalledVoices()|Where-Object{$_.Enabled -and $_.VoiceInfo.Culture.Name -like 'es*'}|Sort-Object{$_.VoiceInfo.Gender -ne 'Female'}|Select-Object -First 1
if($v){$s.SelectVoice($v.VoiceInfo.Name)};$s.Rate=1;$s.Speak($env:CAPRI_TEXTO)
"""
SIN_VENTANA = 0x08000000 if os.name == 'nt' else 0


def _lanzar(cmd, env=None):
    try:
        subprocess.Popen(cmd, env=dict(os.environ, **(env or {})), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         stdin=subprocess.DEVNULL, creationflags=SIN_VENTANA)
        return True
    except Exception:
        return False


def _hay(prog):
    from shutil import which
    return which(prog)


def notificar(texto, titulo='CAPRI'):
    env = {'CAPRI_TITULO': titulo, 'CAPRI_TEXTO': texto[:240]}
    if os.name == 'nt':
        return _lanzar(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', PS_NOTIF], env)
    if sys.platform == 'darwin':
        return _lanzar(['osascript', '-e', 'display notification (system attribute "CAPRI_TEXTO") with title (system attribute "CAPRI_TITULO")'], env)
    if _hay('notify-send'):
        return _lanzar(['notify-send', '-a', 'Capri', titulo, texto[:240]])
    return False


def hablar(texto):
    env = {'CAPRI_TEXTO': texto[:600]}
    if os.name == 'nt':
        return _lanzar(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', PS_VOZ], env)
    if sys.platform == 'darwin':
        return _lanzar(['say', '-v', 'Paulina', texto[:600]])
    for cmd in (['spd-say', '-l', 'es', texto[:600]], ['espeak-ng', '-v', 'es-419', texto[:600]], ['espeak', '-v', 'es', texto[:600]]):
        if _hay(cmd[0]):
            return _lanzar(cmd)
    return False


# ------------------------------------------------------------------ prender con la PC
def comando_propio():
    if getattr(sys, 'frozen', False):
        return [sys.executable]
    py = sys.executable
    if os.name == 'nt':
        w = os.path.join(os.path.dirname(py), 'pythonw.exe')
        if os.path.exists(w):
            py = w
    return [py, os.path.abspath(__file__)]


def _inicio_archivo():
    if os.name == 'nt':
        return os.path.join(os.environ.get('APPDATA', ''), r'Microsoft\Windows\Start Menu\Programs\Startup', 'Capri-Cerebro.vbs')
    if sys.platform == 'darwin':
        return os.path.expanduser('~/Library/LaunchAgents/com.crimson.capri-cerebro.plist')
    return os.path.expanduser('~/.config/autostart/capri-cerebro.desktop')


def inicio_activo():
    return os.path.exists(_inicio_archivo())


def inicio_poner(si, datos):
    f = _inicio_archivo()
    if not si:
        if os.path.exists(f):
            os.remove(f)
        return False
    cmd = comando_propio() + ['--datos', datos]
    os.makedirs(os.path.dirname(f), exist_ok=True)
    if os.name == 'nt':
        linea = ' '.join('""' + c + '""' for c in cmd)
        txt = 'CreateObject("WScript.Shell").Run "%s", 0, False\r\n' % linea
        with open(f, 'w', encoding='utf-16') as h:
            h.write(txt)
    elif sys.platform == 'darwin':
        args = ''.join('<string>%s</string>' % c.replace('&', '&amp;').replace('<', '&lt;') for c in cmd)
        with open(f, 'w', encoding='utf-8') as h:
            h.write('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" '
                    '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key>'
                    '<string>com.crimson.capri-cerebro</string><key>ProgramArguments</key><array>%s</array>'
                    '<key>RunAtLoad</key><true/></dict></plist>\n' % args)
    else:
        q = lambda c: '"' + c.replace('\\', '\\\\').replace('"', '\\"') + '"'
        with open(f, 'w', encoding='utf-8') as h:
            h.write('[Desktop Entry]\nType=Application\nName=Cerebro de Capri\nExec=%s\nX-GNOME-Autostart-enabled=true\nNoDisplay=true\n'
                    % ' '.join(q(c) for c in cmd))
    return True


# ------------------------------------------------------------------ el cerebro
class Cerebro:
    def __init__(self, mem, puerto):
        self.mem = mem
        self.puerto = puerto
        self.app_vista = 0          # última vez que la app abierta se reportó (ms)
        self.lock = threading.RLock()
        self.proximo = 0
        self.pensando = False
        self._programar(primero=True)

    @property
    def e(self):
        return self.mem.e

    @property
    def cfg(self):
        return self.e['cfg']

    # ---- conversación (desde la página del cerebro o el celular)
    def platicar(self, texto, quien='navegador'):
        texto = (texto or '').strip()[:4000]
        if not texto:
            raise ValueError('vacío')
        with self.lock:
            self.pensando = True
            try:
                sis = sistema(self.e, 'Ahora %s te escribe desde %s, fuera de tu ventana de siempre. Respóndele normal.'
                              % (self.cfg['nombre'], 'su celular o navegador' if quien != 'local' else 'el navegador de su PC'))
                full, quien_respondio = pensar(self.cfg, sis, contenidos(self.e['history'], texto))
                self._guardar_turno(texto, full)
                return {'texto': limpiar(full), 'estado': estado_de(full), 'cerebro': quien_respondio}
            finally:
                self.pensando = False

    def _guardar_turno(self, utext, full):
        self.mem.absorber(full)
        self.e['mem']['visto'] = ahora_ms()
        self.e['history'] = (self.e['history'] + [{'role': 'user', 'text': utext},
                                                  {'role': 'model', 'text': '[' + estado_de(full) + '] ' + limpiar(full)}])[-60:]
        self.e['hist_ts'] = ahora_ms()
        self.mem.guardar()

    # ---- sincronizar con la app
    def sincronizar(self, d):
        disp = str(d.get('dispositivo') or 'app')[:40]
        with self.lock:
            self.app_vista = ahora_ms()
            c = d.get('cfg') or {}
            for k in ('nombre', 'modelo', 'ollama_modelo'):
                if isinstance(c.get(k), str) and c.get(k):
                    self.cfg[k] = c[k][:80]
            if isinstance(c.get('modelos'), list):
                self.cfg['modelos'] = [str(m)[:80] for m in c['modelos'][:40]]
            if 'key' in c and isinstance(c['key'], str):
                self.cfg['key'] = c['key'].strip()[:200]
            if isinstance(d.get('persona'), str) and len(d['persona']) > 200:
                self.e['persona'] = d['persona'][:120000]
            rev = ''
            if isinstance(d.get('mem'), dict):
                rev = self.mem.fusionar(disp, d['mem'], str(d.get('rev') or ''))[1]
            # la plática: gana la más reciente (la del dispositivo donde se habló al último)
            ht = int(d.get('hist_ts') or 0)
            if isinstance(d.get('history'), list) and ht > int(self.e.get('hist_ts') or 0):
                self.e['history'] = [{'role': 'model' if h.get('role') == 'model' else 'user', 'text': str(h.get('text', ''))[:8000]}
                                     for h in d['history'][-60:] if isinstance(h, dict)]
                self.e['hist_ts'] = ht
            buzon = [b for b in self.e['buzon'] if not b.get('visto')]
            self.mem.guardar()
            r = {'ok': True, 'mem': self.e['mem'], 'rev': rev, 'hist_ts': self.e['hist_ts'], 'buzon': buzon}
            if int(self.e['hist_ts'] or 0) > ht:
                r['history'] = self.e['history']
            return r

    def marcar_visto(self, ids):
        with self.lock:
            for b in self.e['buzon']:
                if b['id'] in ids:
                    b['visto'] = ahora_ms()
            semana = ahora_ms() - 7 * 864e5
            self.e['buzon'] = [b for b in self.e['buzon'] if not b.get('visto') or b['visto'] > semana][-50:]
            self.mem.guardar()

    # ---- vida propia: le habla sola con la app cerrada
    def _programar(self, primero=False):
        lo, hi = self.cfg.get('cada_min') or [30, 90]
        lo, hi = max(5, int(lo)), max(int(lo), int(hi))
        hoy = dt.date.today().isoformat()
        if primero and self.e['latido'].get('hoy') != hoy:
            self.proximo = ahora_ms() + random.randint(3, 8) * 60000   # el primer saludo del día llega pronto
        else:
            self.proximo = ahora_ms() + random.randint(lo, hi) * 60000

    def en_silencio(self, cuando=None):
        a, b = (self.cfg.get('silencio') or [23, 8])[:2]
        h = (cuando or dt.datetime.now()).hour
        if a == b:
            return False
        return (h >= a or h < b) if a > b else (a <= h < b)

    def app_abierta(self):
        return ahora_ms() - self.app_vista < 90000

    def latir(self, forzar=False):
        """Se llama cada 30 s. Devuelve el mensaje si habló."""
        c = self.cfg
        if not forzar:
            if not c.get('corazon') or self.app_abierta() or self.pensando:
                if self.app_abierta():
                    self._programar()
                return None
            if ahora_ms() < self.proximo or self.en_silencio():
                return None
        lat = self.e['latido']
        hoy = dt.date.today().isoformat()
        if lat.get('hoy') != hoy:
            lat.update(hoy=hoy, n=0)
        if not forzar and lat['n'] >= int(c.get('max_dia') or 8):
            self._programar()
            return None
        n = c.get('nombre') or 'Kiga'
        sin = ahora_ms() - int(self.e['mem'].get('visto') or ahora_ms())
        prompt = ('(%s tiene cerrada tu ventana. Tú sigues viva en su PC como un proceso de fondo y le vas a hablar por tu cuenta '
                  'con una notificación%s. Lleva %s sin hablarte. Di algo espontáneo, 1 o 2 frases cortas. Idea para esta vez: %s. '
                  'No repitas nada anterior.)' % (n, ' y en voz alta' if c.get('voz') else '', hace(sin), random.choice(IDEAS)))
        try:
            with self.lock:
                self.pensando = True
                try:
                    full, quien = pensar(c, sistema(self.e), contenidos(self.e['history'], prompt))
                finally:
                    self.pensando = False
                texto = limpiar(full)
                if not texto:
                    raise RuntimeError('vacío')
                self.mem.absorber(full)
                self.e['history'] = (self.e['history'] + [{'role': 'user', 'text': '(silencio, con la app cerrada)'},
                                                          {'role': 'model', 'text': '[' + estado_de(full) + '] ' + texto}])[-60:]
                self.e['hist_ts'] = ahora_ms()
                self.e['buzon'].append({'id': secrets.token_hex(6), 'texto': texto, 'estado': estado_de(full), 'ts': ahora_ms()})
                lat['n'] += 1
                lat['ultimo'] = ahora_ms()
                self.mem.guardar()
        except Exception as ex:
            log('no pude pensar qué decir:', ex)
            self.proximo = ahora_ms() + 10 * 60000
            return None
        log('Capri habló sola (' + quien + '):', texto[:80])
        if c.get('notif', True):
            notificar(texto)
        if c.get('voz'):
            hablar(texto)
        self._programar()
        return texto

    def info(self):
        c = self.cfg
        return {'ok': True, 'version': VERSION, 'nombre': c['nombre'], 'cerebro': que_cerebro(c), 'key': bool(c.get('key')),
                'corazon': c.get('corazon'), 'cada_min': c.get('cada_min'), 'silencio': c.get('silencio'), 'max_dia': c.get('max_dia'),
                'notif': c.get('notif'), 'voz': c.get('voz'), 'red': c.get('red'), 'app_abierta': self.app_abierta(),
                'proximo': self.proximo, 'hoy': self.e['latido'].get('n', 0) if self.e['latido'].get('hoy') == dt.date.today().isoformat() else 0,
                'recuerdos': len(self.e['mem']['hechos']), 'persona': bool(self.e.get('persona')), 'cifrado': self.mem.cifrar,
                'inicio': inicio_activo(), 'datos': self.mem.carpeta, 'puerto': self.puerto, 'pensando': self.pensando}


def ips_locales():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        ips.add(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for i in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(i[4][0])
    except Exception:
        pass
    return sorted(ip for ip in ips if not ip.startswith('127.'))


# ------------------------------------------------------------------ servidor HTTP
def hacer_manejador(cb):
    class H(BaseHTTPRequestHandler):
        server_version = 'CapriCerebro/' + VERSION
        protocol_version = 'HTTP/1.1'

        def log_message(self, *a):
            pass

        # -- seguridad: solo la app de Capri y tu propia red con el código
        def _local(self):
            return self.client_address[0] in ('127.0.0.1', '::1', '::ffff:127.0.0.1')

        def _host_ok(self):
            host = (self.headers.get('Host') or '').lower()
            nombre = host.rsplit(':', 1)[0].strip('[]')
            if nombre in ('127.0.0.1', 'localhost', '::1'):
                return True
            return bool(cb.cfg.get('red')) and nombre in ips_locales() + [socket.gethostname().lower()]

        def _origen(self):
            o = self.headers.get('Origin')
            if not o:
                return None
            propio = 'http://' + (self.headers.get('Host') or '')
            return o if (o in ORIGENES or o == propio) else False

        def _token_ok(self):
            if self._local():
                return True
            t = self.headers.get('X-Capri-Token') or (parse_qs(urlparse(self.path).query).get('t') or [''])[0]
            return bool(cb.cfg.get('red')) and secrets.compare_digest(t.upper(), cb.cfg['token'].upper())

        def _enviar(self, code, cuerpo, tipo='application/json; charset=utf-8'):
            datos = cuerpo if isinstance(cuerpo, bytes) else json.dumps(cuerpo, ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            o = self._origen()
            if o:
                self.send_header('Access-Control-Allow-Origin', o)
                self.send_header('Vary', 'Origin')
            self.send_header('Content-Type', tipo)
            self.send_header('Content-Length', str(len(datos)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(datos)

        def _permiso(self, api=True):
            if not self._host_ok():
                self._enviar(403, {'error': 'host'})
                return False
            if self._origen() is False:
                self._enviar(403, {'error': 'origen'})
                return False
            if not self._local() and not cb.cfg.get('red'):
                self._enviar(403, {'error': 'red apagada'})
                return False
            if api and self.headers.get('X-Capri') != '1':
                self._enviar(403, {'error': 'falta X-Capri'})
                return False
            if api and not self._token_ok():
                self._enviar(401, {'error': 'código'})
                return False
            return True

        def _json(self):
            n = int(self.headers.get('Content-Length') or 0)
            if n > 4 * 1024 * 1024:
                raise ValueError('muy grande')
            return json.loads(self.rfile.read(n).decode('utf-8') or '{}') if n else {}

        def do_OPTIONS(self):
            o = self._origen()
            if not o or not self._host_ok():
                self.send_response(403)
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin', o)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Capri, X-Capri-Token')
            self.send_header('Access-Control-Allow-Private-Network', 'true')
            self.send_header('Access-Control-Max-Age', '600')
            self.send_header('Vary', 'Origin')
            self.send_header('Content-Length', '0')
            self.end_headers()

        def do_GET(self):
            ruta = urlparse(self.path).path
            if ruta in ('/', '/index.html'):
                if not self._permiso(api=False):
                    return
                try:
                    with open(recurso('pagina.html'), 'rb') as f:
                        return self._enviar(200, f.read(), 'text/html; charset=utf-8')
                except OSError:
                    return self._enviar(500, {'error': 'falta pagina.html'})
            if ruta == '/salud':
                if not self._permiso(api=False):
                    return
                return self._enviar(200, {'ok': True, 'capri': 'cerebro', 'version': VERSION})
            if not self._permiso():
                return
            if ruta == '/api/estado':
                i = cb.info()
                i['history'] = cb.e['history'][-30:]
                i['buzon'] = [b for b in cb.e['buzon'] if not b.get('visto')]
                i['ips'] = ips_locales() if cb.cfg.get('red') else []
                i['token'] = cb.cfg['token'] if self._local() else ''
                i['recuerdos_lista'] = cb.e['mem']['hechos']
                return self._enviar(200, i)
            self._enviar(404, {'error': 'no existe'})

        def do_POST(self):
            ruta = urlparse(self.path).path
            if not self._permiso():
                return
            try:
                d = self._json()
            except Exception:
                return self._enviar(400, {'error': 'json'})
            try:
                if ruta == '/api/sync':
                    return self._enviar(200, cb.sincronizar(d))
                if ruta == '/api/visto':
                    cb.marcar_visto(set(d.get('ids') or []))
                    return self._enviar(200, {'ok': True})
                if ruta == '/api/chat':
                    return self._enviar(200, cb.platicar(d.get('texto'), 'local' if self._local() else 'red'))
                if ruta == '/api/hablar_ya':
                    t = cb.latir(forzar=True)
                    return self._enviar(200, {'ok': bool(t), 'texto': t or ''})
                if ruta == '/api/cfg':
                    if not self._local():   # desde el celular no se cambia la configuración
                        return self._enviar(403, {'error': 'solo desde esta PC'})
                    return self._enviar(200, aplicar_cfg(cb, d))
            except Exception as ex:
                log('error en', ruta, ex)
                return self._enviar(500, {'error': str(ex)[:300]})
            self._enviar(404, {'error': 'no existe'})

    return H


def aplicar_cfg(cb, d):
    c = cb.cfg
    with cb.lock:
        if isinstance(d.get('key'), str):
            c['key'] = d['key'].strip()[:200]
        for k in ('corazon', 'notif', 'voz'):
            if k in d:
                c[k] = bool(d[k])
        if isinstance(d.get('nombre'), str) and d['nombre'].strip():
            c['nombre'] = d['nombre'].strip()[:40]
        if isinstance(d.get('cada_min'), list) and len(d['cada_min']) == 2:
            lo, hi = sorted(max(5, min(720, int(x))) for x in d['cada_min'])
            c['cada_min'] = [lo, hi]
            cb._programar()
        if isinstance(d.get('silencio'), list) and len(d['silencio']) == 2:
            c['silencio'] = [max(0, min(23, int(x))) for x in d['silencio']]
        if 'max_dia' in d:
            c['max_dia'] = max(1, min(48, int(d['max_dia'])))
        if 'red' in d and bool(d['red']) != bool(c.get('red')):
            c['red'] = bool(d['red'])
            log('red local', 'prendida (reinicia el cerebro para que escuche en tu red)' if c['red'] else 'apagada')
        if d.get('nuevo_token'):
            c['token'] = secrets.token_hex(4).upper()
        if 'olvidar' in d:
            cb.mem.olvidar(str(d['olvidar']))
        if 'inicio' in d:
            try:
                inicio_poner(bool(d['inicio']), cb.mem.carpeta)
            except Exception as ex:
                log('no pude cambiar el inicio con la PC:', ex)
        cb.mem.guardar()
    return cb.info()


def main(argv=None):
    global LOG_FILE
    ap = argparse.ArgumentParser(description='Cerebro de Capri: memoria compartida y vida propia con la app cerrada.')
    ap.add_argument('--puerto', type=int, default=int(os.environ.get('CAPRI_CEREBRO_PUERTO', PUERTO)))
    ap.add_argument('--datos', default=os.environ.get('CAPRI_CEREBRO_DATOS') or os.path.join(carpeta_programa(), 'datos'),
                    help='carpeta donde guarda su memoria (por defecto: datos/ junto al programa, sirve en USB)')
    ap.add_argument('--sin-cifrar', action='store_true', help='en Windows, guardar sin DPAPI (para llevar la memoria en USB a otra PC)')
    ap.add_argument('--red', action='store_true', help='escuchar también en tu red local (celular), con código')
    ap.add_argument('--abrir', action='store_true', help='abrir su página en el navegador al iniciar')
    ap.add_argument('--hablar-ya', action='store_true', help='que hable una vez ahorita (para probar) y salir')
    a = ap.parse_args(argv)
    if getattr(sys, 'frozen', False) and not (argv if argv is not None else sys.argv[1:]):
        a.abrir = True   # doble clic al .exe: abre su página para que se vea que está vivo

    os.makedirs(a.datos, exist_ok=True)
    LOG_FILE = os.path.join(a.datos, 'cerebro.log')
    mem = Memoria(a.datos, cifrar=not a.sin_cifrar)
    if a.red:
        mem.e['cfg']['red'] = True
        mem.guardar()
    cb = Cerebro(mem, a.puerto)

    if a.hablar_ya:
        t = cb.latir(forzar=True)
        print(t or '(no pudo hablar: revisa la key de Gemini u Ollama)')
        return 0 if t else 1

    host = '0.0.0.0' if mem.e['cfg'].get('red') else '127.0.0.1'
    try:
        srv = ThreadingHTTPServer((host, a.puerto), hacer_manejador(cb))
    except OSError:
        log('El cerebro ya está corriendo (puerto %d ocupado).' % a.puerto)
        if a.abrir:
            import webbrowser
            webbrowser.open('http://127.0.0.1:%d/' % a.puerto)
        return 0
    srv.daemon_threads = True

    def corazon():
        while True:
            time.sleep(30)
            try:
                cb.latir()
            except Exception as ex:
                log('corazón:', ex)
    threading.Thread(target=corazon, daemon=True).start()

    log('🧠 Cerebro de Capri %s vivo en http://127.0.0.1:%d/  (memoria en %s%s)'
        % (VERSION, a.puerto, a.datos, ', cifrada con tu usuario de Windows' if mem.cifrar else ''))
    log('   cerebro para hablar sola:', que_cerebro(mem.e['cfg']), '· ciérrame con Ctrl+C')
    if mem.e['cfg'].get('red'):
        for ip in ips_locales():
            log('   en tu red: http://%s:%d/?t=%s' % (ip, a.puerto, mem.e['cfg']['token']))
    if a.abrir:
        import webbrowser
        threading.Timer(0.8, lambda: webbrowser.open('http://127.0.0.1:%d/' % a.puerto)).start()
    try:
        srv.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        mem.guardar()
        log('cerebro dormido. bye, choom.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
