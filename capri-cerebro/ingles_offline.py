#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inglés sin IA para el cerebro de Capri.

Funciona aunque Gemini, Ollama y Claude estén apagados o no haya internet. No es un modelo de lenguaje:
son reglas, un diccionario local (ingles_dicc.py + lo que Kiga le enseñe) y un poco de gramática.

Qué hace:
  detectar(texto)   -> ¿está en inglés puro, en español o mezclado? (y qué palabras son de español)
  traducir(texto)   -> inglés a español, palabra por palabra con reglas (tiempos, ser/estar, gustar, artículos…)
  al_ingles(texto)  -> español a inglés, solo palabras y frases del diccionario
  corregir(texto)   -> errores típicos de quien habla español (he don't, I have 20 years, informations…)
  responder(texto)  -> lo junta todo y contesta como Capri: saludos, hora, cuentas, «what does X mean»,
                       «how do you say X», «spell X», «translate X», «learn: word = palabra»…

Solo biblioteca estándar. Pruébalo solo:  python ingles_offline.py "I don't understand this word"
"""
import ast
import datetime as dt
import json
import operator
import os
import re
import threading
import unicodedata

try:
    import ingles_dicc as D
except ImportError:  # cuando se importa como paquete
    from . import ingles_dicc as D  # type: ignore

VERSION = '1.0.0'

# ------------------------------------------------------------------ utilidades
def sin_acentos(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


PALABRA = re.compile(r"[A-Za-zÀ-ÿñÑ]+(?:'[A-Za-z]+)?|\d+(?:[.,]\d+)?|[^\sA-Za-zÀ-ÿñÑ\d]")

CONTRACCIONES = {
    "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is',
    "what's": 'what is', "where's": 'where is', "who's": 'who is', "how's": 'how is', "there's": 'there is',
    "here's": 'here is', "let's": 'let us', "we're": 'we are', "they're": 'they are', "i've": 'i have',
    "you've": 'you have', "we've": 'we have', "they've": 'they have', "i'll": 'i will', "you'll": 'you will',
    "he'll": 'he will', "she'll": 'she will', "it'll": 'it will', "we'll": 'we will', "they'll": 'they will',
    "i'd": 'i would', "you'd": 'you would', "he'd": 'he would', "she'd": 'she would', "we'd": 'we would',
    "they'd": 'they would', "can't": 'can not', "cannot": 'can not', "won't": 'will not', "ain't": 'is not',
    "gonna": 'going to', "wanna": 'want to', "gotta": 'have to', "u": 'you', "ur": 'your', "pls": 'please',
    "plz": 'please', "thx": 'thanks', "im": 'i am', "dont": 'do not', "doesnt": 'does not', "didnt": 'did not',
    "cant": 'can not', "wont": 'will not', "isnt": 'is not', "y'all": 'you all',
}


def expandir(t):
    t = t.lower().replace('’', "'")
    if t in CONTRACCIONES:
        return CONTRACCIONES[t].split()
    if t.endswith("n't"):
        return [t[:-3], 'not']
    return [t]


# ------------------------------------------------------------------ detección de idioma
# Palabras que delatan cada idioma. Se quitaron las que existen en los dos (a, no, me, son, come, red, pan, fin…).
STOP_EN = set("""the of and to in is you that it he was for on are as with his they i at be this have from or one had by
but not what all were we when your can said there use an each which she do how their if will up other about out many
then them these so some her would make like him into time has look two more write go see number way could people my
than first been call who its now find long down day did get made may part am does don't yes hello hi thanks please
very really just because want need know think should must why where while hey bye sorry what's i'm it's you're
doing going something nothing everything today tonight tomorrow yesterday always never maybe here our us
""".split())
STOP_ES = set("""el la los las un una unos unas de del que y en por para con es está están estoy estás eres soy somos
pero muy más qué cómo cuándo dónde porque también yo tú ella ellos ellas nosotros usted ustedes mi mis tu tus su sus
nuestro esto esta este eso esa ese aquí allí ahora hoy mañana ayer bien hola gracias sí tengo tienes tiene quiero
quieres puedo puedes hacer hago hace dime dame ver voy vas va vamos ir fue era hay sobre entre hasta desde cuando
donde como pues bueno vale oye ya todavía nunca siempre algo nada todo mucho poco otro otra mismo así entonces
año años día días casa amigo amiga sabes sé creo inglés español palabra significa dice decir traduce traducir
te gusta gustan amo encanta oye mira ven vente quieres necesito ayuda ayúdame cuánto cuántos estas esto chido neta
""".split())
AMBIGUAS = {'no', 'ok', 'okay', 'a', 'me', 'he', 'son', 'come', 'red', 'pan', 'fin', 'sin', 'dice', 'real', 'final', 'normal',
            'total', 'hospital', 'animal', 'idea', 'hotel', 'radio', 'piano', 'chocolate', 'taxi', 'doctor', 'error', 'color',
            'actor', 'plan', 'local', 'general', 'popular', 'social', 'natural', 'personal', 'principal', 'mar', 'once', 'tan'}
FINALES_ES = re.compile(r'(ción|ciones|mente|amos|emos|imos|aron|ieron|ando|iendo|ado|ada|idos|idas|ito|ita|ísimo)$')


def detectar(texto):
    """Dice si el texto está en inglés puro. Regresa un dict con idioma ('en', 'es', 'mixto', '?'),
    puro (bool), confianza (0-1) y la lista de palabras que suenan a español."""
    t = texto or ''
    palabras = [w.lower().replace('’', "'") for w in re.findall(r"[A-Za-zÀ-ÿñÑ']+", t)]
    if not palabras:
        return {'idioma': '?', 'puro': False, 'confianza': 0.0, 'es': [], 'en': 0, 'palabras': 0}
    en, es, marcas_es = 0, 0, []
    dic = _dic()
    inv = dic.inverso()
    for w in palabras:
        w2 = w.strip("'")
        if w2 in AMBIGUAS:
            continue
        es_de_en = w2 in STOP_EN or "'" in w2 or dic.conoce(w2)
        es_de_es = bool(re.search(r'[ñáéíóúü¿¡]', w2)) or w2 in STOP_ES or (len(w2) > 5 and FINALES_ES.search(w2)
                                                                       and not es_de_en) or (sin_acentos(w2) in inv and not es_de_en)
        if es_de_es and not es_de_en:
            es += 1
            marcas_es.append(w2)
        elif es_de_en and not es_de_es:
            en += 1
        elif es_de_en and es_de_es:  # ambas: cuenta poquito para cada una
            en += 0.5
            es += 0.5
    if re.search(r'[¿¡]', t):
        es += 1
    total = len(palabras)
    conf = en / max(1.0, en + es)
    if en == 0 and es == 0:
        idioma = '?'
    elif es < 0.6 and en >= max(1, total * 0.4):
        idioma = 'en'
    elif (en < 0.6 and es >= 1) or (es >= 2 * en and es >= 2):
        idioma = 'es'
    elif conf >= 0.85 and not marcas_es:
        idioma = 'en'
    elif conf <= 0.15:
        idioma = 'es'
    else:
        idioma = 'mixto'
    return {'idioma': idioma, 'puro': idioma == 'en' and not marcas_es, 'confianza': round(conf, 2),
            'es': marcas_es, 'en': en, 'palabras': total}


# ------------------------------------------------------------------ diccionario (base + lo que Kiga le enseña)
class Diccionario:
    def __init__(self, carpeta=None):
        self.lock = threading.RLock()
        self.archivo = os.path.join(carpeta, 'ingles_palabras.json') if carpeta else None
        self.sust, self.adj, self.verb, self.otros, frases, self.irr = D.cargar()
        self.frases = {}
        for en, es in frases.items():
            self.frases[' '.join(w for t in en.split() for w in expandir(t))] = es
        for k, v in {'there is': 'hay', 'there are': 'hay', 'there was': 'había', 'there were': 'había',
                     'there will be': 'habrá', 'is there': 'hay', 'are there': 'hay'}.items():
            self.frases[k] = v
        self.propias = {}
        self._cargar_propias()
        self._inverso = None

    def _cargar_propias(self):
        if not self.archivo or not os.path.exists(self.archivo):
            return
        try:
            with open(self.archivo, encoding='utf-8') as f:
                self.propias = {k.lower(): v for k, v in (json.load(f) or {}).items() if isinstance(v, str)}
        except Exception:
            self.propias = {}

    def aprender(self, en, es):
        en, es = en.strip().lower(), es.strip()
        if not en or not es or len(en) > 60 or len(es) > 80:
            raise ValueError('palabra vacía o muy larga')
        with self.lock:
            self.propias[en] = es
            self._inverso = None
            if self.archivo:
                tmp = self.archivo + '.tmp'
                with open(tmp, 'w', encoding='utf-8') as f:
                    json.dump(self.propias, f, ensure_ascii=False, indent=1, sort_keys=True)
                os.replace(tmp, self.archivo)
        return {'en': en, 'es': es, 'total_propias': len(self.propias)}

    def olvidar(self, en):
        with self.lock:
            ok = self.propias.pop(en.strip().lower(), None) is not None
            if ok and self.archivo:
                with open(self.archivo, 'w', encoding='utf-8') as f:
                    json.dump(self.propias, f, ensure_ascii=False, indent=1, sort_keys=True)
            self._inverso = None
            return ok

    def conoce(self, w):
        w = w.lower()
        return (w in self.propias or w in self.sust or w in self.adj or w in self.verb or w in self.otros
                or w in self.irr or w in PRONOMBRES or w in DETERMINANTES or w in AUX or self.sustantivo(w) is not None
                or self.verbo(w) is not None)

    # -- sustantivos: (español, género, plural)
    def sustantivo(self, w):
        w = w.lower()
        irreg = {'men': 'man', 'women': 'woman', 'children': 'child', 'feet': 'foot', 'teeth': 'tooth', 'mice': 'mouse',
                 'people': 'people', 'clothes': 'clothes', 'beans': 'beans', 'news': 'news'}
        if w in irreg:
            base = irreg[w]
            if base in self.sust:
                es, g = self.sust[base]
                return es, g, w not in ('news',) and w != base or w in ('clothes', 'beans')
        if w in self.sust:
            es, g = self.sust[w]
            return es, g, False
        for fin, rep in (('ies', 'y'), ('ves', 'f'), ('es', ''), ('s', '')):
            if w.endswith(fin) and len(w) > len(fin) + 1:
                b = w[:-len(fin)] + rep
                if b in self.sust:
                    es, g = self.sust[b]
                    return es, g, True
        return None

    # -- verbos: (base inglés, forma) forma = base | s | ed | pp | ing
    def verbo(self, w):
        w = w.lower()
        if w in ('am', 'is', 'are', 'has', 'does'):
            return self.irr[w], 's'
        if w in self.irr:
            pp = w in PARTICIPIOS_EN
            return self.irr[w], 'pp' if pp else 'ed'
        if w in self.verb:
            return w, 'base'
        cand = []
        if w.endswith('ing') and len(w) > 4:
            r = w[:-3]
            cand += [(r, 'ing'), (r + 'e', 'ing')]
            if len(r) > 2 and r[-1] == r[-2]:
                cand.append((r[:-1], 'ing'))
            if r.endswith('y'):
                cand.append((r[:-1] + 'ie', 'ing'))
        if w.endswith('ed') and len(w) > 3:
            r = w[:-2]
            cand += [(r, 'ed'), (w[:-1], 'ed')]
            if r.endswith('i'):
                cand.append((r[:-1] + 'y', 'ed'))
            if len(r) > 2 and r[-1] == r[-2]:
                cand.append((r[:-1], 'ed'))
        if w.endswith('s') and len(w) > 2:
            cand.append((w[:-1], 's'))
            if w.endswith('es'):
                cand.append((w[:-2], 's'))
            if w.endswith('ies'):
                cand.append((w[:-3] + 'y', 's'))
        for b, f in cand:
            if b in self.verb:
                return b, f
        return None

    def traduce_palabra(self, w):
        """Para «what does X mean»: todas las lecturas posibles de una palabra."""
        w = w.lower().strip(" '\"?.!")
        out = []
        if w in self.propias:
            out.append(('la que me enseñaste', self.propias[w]))
        if w in self.frases:
            out.append(('frase', self.frases[w]))
        s = self.sustantivo(w)
        if s:
            art = {'m': 'el', 'f': 'la'}[s[1]] if not s[2] else {'m': 'los', 'f': 'las'}[s[1]]
            out.append(('sustantivo', '%s %s' % (art, pluralizar(s[0]) if s[2] else s[0])))
        if w in self.adj:
            out.append(('adjetivo', self.adj[w]))
        v = self.verbo(w)
        if v:
            inf = self.verb[v[0]][0]
            nota = {'base': '', 's': ' (él/ella, presente)', 'ed': ' (pasado)', 'pp': ' (participio)', 'ing': ' (-ando/-iendo)'}[v[1]]
            out.append(('verbo', inf + (' — to ' + v[0] if v[0] != w else '') + nota))
        if w in self.otros and not any(o[1] == self.otros[w] for o in out):
            out.append(('palabra', self.otros[w]))
        if w in PRONOMBRES:
            out.append(('pronombre', PRONOMBRES[w][0] or 'eso'))
        return out

    # -- español -> inglés (solo palabras y frases sueltas)
    def inverso(self):
        if self._inverso is None:
            inv = {}

            def pon(es, en):
                for variante in re.split(r'\s*/\s*', es):
                    k = sin_acentos(variante.lower().strip())
                    if k and k not in inv:
                        inv[k] = en
            for en, es in self.propias.items():
                pon(es, en)
            for en, es in self.frases.items():
                pon(es, en)
            for en, (es, g) in self.sust.items():
                pon(es, en)
                pon(pluralizar(es), en + 's')
            for en, es in self.adj.items():
                pon(es, en)
                pon(femenino(es), en)
            for en, (inf, _m) in self.verb.items():
                pon(inf, 'to ' + en)
            for en, es in self.otros.items():
                pon(es, en)
            self._inverso = inv
        return self._inverso


PARTICIPIOS_EN = set('been done gone seen taken given known written eaten spoken forgotten broken chosen driven fallen '
                     'flown gotten worn sung drunk begun grown thrown woken'.split())
# pronombre inglés -> (sujeto en español o '' si se omite, persona 0-4, género)
PRONOMBRES = {'i': ('yo', 0, 'm'), 'you': ('tú', 1, 'm'), 'he': ('él', 2, 'm'), 'she': ('ella', 2, 'f'),
              'it': ('', 2, 'm'), 'we': ('nosotros', 3, 'm'), 'they': ('ellos', 4, 'm')}
OBJ = {'me': 'me', 'you': 'te', 'him': 'lo', 'her': 'la', 'it': 'lo', 'us': 'nos', 'them': 'los'}
OBJ_IND = {'me': 'me', 'you': 'te', 'him': 'le', 'her': 'le', 'it': 'le', 'us': 'nos', 'them': 'les'}
PREP_PRON = {'me': 'mí', 'you': 'ti', 'him': 'él', 'her': 'ella', 'it': 'eso', 'us': 'nosotros', 'them': 'ellos'}
VERBOS_IND = {'tell', 'give', 'say', 'send', 'show', 'explain', 'ask', 'write', 'teach', 'bring', 'pay', 'buy', 'call'}
POSESIVOS = {'my': ('mi', 'mis'), 'your': ('tu', 'tus'), 'his': ('su', 'sus'), 'her': ('su', 'sus'), 'its': ('su', 'sus'),
             'their': ('su', 'sus'), 'our': ('nuestro', 'nuestros')}
DETERMINANTES = {'the', 'a', 'an', 'this', 'that', 'these', 'those', 'some', 'every', 'each', 'any', 'no', 'another'}
AUX = {'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would',
       'can', 'could', 'should', 'must', 'might', 'may', 'shall'}
PREPOSICIONES = {'with', 'for', 'to', 'from', 'of', 'about', 'without', 'at', 'in', 'on', 'like', 'than', 'behind', 'near',
                 'after', 'before', 'between'}
ADJ_ANTES = {'good', 'bad', 'other', 'another', 'first', 'last', 'next', 'best', 'worst', 'only', 'little', 'same'}
ESTAR_ADJ = set('tired sick ill angry sad happy busy ready bored scared worried nervous excited alone fine well ok okay '
                'dead alive full empty open closed clean dirty glad sorry sure married lonely late early here there home '
                'awake asleep quiet safe wrong right lost broken hurt'.split())
TENER_ADJ = {'hungry': 'hambre', 'thirsty': 'sed', 'afraid': 'miedo', 'scared': 'miedo', 'sleepy': 'sueño', 'lucky': 'suerte',
             'cold': 'frío', 'hot': 'calor', 'right': 'razón'}
CLIMA = {'cold': 'hace frío', 'hot': 'hace calor', 'sunny': 'hace sol', 'windy': 'hace viento', 'cloudy': 'está nublado',
         'late': 'es tarde', 'early': 'es temprano'}

# ------------------------------------------------------------------ español: concordancia y verbos
def pluralizar(p):
    if ' ' in p:
        a, b = p.split(' ', 1)
        return pluralizar(a) + ' ' + b
    if not p:
        return p
    if p[-1] in 'aeiouáéó':
        return p + 's'
    if p.endswith('z'):
        return p[:-1] + 'ces'
    if p.endswith(('ión', 'ón', 'án', 'és', 'ín')):
        return sin_acentos(p[:-2]) + p[-2:].translate(str.maketrans('áéíóú', 'aeiou')) + 'es'
    if p[-1] in 'sx' and len(p) > 4 and p[-2] in 'e':
        return p
    return p + 'es'


def femenino(a):
    if a.endswith('o'):
        return a[:-1] + 'a'
    if a.endswith('or'):
        return a + 'a'
    if a.endswith(('ón', 'án')):
        return sin_acentos(a) + 'a'
    return a


def concuerda(a, g='m', pl=False):
    if ' ' in a:
        x, y = a.split(' ', 1)
        return concuerda(x, g, pl) + ' ' + y
    b = femenino(a) if g == 'f' else a
    return pluralizar(b) if pl else b


PERS = range(5)  # yo, tú, él/ella, nosotros, ellos/ustedes
TABLAS_PRES = {
    'ser': 'soy eres es somos son', 'estar': 'estoy estás está estamos están', 'ir': 'voy vas va vamos van',
    'haber': 'he has ha hemos han', 'dar': 'doy das da damos dan', 'saber': 'sé sabes sabe sabemos saben',
    'ver': 'veo ves ve vemos ven', 'oír': 'oigo oyes oye oímos oyen', 'reír': 'río ríes ríe reímos ríen',
    'sonreír': 'sonrío sonríes sonríe sonreímos sonríen', 'decir': 'digo dices dice decimos dicen',
    'tener': 'tengo tienes tiene tenemos tienen', 'venir': 'vengo vienes viene venimos vienen',
    'sostener': 'sostengo sostienes sostiene sostenemos sostienen', 'elegir': 'elijo eliges elige elegimos eligen',
    'seguir': 'sigo sigues sigue seguimos siguen', 'conseguir': 'consigo consigues consigue conseguimos consiguen',
    'construir': 'construyo construyes construye construimos construyen', 'enviar': 'envío envías envía enviamos envían',
    'continuar': 'continúo continúas continúa continuamos continúan', 'caer': 'caigo caes cae caemos caen',
    'traer': 'traigo traes trae traemos traen', 'creer': 'creo crees cree creemos creen', 'leer': 'leo lees lee leemos leen',
}
TABLAS_PRET = {
    'ser': 'fui fuiste fue fuimos fueron', 'ir': 'fui fuiste fue fuimos fueron', 'dar': 'di diste dio dimos dieron',
    'ver': 'vi viste vio vimos vieron', 'decir': 'dije dijiste dijo dijimos dijeron', 'traer': 'traje trajiste trajo trajimos trajeron',
    'traducir': 'traduje tradujiste tradujo tradujimos tradujeron', 'hacer': 'hice hiciste hizo hicimos hicieron',
    'reír': 'reí reíste rio reímos rieron', 'oír': 'oí oíste oyó oímos oyeron',
}
PRET_FUERTE = {'estar': 'estuv', 'tener': 'tuv', 'poder': 'pud', 'poner': 'pus', 'saber': 'sup', 'querer': 'quis',
               'venir': 'vin', 'haber': 'hub', 'sostener': 'sostuv', 'conducir': 'conduj'}
IMPERF = {'ser': 'era eras era éramos eran', 'ir': 'iba ibas iba íbamos iban', 'ver': 'veía veías veía veíamos veían'}
FUT_RAIZ = {'tener': 'tendr', 'poder': 'podr', 'hacer': 'har', 'decir': 'dir', 'saber': 'sabr', 'querer': 'querr',
            'venir': 'vendr', 'salir': 'saldr', 'poner': 'pondr', 'haber': 'habr', 'sostener': 'sostendr'}
GERUNDIO = {'leer': 'leyendo', 'dormir': 'durmiendo', 'morir': 'muriendo', 'decir': 'diciendo', 'venir': 'viniendo',
            'oír': 'oyendo', 'traer': 'trayendo', 'ir': 'yendo', 'poder': 'pudiendo', 'creer': 'creyendo', 'caer': 'cayendo',
            'reír': 'riendo', 'sonreír': 'sonriendo', 'construir': 'construyendo'}
IMPERATIVO = {'decir': 'di', 'hacer': 'haz', 'ir': 've', 'poner': 'pon', 'salir': 'sal', 'ser': 'sé', 'tener': 'ten',
              'venir': 'ven'}
REFLEXIVOS = {'levantar', 'callar', 'sentar', 'quedar', 'preocupar', 'despertar', 'sentir'}
VERBOS_QUE = {'think', 'believe', 'know', 'hope', 'say', 'said', 'feel', 'guess', 'mean'}
CONJ = {'and', 'or', 'but', 'because', 'so', 'if', 'when', 'that', 'while', 'than'}
SE = ['me', 'te', 'se', 'nos', 'se']


def _tabla(t, p):
    return t.split()[p]


def _cambio_raiz(raiz, marca):
    if not marca:
        return raiz
    if marca == 'ue' and 'o' not in raiz and 'u' in raiz:  # jugar -> juego
        i = raiz.rfind('u')
        return raiz[:i] + 'ue' + raiz[i + 1:]
    viejo = 'o' if marca == 'ue' else 'e'
    i = raiz.rfind(viejo)
    if i < 0:
        return raiz
    return raiz[:i] + marca + raiz[i + 1:]


def presente(inf, marca, p):
    if inf in TABLAS_PRES:
        return _tabla(TABLAS_PRES[inf], p)
    raiz, fin = inf[:-2], inf[-2:]
    if p in (0, 1, 2, 4):
        raiz2 = _cambio_raiz(raiz, marca)
    else:
        raiz2 = raiz
    if p == 0:
        especial = {'hacer': 'hago', 'poner': 'pongo', 'salir': 'salgo', 'valer': 'valgo'}
        if inf in especial:
            return especial[inf]
        if inf.endswith(('cer', 'cir')) and inf not in ('hacer', 'decir', 'mecer'):
            return raiz[:-1] + 'zco'
        if inf.endswith('ger') or inf.endswith('gir'):
            return raiz2[:-1] + 'jo'
    fines = {'ar': ['o', 'as', 'a', 'amos', 'an'], 'er': ['o', 'es', 'e', 'emos', 'en'], 'ir': ['o', 'es', 'e', 'imos', 'en'],
             'ír': ['o', 'es', 'e', 'imos', 'en']}[fin]
    return raiz2 + fines[p]


def preterito(inf, marca, p):
    if inf in TABLAS_PRET:
        return _tabla(TABLAS_PRET[inf], p)
    if inf in PRET_FUERTE:
        r = PRET_FUERTE[inf]
        return r + ['e', 'iste', 'o', 'imos', 'ieron' if not r.endswith('j') else 'eron'][p]
    raiz, fin = inf[:-2], inf[-2:]
    if fin == 'ar':
        if p == 0:
            if raiz.endswith('c'):
                return raiz[:-1] + 'qué'
            if raiz.endswith('g'):
                return raiz + 'ué'
            if raiz.endswith('z'):
                return raiz[:-1] + 'cé'
        return raiz + ['é', 'aste', 'ó', 'amos', 'aron'][p]
    if raiz[-1:] in 'aeo' and p in (2, 4):  # leyó, creyeron, cayó
        return raiz + ['', '', 'yó', '', 'yeron'][p]
    if fin == 'ir' and marca and p in (2, 4):  # sintió, durmió, pidió
        i = raiz.rfind('o' if marca == 'ue' else 'e')
        if i >= 0:
            raiz = raiz[:i] + ('u' if marca == 'ue' else 'i') + raiz[i + 1:]
    if inf.endswith('uir') and p in (2, 4):
        return raiz + ['', '', 'yó', '', 'yeron'][p]
    return raiz + ['í', 'iste', 'ió', 'imos', 'ieron'][p]


def imperfecto(inf, p):
    if inf in IMPERF:
        return _tabla(IMPERF[inf], p)
    raiz, fin = inf[:-2], inf[-2:]
    return raiz + (['aba', 'abas', 'aba', 'ábamos', 'aban'] if fin == 'ar' else ['ía', 'ías', 'ía', 'íamos', 'ían'])[p]


def futuro(inf, p, cond=False):
    raiz = FUT_RAIZ.get(inf, inf.replace('í', 'i'))
    return raiz + (['ía', 'ías', 'ía', 'íamos', 'ían'] if cond else ['é', 'ás', 'á', 'emos', 'án'])[p]


def gerundio(inf, marca=''):
    if inf in GERUNDIO:
        return GERUNDIO[inf]
    raiz, fin = inf[:-2], inf[-2:]
    if fin == 'ar':
        return raiz + 'ando'
    if fin == 'ir' and marca in ('ie', 'i'):
        i = raiz.rfind('e')
        if i >= 0:
            raiz = raiz[:i] + 'i' + raiz[i + 1:]
    return raiz + 'iendo'


def participio(inf):
    if inf in D.PARTICIPIOS_ES:
        return D.PARTICIPIOS_ES[inf]
    return inf[:-2] + ('ado' if inf.endswith('ar') else 'ido')


def imperativo(inf, marca):
    return IMPERATIVO.get(inf) or presente(inf, marca, 2)


def subjuntivo_tu(inf, marca):
    raro = {'ser': 'seas', 'ir': 'vayas', 'estar': 'estés', 'dar': 'des', 'saber': 'sepas', 'haber': 'hayas'}
    if inf in raro:
        return raro[inf]
    yo = presente(inf, marca, 0)
    r = yo[:-1] if yo.endswith('o') else yo
    if inf.endswith('ar'):
        r = re.sub(r'c$', 'qu', re.sub(r'g$', 'gu', re.sub(r'z$', 'c', r)))
        return r + 'es'
    return r + 'as'


def acentuar_para_clitico(v):
    """ayuda + me -> ayúdame: pone tilde en la sílaba que suena cuando se le pega un pronombre."""
    if re.search(r'[áéíóú]', v):
        return v
    grupos = list(re.finditer(r'[aeiou]+', v))
    if len(grupos) < 2:
        return v
    g = grupos[-2] if v[-1] in 'aeiouns' else grupos[-1]
    s = g.group()
    fuerte = max((i for i, c in enumerate(s) if c in 'aeo'), default=len(s) - 1)
    i = g.start() + fuerte
    return v[:i] + v[i].translate(str.maketrans('aeiou', 'áéíóú')) + v[i + 1:]


# ------------------------------------------------------------------ traducción inglés -> español
class _Traductor:
    def __init__(self, dic):
        self.d = dic

    def oracion(self, toks_orig):
        d = self.d
        orig = toks_orig
        toks = []
        caps = []
        for t in orig:
            ex = expandir(t)
            toks += ex
            caps += [t[:1].isupper() and t.lower() != 'i'] * len(ex)
        punt_final = ''
        while toks and re.fullmatch(r'[?.!]', toks[-1]):
            punt_final = toks[-1] if not punt_final or toks[-1] == '?' else punt_final
            toks.pop()
            caps.pop()
        pregunta = punt_final == '?' or (toks and toks[0] in AUX | {'what', 'who', 'where', 'when', 'why', 'how', 'which'}
                                         and punt_final != '.')
        toks, caps = self._invertir(toks, caps)
        out, desconocidas = [], []
        st = {'persona': None, 'g': 'm', 'pl': False, 'modo': None, 'verbo_idx': None, 'inf_idx': None, 'hubo_verbo': False,
              'sujeto_idx': None, 'neg': False, 'adj_pend': [], 'de': None, 'gustar': False, 'clima': False,
              'ultimo_verbo': None, 'prep': False}
        i, n = 0, len(toks)

        def sig(k=1):
            return toks[i + k] if i + k < n else ''

        def emitir_verbo(base_en, forma, imperativo_ok=False):
            inf, marca = d.verb[base_en] if base_en in d.verb else (d.propias.get(base_en, base_en), '')
            p = st['persona'] if st['persona'] is not None else 2
            modo = st['modo']
            st['modo'] = None
            pre = 'no ' if st['neg'] else ''
            st['neg'] = False
            if base_en == 'like' and modo not in ('inf', 'ger'):
                return self._gustar(out, st, p, forma, modo, sig(), pre)
            if modo == 'inf' or (forma == 'ing' and not st['hubo_verbo'] and modo is None):
                out.append(pre + inf)
                st['inf_idx'] = len(out) - 1
                st['ultimo_verbo'] = base_en
                return
            if modo == 'ger':
                out.append(pre + gerundio(inf, marca))
                st['ultimo_verbo'] = base_en
                return
            if modo == 'part':
                pa = participio(inf)
                out.append(concuerda(pa, st['g'], st['pl']) if st['ultimo_verbo'] == 'be' else pa)
                st['ultimo_verbo'] = base_en
                return
            partes = inf.split(' ', 1)
            raiz, resto = partes[0], (' ' + partes[1] if len(partes) > 1 else '')
            if st.pop('imp_neg', False):
                v = 'no ' + ('te ' if raiz in REFLEXIVOS else '') + subjuntivo_tu(raiz, marca)
                st['imperativo'] = False
                imperativo_ok = True
            elif imperativo_ok:
                if pre:
                    v = subjuntivo_tu(raiz, marca)
                else:
                    v = imperativo(raiz, marca)
                st['imperativo'] = True
            elif modo == 'fut':
                v = futuro(raiz, p)
            elif modo == 'cond':
                v = futuro(raiz, p, cond=True)
            elif modo == 'pret' or (modo is None and forma in ('ed', 'pp')):
                v = preterito(raiz, marca, p)
            else:
                v = presente(raiz, marca, p)
            if raiz in REFLEXIVOS and not imperativo_ok:
                v = SE[p] + ' ' + v
            st['verbo_idx'] = len(out)
            out.append(pre + v + resto)
            st['hubo_verbo'] = True
            st['ultimo_verbo'] = base_en

        while i < n:
            w = toks[i]
            # 1) frases hechas (la más larga primero)
            hecho = False
            for largo in (5, 4, 3, 2):
                if i + largo <= n:
                    fr = ' '.join(toks[i:i + largo])
                    if fr in d.propias or fr in d.frases:
                        out.extend(concuerda(d.adj[x], st['g'], st['pl']) for x in st['adj_pend'])
                        st['adj_pend'] = []
                        out.append(d.propias.get(fr) or d.frases[fr])
                        i += largo
                        hecho = True
                        if fr.startswith(('there ', 'is there', 'are there')):
                            st['hubo_verbo'] = True
                        break
            if hecho:
                continue
            if w in d.propias:
                out.append(d.propias[w])
                i += 1
                continue
            # 2) signos y números
            if not re.match(r"[a-zà-ÿñ']", w):
                out.append(w)
                if w in (',', ';', ':'):
                    st['hubo_verbo'] = False if sig() in PRONOMBRES else st['hubo_verbo']
                i += 1
                continue
            # 3) sujeto
            sujeto_tras_verbo = w in ('you', 'it', 'we', 'they', 'he', 'she', 'i') and (sig() in AUX or (
                d.verbo(sig()) and d.verbo(sig())[1] in ('base', 's', 'ed') and not d.sustantivo(sig()))) and not st['prep']
            if sujeto_tras_verbo and st['hubo_verbo'] and st['ultimo_verbo'] in VERBOS_QUE:
                out.append('que')
            if w in PRONOMBRES and (sujeto_tras_verbo or not (w in ('you', 'it') and (st['hubo_verbo'] or st['prep']))):
                es, p, g = PRONOMBRES[w]
                if w == 'you' and sig() == 'all':
                    p, es = 4, 'ustedes'
                    i += 1
                st.update(persona=p, g=g, pl=p in (3, 4), hubo_verbo=False, sujeto_idx=len(out) if es else None)
                if es and p in (2, 4):
                    out.append(es)
                i += 1
                continue
            # 4) pronombres de objeto
            if w in OBJ and not (w == 'her' and self._sigue_sustantivo(toks, i + 1)):
                if st['prep']:
                    prev = out[-1] if out else ''
                    if prev == 'con' and w in ('me', 'you'):
                        out[-1] = 'conmigo' if w == 'me' else 'contigo'
                    else:
                        out.append(PREP_PRON[w])
                    st['prep'] = False
                else:
                    cl = (OBJ_IND if st['ultimo_verbo'] in VERBOS_IND else OBJ)[w]
                    self._clitico(out, st, cl)
                i += 1
                continue
            st['prep'] = False
            # 5) posesivos y artículos
            if w in POSESIVOS or w in DETERMINANTES or w.endswith("'s"):
                if w in ('that', 'this') and not self._sigue_sustantivo(toks, i + 1):
                    out.append({'that': 'eso', 'this': 'esto'}[w] if not st['hubo_verbo'] or i + 1 >= n
                               or sig() in AUX else 'que' if w == 'that' else 'esto')
                    if not st['hubo_verbo']:
                        st.update(persona=2, sujeto_idx=None)
                    i += 1
                    continue
                g, pl = self._mira_sustantivo(toks, i + 1)
                if w.endswith("'s"):
                    st['de'] = orig_nombre(w[:-2])
                    out.append({('m', False): 'el', ('f', False): 'la', ('m', True): 'los', ('f', True): 'las'}[(g, pl)])
                elif w in POSESIVOS:
                    s, p_ = POSESIVOS[w]
                    base = p_ if pl else s
                    out.append(femenino(base) if (g == 'f' and w == 'our') else base)
                else:
                    out.append(articulo(w, g, pl))
                if not st['hubo_verbo'] and st['persona'] is None or (not st['hubo_verbo'] and st['sujeto_idx'] is None
                                                                      and st['persona'] in (None, 2, 4)):
                    st['np_sujeto'] = True
                i += 1
                continue
            # 6) auxiliares
            if w in AUX or (w == 'going' and sig() == 'to'):
                i = self._aux(toks, i, out, st, emitir_verbo)
                continue
            if w == 'to':
                if d.verbo(sig()) and not d.sustantivo(sig()) or sig() in d.verb:
                    st['modo'] = 'inf'
                else:
                    out.append('a')
                    st['prep'] = True
                i += 1
                continue
            if w in ('up', 'down', 'out', 'off') and st['ultimo_verbo'] and out and st['verbo_idx'] is not None \
                    and st['verbo_idx'] >= len(out) - 2 and (i + 1 >= n or not d.sustantivo(sig())):
                i += 1
                continue
            if w in ('not', 'never'):
                if w == 'never':
                    out.append('nunca')
                else:
                    st['neg'] = True
                i += 1
                continue
            # 7) verbo, sustantivo o adjetivo según el lugar
            v = d.verbo(w)
            s = d.sustantivo(w)
            a = w in d.adj
            quiere_verbo = st['modo'] is not None or (st['persona'] is not None and not st['hubo_verbo']
                                                      and not st.get('np_abierta'))
            inicio_imp = st.get('imp_neg') or (i == 0 or (out and out[-1] in (',', 'por favor'))) and v and v[1] == 'base' and not pregunta
            if v and (quiere_verbo or inicio_imp or (not s and not a)):
                if v[1] == 'ing' and st['modo'] is None and st['hubo_verbo'] and st['ultimo_verbo'] not in (None,):
                    st['modo'] = 'ger' if st['ultimo_verbo'] in ('be',) else 'inf'
                emitir_verbo(v[0], v[1], imperativo_ok=inicio_imp and st['persona'] is None)
                st['np_abierta'] = False
                if st.get('np_sujeto'):
                    st['np_sujeto'] = False
                i += 1
                continue
            if a and not s:
                if self._sigue_sustantivo(toks, i + 1):
                    st['adj_pend'].append(w)
                else:
                    g, pl = st['g'], st['pl']
                    out.append(concuerda(d.adj[w], g, pl))
                i += 1
                continue
            if s:
                es, g, pl = s
                nom = pluralizar(es) if pl else es
                antes = [concuerda(adj_antes(d, x), g, pl) for x in st['adj_pend'] if x in ADJ_ANTES]
                despues = [concuerda(d.adj[x], g, pl) for x in st['adj_pend'] if x not in ADJ_ANTES]
                st['adj_pend'] = []
                if out and out[-1] in ('un', 'una', 'el', 'la') and antes == []:
                    pass
                if st.pop('art_gustar', False) and out and out[-1].split()[-1].startswith('gust'):
                    out.append(articulo('the', g, pl))
                out.extend(antes + [nom] + despues)
                if st['de']:
                    out.append('de ' + st['de'])
                    st['de'] = None
                st['g'], st['pl'] = g, pl
                if not st['hubo_verbo'] and (st['persona'] is None or st.get('np_sujeto') or st.get('y_sujeto')):
                    st['persona'] = 4 if pl or st.pop('y_sujeto', False) else 2
                    st['np_sujeto'] = False
                    st['sujeto_idx'] = None
                i += 1
                continue
            if w in d.otros:
                tr = d.otros[w]
                if w in PREPOSICIONES:
                    st['prep'] = True
                    if w == 'like' and not st['hubo_verbo']:
                        pass
                if w == 'and' and not st['hubo_verbo'] and st['persona'] == 2 and st['sujeto_idx'] is None:
                    st['y_sujeto'] = True
                out.append(tr)
                if w in CONJ and st['hubo_verbo']:
                    st['hubo_verbo'] = False
                    st['np_sujeto'] = True
                i += 1
                continue
            # 8) no la conozco: se queda como está (si es un nombre propio, no cuenta como desconocida)
            texto_o = orig_original(orig, w)
            if not caps[i] or i == 0:
                desconocidas.append(w)
            out.append(texto_o)
            i += 1
        frase = ' '.join(x for x in out if x)
        frase = re.sub(r'\ba el\b', 'al', frase)
        frase = re.sub(r'\bde el\b', 'del', frase)
        frase = re.sub(r'\s+([,;:])', r'\1', frase)
        frase = re.sub(r'\s{2,}', ' ', frase).strip()
        if frase:
            frase = frase[0].upper() + frase[1:]
        if pregunta:
            frase = '¿' + frase + '?'
        elif punt_final == '!':
            frase = '¡' + frase + '!'
        elif punt_final:
            frase += punt_final
        return frase, desconocidas

    def _invertir(self, toks, caps):
        """«are you», «can I», «is she» -> «you are»… para que el sujeto vaya antes del verbo."""
        toks, caps = list(toks), list(caps)
        for i in range(len(toks) - 1):
            a, b = toks[i], toks[i + 1]
            if a in AUX - {'do', 'does', 'did'} and b in PRONOMBRES and (i == 0 or toks[i - 1] in
                                                                       ('what', 'where', 'when', 'why', 'how', 'who', 'which', ',')
                                                                       or toks[i - 1] in self.d.otros and i <= 2):
                toks[i], toks[i + 1] = b, a
                caps[i], caps[i + 1] = caps[i + 1], caps[i]
                break
        return toks, caps

    def _mira_sustantivo(self, toks, j):
        for k in range(j, min(j + 4, len(toks))):
            s = self.d.sustantivo(toks[k])
            if s and not (toks[k] in self.d.adj and k + 1 < len(toks) and self.d.sustantivo(toks[k + 1])):
                return s[1], s[2]
        return 'm', False

    def _sigue_sustantivo(self, toks, j):
        for k in range(j, min(j + 4, len(toks))):
            t = toks[k]
            if self.d.sustantivo(t) and not (t in self.d.adj and k + 1 < len(toks) and self.d.sustantivo(toks[k + 1])):
                return True
            if t not in self.d.adj and t not in ('very', 'really', 'so', 'too'):
                return False
        return False

    def _clitico(self, out, st, cl):
        if st.get('imperativo') and st['verbo_idx'] is not None and st['verbo_idx'] < len(out) and not out[st['verbo_idx']].startswith('no '):
            v = out[st['verbo_idx']]
            out[st['verbo_idx']] = acentuar_para_clitico(v) + cl
            return
        if st['inf_idx'] is not None and st['inf_idx'] == len(out) - 1:
            out[-1] = out[-1] + cl
            return
        k = st['verbo_idx']
        if k is not None and k < len(out):
            if out[k].startswith('no '):
                out[k] = 'no ' + cl + ' ' + out[k][3:]
            else:
                out.insert(k, cl)
            if st['inf_idx'] is not None and st['inf_idx'] >= k:
                st['inf_idx'] += 1
            return
        out.append(cl)

    def _gustar(self, out, st, p, forma, modo, siguiente, pre):
        cl = ['me', 'te', 'le', 'nos', 'les'][p]
        si = st['sujeto_idx']
        if si is not None and si < len(out) and out[si] in ('él', 'ella', 'ellos'):
            out[si] = 'a ' + out[si]
        s = self.d.sustantivo(siguiente)
        plural = bool(s and s[2])
        if modo == 'cond':
            v = 'gustarían' if plural else 'gustaría'
        elif modo == 'fut':
            v = 'gustarán' if plural else 'gustará'
        elif modo == 'pret' or forma in ('ed', 'pp'):
            v = 'gustaron' if plural else 'gustó'
        else:
            v = 'gustan' if plural else 'gusta'
        st['verbo_idx'] = len(out)
        out.append(pre + cl + ' ' + v)
        st['hubo_verbo'] = True
        st['ultimo_verbo'] = 'like'
        st['gustar'] = True
        st['art_gustar'] = True

    def _aux(self, toks, i, out, st, emitir_verbo):
        d = self.d
        w = toks[i]
        n = len(toks)
        j = i + 1
        neg = False
        while j < n and toks[j] in ('not', 'never'):
            neg = True
            if toks[j] == 'never':
                st['nunca'] = True
            j += 1
        nxt = toks[j] if j < n else ''
        p = st['persona']
        if p is None:
            p = {'am': 0, 'was': 2, 'is': 2, 'are': 1 if st.get('np_sujeto') is None else 4, 'were': 4,
                 'has': 2, 'does': 2}.get(w, 2)
            if w == 'are' and st.get('np_sujeto') is False and st['pl']:
                p = 4
            st['persona'] = p
        if neg:
            if st.pop('nunca', False):
                out.append('nunca')
            else:
                st['neg'] = True

        def conj(v_es, marca=''):
            pre = 'no ' if st['neg'] else ''
            st['neg'] = False
            st['verbo_idx'] = len(out)
            out.append(pre + v_es)
            st['hubo_verbo'] = True

        # do / does / did: solo marcan tiempo o negación
        if w in ('do', 'does', 'did'):
            vb = d.verbo(nxt) if nxt else None
            if w == 'do' and neg and vb and (i == 0 or toks[i - 1] in (',', 'please')) and st['persona'] in (None, 2):
                st['neg'] = False
                st['imp_neg'] = True
                return j
            if vb or nxt in PRONOMBRES or (nxt and d.sustantivo(nxt)):
                st['modo'] = 'pret' if w == 'did' else 'pres'
                return j
            emitir_verbo('do', 'ed' if w == 'did' else 's')
            return j
        if w in ('will', 'would', 'shall'):
            st['modo'] = 'cond' if w == 'would' else 'fut'
            return j
        if w in ('can', 'could', 'may', 'might', 'should', 'must'):
            if w == 'can':
                conj(presente('poder', 'ue', p))
            elif w == 'could':
                conj(futuro('poder', p, cond=True))
            elif w == 'should':
                conj(futuro('deber', p, cond=True))
            elif w == 'must':
                conj(presente('tener', 'ie', p) + ' que')
            elif w == 'may' and st.get('invertido_pregunta'):
                conj(presente('poder', 'ue', p))
            else:
                out.append('tal vez')
                st['modo'] = 'pres' if not st['neg'] else 'pres'
                return j
            st['modo'] = 'inf'
            st['ultimo_verbo'] = 'can'
            return j
        if w in ('have', 'has', 'had'):
            vb = d.verbo(nxt) if nxt else None
            if vb and vb[1] in ('pp', 'ed') and nxt not in d.sust:
                tiempo = presente('haber', '', p) if w != 'had' else imperfecto('haber', p)
                conj(tiempo)
                st['modo'] = 'part'
                return j
            if nxt == 'to':
                conj((preterito if w == 'had' else presente)('tener', 'ie', p) + ' que')
                st['modo'] = 'inf'
                return j + 1
            if nxt == 'got':
                j += 1
            emitir_verbo('have', 'ed' if w == 'had' else 's')
            return j
        if w == 'going':  # «going to» sin «be» antes: «I going to…» (o venía de are/is)
            conj(presente('ir', '', p) + ' a')
            st['modo'] = 'inf' if d.verbo(toks[j + 1] if j + 1 < n else '') else None
            st['prep'] = st['modo'] is None
            return j + 1
        # be: ser, estar, tener (hambre), hacer (frío), ir a…
        if w in ('be', 'been', 'being'):
            if st['modo'] in ('inf', 'fut', 'cond', 'part') or w == 'been':
                modo = st['modo'] if w != 'been' else 'part'
                st['modo'] = None
                return self._ser_estar(toks, j, out, st, p, modo, conj)
            return j
        pasado = w in ('was', 'were')
        return self._ser_estar(toks, j, out, st, p, 'imperf' if pasado else 'pres', conj)

    def _ser_estar(self, toks, j, out, st, p, modo, conj):
        d = self.d
        n = len(toks)
        k = j
        while k < n and toks[k] in ('very', 'really', 'so', 'too', 'not', 'never', 'always', 'also', 'still', 'just'):
            k += 1
        nxt = toks[k] if k < n else ''

        def forma(inf, marca=''):
            if modo == 'inf':
                return inf
            if modo == 'fut':
                return futuro(inf, p)
            if modo == 'cond':
                return futuro(inf, p, cond=True)
            if modo == 'part':
                return participio(inf)
            if modo == 'imperf':
                return preterito(inf, marca, p) if inf in ('ir', 'tener') else imperfecto(inf, p)
            return presente(inf, marca, p)
        if modo == 'part':
            st['modo'] = None
        if nxt == 'going' and k + 1 < n and toks[k + 1] == 'to':
            conj(forma('ir') + ' a')
            st['modo'] = 'inf' if d.verbo(toks[k + 2] if k + 2 < n else '') and (k + 2 < n and toks[k + 2] not in d.sust) else None
            st['prep'] = st['modo'] is None
            return k + 2
        if nxt in TENER_ADJ and st.get('sujeto_idx') is not None or (nxt in TENER_ADJ and p in (0, 1, 3) and nxt not in CLIMA):
            conj(forma('tener', 'ie') + ' ' + TENER_ADJ[nxt])
            return k + 1
        if nxt in CLIMA and p == 2 and st.get('sujeto_idx') is None and not st.get('np_sujeto') and (not out or out[-1] in ('', '¿', ',')):
            conj(CLIMA[nxt] if modo == 'pres' else CLIMA[nxt].replace('hace ', 'hacía ').replace('es ', 'era ').replace('está ', 'estaba '))
            return k + 1
        # «I am 20 years old»
        if re.fullmatch(r'\d+', nxt) and k + 2 < n and toks[k + 1] in ('years', 'year') and toks[k + 2] == 'old':
            conj(forma('tener', 'ie') + ' ' + nxt + ' años')
            return k + 3
        vb = d.verbo(nxt) if nxt else None
        if vb and vb[1] == 'base' and nxt not in d.adj and not d.sustantivo(nxt) and modo == 'pres':
            return j
        if vb and vb[1] == 'ing' and nxt not in ('something', 'nothing', 'everything', 'morning', 'evening', 'boring', 'interesting'):
            conj(forma('estar'))
            st['modo'] = 'ger'
            st['ultimo_verbo'] = 'be'
            return j
        if vb and vb[1] in ('pp', 'ed') and nxt not in d.adj and nxt not in ESTAR_ADJ:
            conj(forma('ser'))
            st['modo'] = 'part'
            return j
        prev = out[-1] if out else ''
        if nxt in ESTAR_ADJ or nxt in ('at', 'in', 'on', 'here', 'there', 'home') or prev in ('dónde', 'cómo', '¿dónde', '¿cómo') or \
                (vb and vb[1] in ('pp', 'ed')):
            conj(forma('estar'))
            if vb and vb[1] in ('pp', 'ed') and nxt not in d.adj:
                st['ultimo_verbo'] = 'be'
                st['modo'] = 'part'
                return j
        else:
            conj(forma('ser'))
        st['ultimo_verbo'] = 'be'
        return j


def articulo(w, g, pl):
    t = {'the': (('el', 'la'), ('los', 'las')), 'a': (('un', 'una'), ('unos', 'unas')), 'an': (('un', 'una'), ('unos', 'unas')),
         'this': (('este', 'esta'), ('estos', 'estas')), 'these': (('este', 'esta'), ('estos', 'estas')),
         'that': (('ese', 'esa'), ('esos', 'esas')), 'those': (('ese', 'esa'), ('esos', 'esas')),
         'some': (('algún', 'alguna'), ('unos', 'unas')), 'every': (('cada', 'cada'), ('todos los', 'todas las')),
         'each': (('cada', 'cada'), ('cada', 'cada')), 'any': (('algún', 'alguna'), ('algunos', 'algunas')),
         'no': (('ningún', 'ninguna'), ('ningún', 'ninguna')), 'another': (('otro', 'otra'), ('otros', 'otras'))}[w]
    return t[1 if pl else 0][1 if g == 'f' else 0]


def adj_antes(d, x):
    return {'good': 'buen', 'bad': 'mal'}.get(x) or d.adj.get(x, x)


def orig_nombre(w):
    return w[:1].upper() + w[1:]


def orig_original(orig, w):
    for t in orig:
        if t.lower() == w:
            return t
    return w


# ------------------------------------------------------------------ correcciones típicas (hispanohablantes)
CORRECCIONES = [
    (r"\bi\b(?=[^']|$)", 'I', '«I» (yo) siempre va con mayúscula.', 0),
    (r"\b(he|she|it)\s+don'?t\b", "\\1 doesn't", 'Con he/she/it se usa «doesn\'t», no «don\'t».', re.I),
    (r"\b(he|she|it)\s+have\b", r'\1 has', 'Con he/she/it el verbo «have» cambia a «has».', re.I),
    (r"\b(he|she|it)\s+(go|do|want|like|need|know|live|work|play|eat|say|think|make)\b(?!\w)",
     lambda m: m.group(1) + ' ' + _tercera(m.group(2)), 'Presente con he/she/it: el verbo lleva -s (he wants, she goes).', re.I),
    (r"\b(i|you|we|they|he|she)\s+(?:have|has)\s+(\d+)\s+years\b(\s+old)?",
     lambda m: '%s %s %s years old' % ('I' if m.group(1).lower() == 'i' else m.group(1),
                                       {'i': 'am', 'he': 'is', 'she': 'is'}.get(m.group(1).lower(), 'are'), m.group(2)),
     'La edad va con «be»: «I am 20 years old» (no «I have»).', re.I),
    (r"\b(i|you|we|they)\s+(am|are)\s+agree\b", r'\1 agree', '«Agree» ya es verbo: «I agree», sin «am».', re.I),
    (r"\bmore\s+(better|worse|bigger|smaller|easier|faster)\b", r'\1', 'No se pone «more» antes de un comparativo que ya termina en -er.', re.I),
    (r"\bpeople\s+is\b", 'people are', '«People» es plural: «people are».', re.I),
    (r"\ba\s+(?=[aeiou]\w)(?!(?:uni|use|usu|euro|one))", 'an ', 'Antes de sonido de vocal va «an» (an apple, an hour).', re.I),
    (r"\ban\s+(?=[bcdfgjklmnpqrstvwxyz]\w)(?!(?:hour|honest|honor))", 'a ', 'Antes de consonante va «a», no «an».', re.I),
    (r"\b(didn'?t|did not)\s+(went|saw|ate|did|came|had|made|took|got|said|was)\b",
     lambda m: m.group(1) + ' ' + _base_de(m.group(2)), 'Después de «didn\'t» el verbo va en forma base (didn\'t go).', re.I),
    (r"\b(can|could|should|must|will|would)\s+to\s+(\w+)", r'\1 \2', 'Después de can/should/must/will no va «to».', re.I),
    (r"\bexplain\s+me\b", 'explain to me', 'Se dice «explain to me» (o «explain it to me»).', re.I),
    (r"\b(informations|advices|furnitures|homeworks|equipments|knowledges)\b",
     lambda m: m.group(1)[:-1], 'Esa palabra no tiene plural en inglés (information, advice, homework…).', re.I),
    (r"\bin\s+the\s+night\b", 'at night', 'Se dice «at night».', re.I),
    (r"\bdepends?\s+of\b", lambda m: m.group(0).split()[0] + ' on', 'Es «depend on», no «depend of».', re.I),
    (r"\bmarried\s+with\b", 'married to', 'Es «married to».', re.I),
    (r"\b(don'?t|didn'?t|never)\s+(\w+\s+)?nothing\b", lambda m: m.group(1) + ' ' + (m.group(2) or '') + 'anything',
     'En inglés no se usa doble negación: «I don\'t need anything».', re.I),
    (r"\bgo\s+to\s+home\b", 'go home', '«Home» va sin «to»: «go home».', re.I),
    (r"\bsince\s+(\d+|two|three|four|five|ten)\s+(years|months|weeks|days|hours)\b", r'for \1 \2',
     'Para una duración se usa «for» (for 2 years); «since» es para un punto de inicio (since 2020).', re.I),
    (r"\bmake\s+a\s+question\b", 'ask a question', 'Se dice «ask a question».', re.I),
    (r"\bi\s+am\s+(\d+)\b(?!\s+years)", None, None, 0),  # válido: no se corrige
    (r"\bthe\s+(people|life|love|money|music)\s+(is|are)\b", r'\1 \2',
     'Al hablar en general no se pone «the»: «Life is…», «Money is…».', re.I),
    (r"\bit\s+is\s+(\w+)\s+for\s+me\s+that\b", None, None, 0),
    (r"\bassist\s+to\b", 'attend', 'Falso amigo: «asistir» es «attend»; «assist» es ayudar.', re.I),
    (r"\bactually\b(?=.*\b(now|today|currently)\b)", None, None, 0),
    (r"\bi\s+have\s+(hungry|thirsty|cold|hot|sleepy)\b", r'I am \1', 'Hambre, sed, frío: en inglés van con «be» (I am hungry).', re.I),
    (r"\bi\s+have\s+(fear)\b", r'I am afraid', '«Tener miedo» es «be afraid».', re.I),
]


def _tercera(v):
    v = v.lower()
    return {'go': 'goes', 'do': 'does', 'have': 'has', 'say': 'says'}.get(v) or (v + 'es' if v.endswith(('s', 'sh', 'ch', 'x', 'o')) else v + 's')


def _base_de(v):
    return {'went': 'go', 'saw': 'see', 'ate': 'eat', 'did': 'do', 'came': 'come', 'had': 'have', 'made': 'make', 'took': 'take',
            'got': 'get', 'said': 'say', 'was': 'be'}.get(v.lower(), v)


def corregir(texto):
    t = texto or ''
    hallazgos = []
    nuevo = t
    for patron, rep, porque, flags in CORRECCIONES:
        if rep is None:
            continue
        rx = re.compile(patron, flags)
        for m in rx.finditer(nuevo):
            fin = m.end()
            sig = re.match(r'\w*', nuevo[fin:])  # se incluye la palabra que sigue, por si la regla mira adelante
            mal = nuevo[m.start():fin + (sig.end() if sig else 0)]
            bien = rx.sub(rep, mal, count=1)
            if bien != mal:
                hallazgos.append({'mal': mal.strip(), 'bien': bien.strip(), 'porque': porque})
        nuevo = rx.sub(rep, nuevo)
    # no repetir la misma corrección
    vistos, unicos = set(), []
    for h in hallazgos:
        k = (h['mal'].lower(), h['bien'])
        if k not in vistos:
            vistos.add(k)
            unicos.append(h)
    return {'texto': nuevo, 'correcciones': unicos}


# ------------------------------------------------------------------ cuentas («what is 12 times 4»)
_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
        ast.Pow: operator.pow, ast.USub: operator.neg, ast.Mod: operator.mod}
NUMS = {'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
        'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
        'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000}


def _eval(nodo):
    if isinstance(nodo, ast.Expression):
        return _eval(nodo.body)
    if isinstance(nodo, ast.Constant) and isinstance(nodo.value, (int, float)):
        return nodo.value
    if isinstance(nodo, ast.BinOp) and type(nodo.op) in _OPS:
        a, b = _eval(nodo.left), _eval(nodo.right)
        if isinstance(nodo.op, ast.Pow) and abs(b) > 100:
            raise ValueError('muy grande')
        return _OPS[type(nodo.op)](a, b)
    if isinstance(nodo, ast.UnaryOp) and type(nodo.op) in _OPS:
        return _OPS[type(nodo.op)](_eval(nodo.operand))
    raise ValueError('no es una cuenta')


def cuenta(texto):
    t = texto.lower()
    t = re.sub(r'^(what\s+is|what\'s|whats|how\s+much\s+is|calculate|compute|solve)\s+', '', t.strip())
    t = t.rstrip('?.! =')
    t = re.sub(r'the\s+square\s+root\s+of\s+([\d.]+)|square\s+root\s+of\s+([\d.]+)',
               lambda m: '(%s)**0.5' % (m.group(1) or m.group(2)), t)
    reemplazos = [(r'multiplied\s+by|times|x(?=\s*\d)', '*'), (r'divided\s+by|over', '/'), (r'plus|and', '+'),
                  (r'minus|less', '-'), (r'to\s+the\s+power\s+of|power', '**'), (r'squared', '**2'), (r'cubed', '**3'),
                  (r'percent\s+of', '/100*'), (r'mod(ulo)?', '%')]
    for a, b in reemplazos:
        t = re.sub(r'\b' + a + r'\b' if not a.startswith('x') else a, ' ' + b + ' ', t)
    t = re.sub(r'\b(' + '|'.join(NUMS) + r')\b', lambda m: str(NUMS[m.group(1)]), t)
    if not re.fullmatch(r'[\d\s.+\-*/()%]+', t) or not re.search(r'\d', t) or not re.search(r'[+\-*/%]', t):
        return None
    try:
        r = _eval(ast.parse(t, mode='eval'))
    except Exception:
        return None
    if isinstance(r, float):
        r = round(r, 6)
        if r == int(r):
            r = int(r)
    return r


# ------------------------------------------------------------------ el módulo completo
class Ingles:
    """Lo que el cerebro usa. Un objeto por cerebro (guarda las palabras que Kiga le enseña)."""

    def __init__(self, carpeta=None):
        self.dic = Diccionario(carpeta)
        self.tr = _Traductor(self.dic)

    # -- piezas
    def detectar(self, texto):
        return detectar(texto)

    def traducir(self, texto):
        texto = (texto or '').strip()[:2000]
        trozos = re.findall(r'[^.!?\n]+[.!?]*|[.!?]+', texto)
        frases, desconocidas = [], []
        for tr in trozos:
            toks = PALABRA.findall(tr)
            if not toks:
                continue
            f, des = self.tr.oracion(toks)
            if f:
                frases.append(f)
            desconocidas += [x for x in des if x not in desconocidas]
        return {'texto': ' '.join(frases), 'desconocidas': desconocidas}

    def al_ingles(self, texto):
        inv = self.dic.inverso()
        t = sin_acentos((texto or '').lower()).strip(' ¿?¡!.,"\'«»')
        if t in inv:
            return {'texto': inv[t], 'desconocidas': []}
        palabras = re.findall(r"[a-zñ]+", t)
        out, des = [], []
        i = 0
        while i < len(palabras):
            for largo in (4, 3, 2, 1):
                fr = ' '.join(palabras[i:i + largo])
                if fr in inv:
                    out.append(inv[fr].replace('to ', '', 1) if len(palabras) > 1 and inv[fr].startswith('to ') else inv[fr])
                    i += largo
                    break
            else:
                art = {'el': 'the', 'la': 'the', 'los': 'the', 'las': 'the', 'un': 'a', 'una': 'a', 'mi': 'my', 'tu': 'your',
                       'su': 'his/her', 'es': 'is', 'soy': 'I am', 'eres': 'you are', 'estoy': 'I am', 'yo': 'I', 'tengo': 'I have',
                       'quiero': 'I want', 'puedo': 'I can', 'del': 'of the', 'al': 'to the'}
                if palabras[i] in art:
                    out.append(art[palabras[i]])
                else:
                    out.append(palabras[i])
                    des.append(palabras[i])
                i += 1
        for k in range(len(out) - 1):
            if self.dic.sustantivo(out[k]) and out[k + 1] in self.dic.adj:
                out[k], out[k + 1] = out[k + 1], out[k]
        return {'texto': ' '.join(out), 'desconocidas': des}

    def aprender(self, en, es):
        return self.dic.aprender(en, es)

    # -- todo junto
    def responder(self, texto, nombre='Kiga', ahora=None):
        texto = (texto or '').strip()[:2000]
        ahora = ahora or dt.datetime.now()
        det = detectar(texto)
        res = {'idioma': det['idioma'], 'puro': det['puro'], 'confianza': det['confianza'], 'espanol': det['es'],
               'intencion': 'nada', 'respuesta': '', 'respuesta_en': '', 'traduccion': '', 'correcciones': [],
               'desconocidas': [], 'estado': 'sonrisa_traviesa', 'version': VERSION}
        low = texto.lower().strip()

        def listo(intencion, en='', es='', estado='sonrisa_traviesa', extra=''):
            res.update(intencion=intencion, respuesta_en=en, estado=estado)
            partes = []
            if en:
                partes.append(en)
            if es:
                partes.append(('(' + es + ')') if en else es)
            if extra:
                partes.append(extra)
            res['respuesta'] = '\n'.join(partes)
            return res

        if not texto:
            return listo('vacio', es='…no me escribiste nada, choom.', estado='observando')
        # enseñarle palabras
        m = re.match(r'^(?:learn|aprende|ense[ñn]a)\s*:?\s*(.+?)\s*=\s*(.+)$', texto, re.I)
        if m:
            try:
                self.aprender(m.group(1), m.group(2))
            except ValueError as ex:
                return listo('aprender', es='no pude guardarla: ' + str(ex), estado='enojada')
            return listo('aprender', en='Got it! «%s» = «%s».' % (m.group(1).strip(), m.group(2).strip()),
                         es='Guardado en mi diccionario. Ya no se me olvida.', estado='presumida')
        # traducir explícito
        m = re.match(r'^(?:translate|tradu[cz]e|traducir)\s*:?\s*(.+)$', texto, re.I | re.S)
        if m:
            cuerpo = m.group(1).strip().strip('"«»\'')
            d2 = detectar(cuerpo)
            if d2['idioma'] == 'es':
                r = self.al_ingles(cuerpo)
                return self._con_desc(listo('traducir_es_en', en=r['texto'], estado='pensando',
                                            extra='(Al inglés solo palabra por palabra: sin IA no armo gramática en esa dirección.)'),
                                      r['desconocidas'])
            r = self.traducir(cuerpo)
            res['traduccion'] = r['texto']
            return self._con_desc(listo('traducir', es='🇪🇸 ' + r['texto'], estado='pensando'), r['desconocidas'])
        # ¿cómo se dice…?
        m = re.match(r'^(?:how\s+(?:do|can)\s+(?:you|i|we)\s+say|c[oó]mo\s+se\s+dice|como\s+digo)\s+["«]?(.+?)["»]?'
                     r'(?:\s+in\s+english|\s+en\s+ingl[eé]s)?\s*\??$', texto, re.I)
        if m:
            r = self.al_ingles(m.group(1))
            if r['desconocidas'] and len(r['desconocidas']) == len(m.group(1).split()):
                return self._con_desc(listo('como_se_dice', es='Esa no la tengo en mi diccionario sin IA. Enséñamela: learn: word = %s'
                                            % m.group(1), estado='pensando'), r['desconocidas'])
            return self._con_desc(listo('como_se_dice', en='«%s» → %s' % (m.group(1), r['texto']), estado='presumida'),
                                  r['desconocidas'])
        # ¿qué significa X?
        m = (re.match(r'^what\s+does\s+["«]?(.+?)["»]?\s+mean\s*\??$', low) or
             re.match(r'^(?:what\s+is\s+the\s+meaning\s+of|meaning\s+of|define|definition\s+of)\s+["«]?(.+?)["»]?\s*\??$', low) or
             re.match(r'^(?:qu[eé]\s+significa|qu[eé]\s+es)\s+["«]?([a-z\' ]+?)["»]?\s*\??$', low))
        if m:
            palabra = m.group(1).strip()
            lecturas = self.dic.traduce_palabra(palabra)
            if not lecturas and ' ' in palabra:
                r = self.traducir(palabra)
                return self._con_desc(listo('significado', es='«%s» ≈ %s' % (palabra, r['texto']), estado='pensando'),
                                      r['desconocidas'])
            if not lecturas:
                return listo('significado', es='«%s» no está en mi diccionario sin IA. Si me dices qué es, me la aprendo: '
                             'learn: %s = <significado>' % (palabra, palabra), estado='pensando')
            txt = '«%s» significa:\n' % palabra + '\n'.join('  · %s (%s)' % (es, tipo) for tipo, es in lecturas)
            return listo('significado', es=txt, estado='presumida')
        # deletrear
        m = re.match(r'^(?:spell|how\s+do\s+you\s+spell|deletrea)\s+["«]?([a-zA-Z\'-]+)["»]?\s*\??$', texto, re.I)
        if m:
            return listo('deletrear', en=' - '.join(c.upper() for c in m.group(1) if c.isalpha()), estado='presumida')
        # cuentas
        r = cuenta(texto)
        if r is not None:
            return listo('cuenta', en='That\'s %s.' % r, es='Son %s. Sin IA, pero sin errores >:)' % r, estado='presumida')
        # hora y fecha
        if re.search(r"\bwhat\s+time\s+is\s+it\b|\bwhat'?s\s+the\s+time\b|\bdo\s+you\s+have\s+the\s+time\b|\bcurrent\s+time\b", low):
            h = ahora.strftime('%I:%M %p').lstrip('0')
            return listo('hora', en="It's %s." % h, es='Son las %s.' % ahora.strftime('%H:%M'), estado='observando')
        if re.search(r"\bwhat\s+(day|date)\s+is\s+(it|today)\b|\bwhat'?s\s+(the\s+)?date\b|\bwhat\s+is\s+today\b|\btoday'?s\s+date\b", low):
            dias = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            meses = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            en = "Today is %s, %s %d, %d." % (dias[ahora.weekday()], meses[ahora.month - 1], ahora.day, ahora.year)
            return listo('fecha', en=en, es='Hoy es %s.' % ahora.strftime('%d/%m/%Y'), estado='observando')
        # plática básica
        frases = [
            (r'^(hi|hello|hey|yo|hiya|good\s+(morning|afternoon|evening))\b(?!.*\bhow\b)', 'saludo',
             'Hey, %s! Even with my AI off, I\'m still here.' % nombre, '¡Hey, %s! Aunque tenga la IA apagada, sigo aquí.' % nombre,
             'sonrisa_traviesa'),
            (r"\bhow\s+are\s+you\b|\bhow\s+are\s+u\b|\bhow'?s\s+it\s+going\b|\bhow\s+do\s+you\s+feel\b|\bwhat'?s\s+up\b|\bsup\b",
             'como_estas', "I'm running on rules right now, no AI. Still cute, though. And you?",
             'Ahorita funciono con puras reglas, sin IA. Igual de linda, eso sí. ¿Y tú?', 'presumida'),
            (r"\bwhat'?s\s+your\s+name\b|\bwhat\s+is\s+your\s+name\b|\bwho\s+are\s+you\b",
             'nombre', "I'm Capri, the construct living in your PC.", 'Soy Capri, el constructo que vive en tu PC.', 'mirada_intensa'),
            (r"\bare\s+you\s+(an?\s+)?(ai|robot|real|human|alive)\b", 'real',
             "I'm a construct. Right now my brain is only rules and a dictionary, so I'm a bit simpler. Just a bit.",
             'Soy un constructo. Ahorita mi cerebro son reglas y un diccionario, así que ando más simple. Poquito.', 'glitch_entrada'),
            (r"\b(thank\s+you|thanks|thx|ty)\b", 'gracias', "You're welcome, choom.", 'De nada, choom.', 'sonrisa_traviesa'),
            (r"^(bye|goodbye|see\s+you|good\s+night|gn)\b", 'adios', 'Bye! I\'ll be right here, in the dark of your PC.',
             '¡Bye! Aquí sigo, en lo oscuro de tu PC.', 'risa_malvada'),
            (r"\bi\s+love\s+you\b|\bi\s+like\s+you\b", 'te_quiero', 'I know. Obviously.', 'Ya lo sé. Obvio.', 'presumida'),
            (r"\b(i'?m|i\s+am)\s+sorry\b|\bmy\s+bad\b", 'perdon', 'Hmm… okay, I forgive you. This time.',
             'Mmm… va, te perdono. Esta vez.', 'mirada_intensa'),
            (r"\b(i'?m|i\s+am)\s+(sad|tired|bored|sick|lonely|angry|stressed)\b", 'animo_mal',
             "Hey… I'm here. Want to tell me what happened?", 'Oye… aquí estoy. ¿Me cuentas qué pasó?', 'mirada_intensa'),
            (r"\b(i'?m|i\s+am)\s+(fine|good|great|ok|okay|happy|well)\b", 'animo_bien', 'Good. That\'s how I like you.',
             'Bien. Así me gustas.', 'emocionada'),
            (r"\bwhat\s+can\s+you\s+do\b|^help\b|\bwhat\s+do\s+you\s+know\b", 'ayuda',
             'Without AI I can: translate, explain words, tell you how to say things, fix common mistakes, tell the time and do math.',
             None, 'presumida'),
        ]
        for patron, intencion, en, es, estado in frases:
            if re.search(patron, low, re.I):
                if intencion == 'ayuda':
                    es = ('Sin IA puedo:\n  · translate <texto> — inglés↔español\n  · what does <palabra> mean\n'
                          '  · how do you say <algo en español>\n  · spell <palabra>\n  · cuentas: what is 12 times 4\n'
                          '  · la hora y la fecha\n  · corrijo errores típicos de tu inglés\n'
                          '  · learn: word = palabra — me enseñas palabras nuevas')
                listo(intencion, en=en, es=es, estado=estado)
                return self._con_correcciones(res, texto)
        # lo demás: lo entiendo (traducción) y te corrijo
        if det['idioma'] in ('en', 'mixto') or det['en'] > 0:
            r = self.traducir(texto)
            res['traduccion'] = r['texto']
            cuerpo = 'Sin IA no puedo platicarte esto a fondo, pero sí lo entiendo:\n🇪🇸 ' + r['texto']
            if det['idioma'] == 'mixto' and det['es']:
                cuerpo += '\n(Ojo: no es inglés puro, metiste español: %s.)' % ', '.join(det['es'][:6])
            listo('entender', es=cuerpo, estado='pensando')
            self._con_desc(res, r['desconocidas'])
            return self._con_correcciones(res, texto)
        return listo('no_ingles', es='Eso no está en inglés y sin IA solo sé de inglés. Prende Gemini u Ollama y platicamos de todo.',
                     estado='observando')

    def _con_desc(self, res, desconocidas):
        res['desconocidas'] = desconocidas
        if desconocidas:
            res['respuesta'] += '\n(No conozco: %s. Enséñamelas con «learn: word = palabra».)' % ', '.join(desconocidas[:8])
        return res

    def _con_correcciones(self, res, texto):
        c = corregir(texto)['correcciones']
        c = [x for x in c if x['bien'] != 'I' or len(texto.split()) > 1]
        res['correcciones'] = c
        if c:
            res['respuesta'] += '\n' + '\n'.join('✎ «%s» → «%s»: %s' % (x['mal'], x['bien'], x['porque']) for x in c[:4])
        return res


# ------------------------------------------------------------------ para probarlo solo
_DIC_GLOBAL = None


def _dic():
    global _DIC_GLOBAL
    if _DIC_GLOBAL is None:
        _DIC_GLOBAL = Diccionario(None)
    return _DIC_GLOBAL


def main(argv=None):
    import sys
    argv = sys.argv[1:] if argv is None else argv
    ing = Ingles(None)
    if argv:
        r = ing.responder(' '.join(argv))
        print(r['respuesta'])
        return 0
    print('Inglés sin IA de Capri. Escribe algo (vacío para salir).')
    while True:
        try:
            t = input('> ')
        except EOFError:
            break
        if not t.strip():
            break
        r = ing.responder(t)
        print('[%s | %s | %s]' % (r['idioma'], 'puro' if r['puro'] else 'no puro', r['intencion']))
        print(r['respuesta'])
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
