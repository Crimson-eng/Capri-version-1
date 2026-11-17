#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Profe de TOEFL sin IA para el cerebro de Capri.

Módulo aparte de ingles_offline.py (que traduce y corrige). Este sabe del examen TOEFL iBT y pone a practicar:
  - explica el examen (secciones, tareas, puntaje 1–6 y CEFR) y da estrategias y plantillas por tarea,
  - genera prácticas con el formato de las tareas: Complete the Words, Build a Sentence, Read in Daily Life,
    Read an Academic Passage, Write an Email, Academic Discussion, Listen and Repeat y Take an Interview,
  - califica: las de opción o respuesta exacta, exacto; Writing y Speaking (escrito) con una rúbrica de reglas 0–5
    que mira lo mismo que mira ETS en la superficie (cumplir la tarea, desarrollo, organización, vocabulario, gramática),
  - vocabulario académico con repaso espaciado (cajas de Leitner),
  - guarda tu progreso y estima tu banda por sección (1–6) y tu nivel CEFR, y arma un plan de estudio.

Honestidad: sin IA la calificación de Writing/Speaking es una ESTIMACIÓN por reglas, útil para practicar, no la de ETS.
El formato es el vigente desde enero de 2026 según ETS; antes de inscribirte confírmalo en ets.org/toefl.
Solo biblioteca estándar.
"""
import datetime as dt
import difflib
import json
import os
import random
import re
import threading
import time

try:
    import toefl_banco as B
except ImportError:  # pragma: no cover
    from . import toefl_banco as B  # type: ignore
try:
    import ingles_offline as IO
except ImportError:  # pragma: no cover
    IO = None

VERSION = '1.0.0'

# ------------------------------------------------------------------ el examen
EXAMEN = {
    'nombre': 'TOEFL iBT',
    'vigente': 'formato desde el 21 de enero de 2026 (ETS)',
    'aviso': 'Confirma tiempos y detalles en ets.org/toefl antes de inscribirte: ETS los puede ajustar.',
    'puntaje': 'Cada sección y el total van de 1 a 6, en medios puntos (1, 1.5 … 6), alineados al CEFR. '
               'Durante la transición ETS también da el equivalente en la escala clásica 0–120.',
    'adaptativo': 'Reading y Listening son adaptativos por etapas: según cómo te va en la primera parte, la segunda es más fácil o más difícil.',
    'secciones': [
        {'id': 'reading', 'nombre': 'Reading', 'tareas': [
            ('Complete the Words', 'completar', 'Un párrafo académico al que le faltan las letras finales de varias palabras. Mide vocabulario y gramática al leer.'),
            ('Read in Daily Life', 'lectura', 'Textos cortos de la vida diaria (avisos, correos, menús, anuncios) con preguntas de opción múltiple.'),
            ('Read an Academic Passage', 'lectura', 'Un texto académico corto con preguntas de idea principal, detalle, inferencia y vocabulario.')]},
        {'id': 'listening', 'nombre': 'Listening', 'tareas': [
            ('Listen and Choose a Response', '', 'Oyes una frase y eliges la respuesta más natural.'),
            ('Listen to a Conversation', '', 'Una conversación corta de campus o vida diaria y preguntas.'),
            ('Listen to an Announcement', '', 'Un anuncio (por ejemplo en la escuela) y preguntas.'),
            ('Listen to an Academic Talk', '', 'Una mini clase y preguntas.')]},
        {'id': 'writing', 'nombre': 'Writing', 'tareas': [
            ('Build a Sentence', 'ordenar', 'Ordenas palabras o pedazos para formar una oración correcta, dentro de una conversación.'),
            ('Write an Email', 'correo', 'Escribes un correo que cumpla tres cosas que te piden. Práctica: 7 minutos.'),
            ('Writing for an Academic Discussion', 'discusion', 'Un profesor hace una pregunta, dos compañeros opinan y tú aportas tu postura. Práctica: 10 minutos, 100+ palabras.')]},
        {'id': 'speaking', 'nombre': 'Speaking', 'tareas': [
            ('Listen and Repeat', 'repetir', 'Oyes oraciones y las repites tal cual. Mide pronunciación y memoria de trabajo.'),
            ('Take an Interview', 'entrevista', 'Un entrevistador (grabado) te hace preguntas y respondes cada una en unos 45 segundos.')]},
    ],
}
CEFR = [(6, 'C2'), (5, 'C1'), (4, 'B2'), (3, 'B1'), (2, 'A2'), (1, 'A1')]
SECCION_DE = {'completar': 'reading', 'lectura': 'reading', 'ordenar': 'writing', 'correo': 'writing', 'discusion': 'writing',
              'repetir': 'speaking', 'entrevista': 'speaking', 'dictado': 'listening', 'vocab': 'reading'}
TIPOS = ['completar', 'ordenar', 'lectura', 'correo', 'discusion', 'repetir', 'entrevista', 'dictado']

ESTRATEGIAS = {
    'reading': ['Lee primero la pregunta y luego busca en el texto: no leas todo dos veces.',
                'En Complete the Words usa la gramática: ¿falta un verbo en pasado, un plural, un adverbio en -ly?',
                'Preguntas NOT/EXCEPT: tacha las tres que sí aparecen.',
                'Vocabulario: sustituye la opción en la oración y ve cuál conserva el sentido.'],
    'listening': ['Toma notas cortas: quién, qué problema, qué solución.',
                  'En Choose a Response piensa en lo que diría una persona real, no en la opción con más palabras repetidas.',
                  'Pon atención a cambios de tono: «actually», «but», «the thing is» anuncian la idea importante.'],
    'writing': ['Email: saludo, una oración por cada cosa que te piden (¡las tres!), despedida. Tono según a quién escribes.',
                'Academic Discussion: tu postura en la primera oración, una razón, un ejemplo concreto y menciona a un compañero.',
                'Varía conectores (however, for example, as a result, in addition) y deja 1 minuto para revisar.',
                'Build a Sentence: busca primero el sujeto y el verbo; en preguntas indirectas no se invierte («where the library is»).'],
    'speaking': ['Listen and Repeat: repite con el mismo ritmo y entonación, aunque se te vaya una palabra no te detengas.',
                 'Interview: respuesta directa + razón + ejemplo personal + cierre. Unos 45 segundos son ~90–110 palabras.',
                 'Si no sabes qué decir, inventa un ejemplo: califican el inglés, no si es verdad.'],
}
PLANTILLAS = {
    'correo': "Dear [nombre],\n\nI am writing to [motivo]. [Cosa 1 con detalle].\n[Cosa 2: \"I'm really sorry about…\" / \"Could we…?\"].\n"
              "[Cosa 3: \"I would be happy to…\" / \"Would it be possible to…?\"].\n\nThank you for your understanding.\nBest regards,\n[tu nombre]",
    'discusion': "I agree with [compañero] that [idea], but I think [tu postura] because [razón].\nFor example, [ejemplo concreto].\n"
                 "In addition, [segunda razón corta]. While [otro compañero] makes a good point about [su idea], [por qué no te convence].\n"
                 "Therefore, [cierre con tu postura].",
    'entrevista': "[Respuesta directa]. The main reason is that [razón]. For example, [historia corta personal]. "
                  "That's why [cierre].",
}

CONECTORES = ['however', 'therefore', 'for example', 'for instance', 'in addition', 'moreover', 'furthermore', 'as a result',
              'on the other hand', 'because', 'since', 'although', 'while', 'whereas', 'first', 'second', 'finally', 'in conclusion',
              'overall', 'in my opinion', 'i believe', 'i think', 'that is why', "that's why", 'also', 'besides', 'consequently',
              'nevertheless', 'even though', 'such as', 'in fact', 'to begin with', 'thus', 'instead']


def banda_de(pct):
    for corte, b in ((95, 6), (88, 5.5), (80, 5), (72, 4.5), (64, 4), (55, 3.5), (45, 3), (35, 2.5), (25, 2), (15, 1.5)):
        if pct >= corte:
            return b
    return 1.0


def cefr_de(banda):
    for b, c in CEFR:
        if banda >= b:
            return c
    return 'A1'


def palabras(t):
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", t or '')


def _norm(t):
    return re.sub(r'\s+', ' ', re.sub(r"[^a-z0-9' ]", ' ', (t or '').lower().replace('’', "'"))).strip()


# ------------------------------------------------------------------ rúbrica de reglas para Writing / Speaking
VOCAB_SET = None


def _vocab():
    global VOCAB_SET
    if VOCAB_SET is None:
        VOCAB_SET = [l.split('|') for l in B.VOCAB.strip().splitlines() if l.count('|') == 2]
    return VOCAB_SET


def rubrica(texto, tarea, extra=None):
    """Calificación 0–5 por reglas. tarea: correo | discusion | entrevista. Regresa puntos, desglose y comentarios."""
    t = (texto or '').strip()
    low = ' ' + _norm(t) + ' '
    ws = palabras(t)
    n = len(ws)
    oraciones = [s for s in re.split(r'(?<=[.!?])\s+|\n+', t) if len(palabras(s)) >= 2]
    largos = [len(palabras(s)) for s in oraciones] or [0]
    meta = {'correo': 80, 'discusion': 100, 'entrevista': 90}[tarea]
    notas, bien = [], []
    # 1) desarrollo (largo)
    p_largo = min(1.0, n / meta)
    if n < meta * 0.6:
        notas.append('Escribe más: llevas %d palabras y la meta es ~%d. Desarrolla cada idea con un detalle o ejemplo.' % (n, meta))
    elif n >= meta:
        bien.append('Buen largo (%d palabras).' % n)
    # 2) cumplir la tarea
    p_tarea = 0.0
    if tarea == 'correo':
        grupos = (extra or {}).get('claves') or []
        puntos = (extra or {}).get('puntos') or []
        cubiertos = [any((' ' + k + ' ') in low or k in low for k in g) for g in grupos]
        p_tarea += 1.2 * (sum(cubiertos) / max(1, len(cubiertos)))
        for ok, que in zip(cubiertos, puntos):
            (bien if ok else notas).append(('Cumpliste: «%s».' if ok else 'Te faltó (o no se nota): «%s». Las tres cosas cuentan mucho.') % que)
        saludo = re.search(r'^\s*(dear|hi|hello|good (morning|afternoon))\b', t, re.I)
        cierre = re.search(r'(best|sincerely|regards|thanks|thank you|cheers|see you)[^\n]{0,30}\n?[^\n]{0,40}$', t, re.I)
        p_tarea += 0.15 * bool(saludo) + 0.15 * bool(cierre)
        if not saludo:
            notas.append('Empieza con saludo: «Dear Professor…» o «Hi Alex,».')
        if not cierre:
            notas.append('Cierra el correo: «Best regards,» / «Thanks,» y tu nombre.')
    else:
        opinion = re.search(r"\b(i (strongly )?(think|believe|agree|disagree|feel|prefer)|in my (opinion|view)|from my perspective|i'm convinced)\b", low)
        razon = re.search(r'\b(because|since|the (main )?reason|due to|as a result)\b', low)
        ejemplo = re.search(r'\b(for example|for instance|such as|in my case|when i|last (year|week|month)|my (friend|brother|sister|mother|father|teacher))\b', low)
        p_tarea += 0.4 * bool(opinion) + 0.4 * bool(razon) + 0.4 * bool(ejemplo)
        if tarea == 'discusion':
            nombres = [x.lower() for x in (extra or {}).get('nombres', [])]
            dialoga = any(nm in low for nm in nombres) or re.search(r'\b(classmate|as .{1,15} (said|mentioned|points out))\b', low)
            p_tarea += 0.3 * bool(dialoga)
            if not dialoga:
                notas.append('Menciona a un compañero («I agree with %s that…»): muestra que participas en la discusión.' % ((extra or {}).get('nombres') or ['Kelly'])[0])
        else:
            p_tarea += 0.3 * (n >= 40)
        if not opinion:
            notas.append('Deja clara tu postura al inicio: «In my opinion…», «I believe…».')
        if not razon:
            notas.append('Da una razón explícita con «because…» o «The main reason is…».')
        if not ejemplo:
            notas.append('Agrega un ejemplo concreto: «For example, last year…». Es lo que más sube el puntaje.')
        if opinion and razon and ejemplo:
            bien.append('Tiene postura, razón y ejemplo: la estructura que buscan.')
    # 3) organización (conectores)
    usados = sorted({c for c in CONECTORES if re.search(r'\b' + re.escape(c) + r'\b', low)})
    p_org = min(1.0, len(usados) / 4)
    if len(usados) < 3:
        notas.append('Usa más conectores para unir ideas (however, for example, as a result, in addition).')
    else:
        bien.append('Buenos conectores: %s.' % ', '.join(usados[:5]))
    # 4) lenguaje: variedad, vocabulario académico, oraciones, gramática
    unicos = len({w.lower() for w in ws})
    ttr = unicos / max(1, n)
    acad = sorted({v[0] for v in _vocab() if re.search(r'\b' + re.escape(v[0].split()[0]) + r'\w*', low)})
    errores = IO.corregir(t)['correcciones'] if IO else []
    errores = [e for e in errores if not (e['bien'] == 'I' and e['mal'] == 'i' and n < 3)]
    p_leng = 1.5
    p_leng -= 0.3 if ttr < 0.45 and n > 40 else 0
    p_leng -= 0.25 if len(acad) == 0 else 0
    variedad = max(largos) - min(largos) if len(largos) > 1 else 0
    p_leng -= 0.2 if variedad < 4 and len(largos) > 2 else 0
    p_leng -= 0.2 if sum(largos) / len(largos) < 7 and n > 30 else 0
    p_leng -= min(0.9, 0.3 * len(errores))
    p_leng = max(0.0, p_leng)
    if errores:
        notas.append('Errores de gramática que se notan: ' + '; '.join('«%s» → «%s»' % (e['mal'], e['bien']) for e in errores[:4]) + '.')
    if acad:
        bien.append('Vocabulario académico: %s.' % ', '.join(acad[:5]))
    else:
        notas.append('Mete 1 o 2 palabras más formales (significant, however, therefore, benefit, crucial…).')
    if ttr < 0.45 and n > 40:
        notas.append('Repites muchas palabras: usa sinónimos.')
    total = p_largo + p_tarea + p_org + p_leng  # máximo 1 + 1.5 + 1 + 1.5 = 5
    if n < 20:
        total = min(total, 1.0)
    elif n < 45:
        total = min(total, 2.5)
    elif n < meta * 0.6:
        total = min(total, 3.0)
    elif n < meta * 0.8:
        total = min(total, 3.5)
    total = round(min(5.0, total) * 2) / 2
    return {'puntos': total, 'max': 5, 'palabras': n, 'conectores': usados, 'academico': acad, 'errores': errores,
            'desglose': {'desarrollo': round(p_largo, 2), 'tarea': round(p_tarea, 2), 'organizacion': round(p_org, 2),
                         'lenguaje': round(p_leng, 2)},
            'bien': bien, 'mejorar': notas,
            'corregido': IO.corregir(t)['texto'] if IO else t}


# ------------------------------------------------------------------ el profe
class Toefl:
    def __init__(self, carpeta=None):
        self.lock = threading.RLock()
        self.archivo = os.path.join(carpeta, 'toefl_progreso.json') if carpeta else None
        self.p = self._cargar()

    # -- progreso en disco
    def _vacio(self):
        return {'v': 1, 'intentos': [], 'vocab': {}, 'meta': {'banda': 0, 'fecha': ''}, 'racha': {'dia': '', 'n': 0}}

    def _cargar(self):
        if self.archivo and os.path.exists(self.archivo):
            try:
                with open(self.archivo, encoding='utf-8') as f:
                    d = json.load(f)
                base = self._vacio()
                base.update({k: v for k, v in d.items() if k in base})
                return base
            except Exception:
                pass
        return self._vacio()

    def _guardar(self):
        if not self.archivo:
            return
        tmp = self.archivo + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(self.p, f, ensure_ascii=False)
        os.replace(tmp, self.archivo)

    def _anota(self, tipo, pct, detalle=''):
        with self.lock:
            hoy = dt.date.today().isoformat()
            r = self.p['racha']
            if r.get('dia') != hoy:
                ayer = (dt.date.today() - dt.timedelta(days=1)).isoformat()
                r['n'] = r.get('n', 0) + 1 if r.get('dia') == ayer else 1
                r['dia'] = hoy
            self.p['intentos'].append({'t': int(time.time()), 'tipo': tipo, 'sec': SECCION_DE.get(tipo, ''), 'pct': round(pct, 1),
                                       'd': str(detalle)[:80]})
            self.p['intentos'] = self.p['intentos'][-800:]
            self._guardar()

    # -- prácticas
    def nueva(self, tipo, i=None, semilla=None):
        rnd = random.Random(semilla)
        if tipo not in TIPOS:
            raise ValueError('tipo: ' + ', '.join(TIPOS))
        banco = {'completar': B.PARRAFOS, 'ordenar': B.ORACIONES, 'lectura': B.LECTURAS, 'correo': B.CORREOS,
                 'discusion': B.DISCUSIONES, 'repetir': B.REPETIR, 'entrevista': B.ENTREVISTA, 'dictado': B.REPETIR}[tipo]
        if i is None:
            i = self._menos_practicado(tipo, len(banco), rnd)
        i = int(i) % len(banco)
        base = {'tipo': tipo, 'id': i, 'seccion': SECCION_DE[tipo]}
        if tipo == 'completar':
            titulo, texto = banco[i]
            partes, huecos = completar_palabras(texto)
            base.update(titulo=titulo, partes=partes, huecos=len(huecos), instrucciones=
                        'Complete the Words: escribe las letras que faltan en cada palabra (10 huecos).')
        elif tipo == 'ordenar':
            pista, oracion = banco[i]
            pedazos = pedazos_de(oracion)
            mezcla = pedazos[:]
            while mezcla == pedazos and len(pedazos) > 1:
                rnd.shuffle(mezcla)
            base.update(pista=pista, pedazos=mezcla, final=oracion[-1],
                        instrucciones='Build a Sentence: ordena los pedazos para formar una oración correcta.')
        elif tipo == 'lectura':
            clase, titulo, texto, preguntas = banco[i]
            base.update(clase=clase, titulo=titulo, texto=texto,
                        preguntas=[{'q': q, 'opciones': ops} for q, ops, _c, _p in preguntas],
                        instrucciones=('Read in Daily Life' if clase == 'vida diaria' else 'Read an Academic Passage') +
                        ': lee y contesta.')
        elif tipo == 'correo':
            situacion, puntos, _claves = banco[i]
            base.update(situacion=situacion, puntos=puntos, minutos=7, meta_palabras=80,
                        instrucciones='Write an Email: cumple las tres cosas. 7 minutos.')
        elif tipo == 'discusion':
            preg, a, b = banco[i]
            base.update(profesor=preg, alumnos=[{'nombre': a[0], 'texto': a[1]}, {'nombre': b[0], 'texto': b[1]}], minutos=10,
                        meta_palabras=100, instrucciones='Academic Discussion: aporta tu postura con razón y ejemplo. 10 minutos, 100+ palabras.')
        elif tipo in ('repetir', 'dictado'):
            base.update(oracion=banco[i] if tipo == 'repetir' else None, decir=banco[i],
                        instrucciones=('Listen and Repeat: escúchala y repítela (o escríbela) igualita.' if tipo == 'repetir'
                                       else 'Dictado: escúchala (sin verla) y escribe exactamente lo que oíste.'))
        elif tipo == 'entrevista':
            base.update(pregunta=banco[i], segundos=45, meta_palabras=90,
                        instrucciones='Take an Interview: contesta en ~45 segundos (habla y dicta, o escribe lo que dirías).')
        return base

    def _menos_practicado(self, tipo, n, rnd):
        hechos = {}
        for it in self.p['intentos']:
            if it['tipo'] == tipo:
                m = re.match(r'#(\d+)', it.get('d', ''))
                if m:
                    hechos[int(m.group(1))] = hechos.get(int(m.group(1)), 0) + 1
        minimo = min(hechos.get(k, 0) for k in range(n))
        return rnd.choice([k for k in range(n) if hechos.get(k, 0) == minimo])

    def calificar(self, tipo, i, respuesta):
        if tipo not in TIPOS:
            raise ValueError('tipo')
        i = int(i)
        r = {'tipo': tipo, 'id': i}
        if tipo == 'completar':
            titulo, texto = B.PARRAFOS[i % len(B.PARRAFOS)]
            _partes, huecos = completar_palabras(texto)
            resp = respuesta if isinstance(respuesta, list) else re.split(r'[,\s]+', str(respuesta or '').strip())
            detalle, ok = [], 0
            for k, (palabra, prefijo) in enumerate(huecos):
                dada = (resp[k] if k < len(resp) else '') or ''
                dada = dada.strip().lower()
                completa = dada if dada.startswith(prefijo.lower()) and len(dada) > len(prefijo) else prefijo.lower() + dada
                bien = completa == palabra.lower()
                ok += bien
                detalle.append({'palabra': palabra, 'diste': completa, 'bien': bien})
            pct = 100 * ok / max(1, len(huecos))
            r.update(aciertos=ok, total=len(huecos), detalle=detalle)
        elif tipo == 'ordenar':
            _pista, oracion = B.ORACIONES[i % len(B.ORACIONES)]
            dada = respuesta if isinstance(respuesta, str) else ' '.join(respuesta or [])
            bien = _norm(dada) == _norm(oracion)
            sim = difflib.SequenceMatcher(None, _norm(dada).split(), _norm(oracion).split()).ratio()
            pct = 100.0 if bien else 0.0
            r.update(bien=bien, correcta=oracion, parecido=round(sim * 100),
                     nota='' if bien else pista_orden(oracion))
        elif tipo == 'lectura':
            _c, _t, _x, preguntas = B.LECTURAS[i % len(B.LECTURAS)]
            resp = list(respuesta or [])
            detalle, ok = [], 0
            for k, (q, ops, c, porque) in enumerate(preguntas):
                dada = resp[k] if k < len(resp) else None
                try:
                    dada = int(dada)
                except (TypeError, ValueError):
                    dada = None
                ok += dada == c
                detalle.append({'q': q, 'bien': dada == c, 'correcta': c, 'texto_correcta': ops[c], 'porque': porque})
            pct = 100 * ok / len(preguntas)
            r.update(aciertos=ok, total=len(preguntas), detalle=detalle)
        elif tipo in ('correo', 'discusion', 'entrevista'):
            extra = {}
            if tipo == 'correo':
                _s, puntos, claves = B.CORREOS[i % len(B.CORREOS)]
                extra = {'puntos': puntos, 'claves': claves}
            elif tipo == 'discusion':
                _p, a, b = B.DISCUSIONES[i % len(B.DISCUSIONES)]
                extra = {'nombres': [a[0], b[0]]}
            ru = rubrica(str(respuesta or ''), tipo, extra)
            pct = 100 * ru['puntos'] / 5
            r.update(ru)
            r['plantilla'] = PLANTILLAS[tipo]
            r['aviso'] = 'Estimación por reglas (sin IA): sirve para practicar, no es la calificación de ETS.'
        else:  # repetir / dictado
            oracion = B.REPETIR[i % len(B.REPETIR)]
            a, b = _norm(oracion).split(), _norm(str(respuesta or '')).split()
            sm = difflib.SequenceMatcher(None, a, b)
            faltan, sobran = [], []
            for op, i1, i2, j1, j2 in sm.get_opcodes():
                if op in ('delete', 'replace'):
                    faltan += a[i1:i2]
                if op in ('insert', 'replace'):
                    sobran += b[j1:j2]
            pct = 100 * sm.ratio()
            r.update(correcta=oracion, parecido=round(pct), faltan=faltan, sobran=sobran)
        r['pct'] = round(pct, 1)
        r['banda'] = banda_de(pct)
        self._anota(tipo, pct, '#%d' % i)
        r['progreso'] = self.progreso(corto=True)
        return r

    # -- vocabulario con repaso espaciado (Leitner: cajas 1..5 = 0, 1, 3, 7, 16 días)
    def vocab_siguiente(self, n=10):
        hoy = dt.date.today()
        est = self.p['vocab']
        pendientes, nuevas = [], []
        for w, es, ej in _vocab():
            e = est.get(w)
            if e is None:
                nuevas.append((w, es, ej, 0))
            elif dt.date.fromisoformat(e['prox']) <= hoy:
                pendientes.append((w, es, ej, e['caja']))
        lista = pendientes[:n] + nuevas[:max(0, n - len(pendientes))]
        return {'tarjetas': [{'en': w, 'es': es, 'ejemplo': ej, 'caja': c} for w, es, ej, c in lista],
                'pendientes': len(pendientes), 'aprendidas': sum(1 for e in est.values() if e['caja'] >= 4),
                'vistas': len(est), 'total': len(_vocab())}

    def vocab_responder(self, palabra, bien):
        with self.lock:
            e = self.p['vocab'].get(palabra) or {'caja': 0}
            caja = min(5, e['caja'] + 1) if bien else 1
            dias = [0, 0, 1, 3, 7, 16][caja]
            self.p['vocab'][palabra] = {'caja': caja, 'prox': (dt.date.today() + dt.timedelta(days=dias)).isoformat()}
            self._guardar()
        self._anota('vocab', 100 if bien else 0, palabra)
        return self.p['vocab'][palabra]

    # -- progreso, nivel y plan
    def progreso(self, corto=False):
        secs = {}
        for s in ('reading', 'listening', 'writing', 'speaking'):
            ult = [x['pct'] for x in self.p['intentos'] if x['sec'] == s and x['tipo'] != 'vocab'][-12:]
            if ult:
                pct = sum(ult) / len(ult)
                secs[s] = {'banda': banda_de(pct), 'pct': round(pct), 'intentos': len(ult)}
            else:
                secs[s] = {'banda': None, 'pct': None, 'intentos': 0}
        con = [v['banda'] for v in secs.values() if v['banda']]
        total = round(sum(con) / len(con) * 2) / 2 if con else None
        r = {'secciones': secs, 'banda': total, 'cefr': cefr_de(total) if total else None,
             'racha': self.p['racha'].get('n', 0), 'practicas': len(self.p['intentos']), 'meta': self.p['meta']}
        if corto:
            return r
        debil = sorted((v['banda'] or 0, k) for k, v in secs.items())
        r['siguiente'] = [k for _b, k in debil[:2]]
        r['vocab'] = {k: v for k, v in self.vocab_siguiente(0).items() if k != 'tarjetas'}
        r['aviso'] = 'Estimación con tus prácticas de Capri (sin Listening real ni voz evaluada). Hazte un examen de práctica oficial para tu nivel real.'
        return r

    def poner_meta(self, banda=None, fecha=None):
        with self.lock:
            if banda:
                self.p['meta']['banda'] = max(1.0, min(6.0, round(float(banda) * 2) / 2))
            if fecha:
                dt.date.fromisoformat(fecha)
                self.p['meta']['fecha'] = fecha
            self._guardar()
        return self.p['meta']

    def plan(self, hoy=None):
        hoy = hoy or dt.date.today()
        prog = self.progreso()
        meta = self.p['meta']
        dias = None
        if meta.get('fecha'):
            dias = (dt.date.fromisoformat(meta['fecha']) - hoy).days
        debil = prog['siguiente'] or ['writing', 'reading']
        semanas = max(1, min(12, (dias or 28) // 7))
        bloques = []
        for s in range(semanas):
            foco = debil[s % len(debil)]
            ultimas = dias is not None and s >= semanas - 1
            bloques.append({
                'semana': s + 1, 'foco': foco,
                'diario': ['10 tarjetas de vocabulario', '2 Build a Sentence', '1 Complete the Words'] +
                          ({'writing': ['1 Email o 1 Academic Discussion con tiempo'], 'reading': ['1 lectura (diaria o académica)'],
                            'speaking': ['5 Listen and Repeat', '2 preguntas de Interview en voz alta'],
                            'listening': ['5 dictados', '15 min de podcast o video en inglés con subtítulos en inglés']}[foco]),
                'fin_de_semana': 'Simulacro: una práctica de cada tipo seguida, con tiempo.' if not ultimas else
                                 'Semana del examen: repasa plantillas y vocabulario, duerme bien, nada nuevo.'})
        return {'dias_al_examen': dias, 'meta': meta, 'nivel': prog['banda'], 'cefr': prog['cefr'], 'semanas': bloques}

    # -- preguntas sobre el examen (desde el chat)
    def responder(self, texto):
        """Si es una pregunta de TOEFL o una orden de práctica, regresa {'respuesta', 'accion'}; si no, None."""
        low = ' ' + (texto or '').lower().strip() + ' '
        if not re.search(r'toefl|t\.o\.e\.f\.l|tofel|toelf|tolf|academic discussion|build a sentence|complete the words|'
                         r'listen and repeat|take an interview|write an email|mi nivel|my level|plan de estudio|study plan|'
                         r'(practica|practice|pr[aá]ctica)\b', low):
            return None
        def r(txt, accion=''):
            return {'respuesta': txt, 'accion': accion}
        if re.search(r'\b(practic|pr[aá]ctica|quiz|ejercicio)', low):
            for clave, tipo in (('email|correo', 'correo'), ('discussion|discusi', 'discusion'), ('build|ordenar|oraci', 'ordenar'),
                                ('complete|completar', 'completar'), ('read|lectura|leer', 'lectura'), ('repeat|repetir', 'repetir'),
                                ('interview|entrevista', 'entrevista'), ('dictad|listening|escuchar', 'dictado'), ('vocab', 'vocab')):
                if re.search(clave, low):
                    return r('Va, abre la pestaña INGLÉS y te pongo una de «%s».' % tipo, 'practicar:' + tipo)
            return r('Va. Te abro la pestaña INGLÉS para practicar. ¿Empezamos por tu sección más floja?', 'practicar:')
        if re.search(r'mi nivel|my level|c[oó]mo voy|progreso|progress', low):
            p = self.progreso()
            if not p['banda']:
                return r('Todavía no tengo con qué medirte. Haz unas prácticas en la pestaña INGLÉS y te digo tu banda.', 'abrir')
            s = p['secciones']
            return r('Vas en banda %s (%s), estimada con %d prácticas.\n%s\nTe conviene meterle a: %s.' % (
                p['banda'], p['cefr'], p['practicas'],
                '\n'.join('  · %s: %s' % (k.capitalize(), v['banda'] or 'sin datos') for k, v in s.items()),
                ', '.join(p['siguiente'])), 'abrir')
        if re.search(r'\bplan\b|\bschedule\b', low):
            pl = self.plan()
            sem = pl['semanas'][0]
            return r('Plan para esta semana (foco: %s):\n  · %s\n  · %s\nEn la pestaña INGLÉS ves el plan completo%s.' % (
                sem['foco'], '\n  · '.join(sem['diario']), sem['fin_de_semana'],
                ' hasta tu examen (%d días)' % pl['dias_al_examen'] if pl['dias_al_examen'] is not None else
                '; pon la fecha de tu examen para ajustarlo'), 'abrir')
        for clave, tipo in (('academic discussion|discusi', 'discusion'), ('email|correo', 'correo'), ('interview|entrevista', 'entrevista')):
            if re.search(clave, low) and re.search(r'plantilla|template|estructura|structure|c[oó]mo (se )?(hace|respond|contest|escrib)|how (to|do)|tips?|consejo', low):
                sec = 'speaking' if tipo == 'entrevista' else 'writing'
                return r('Plantilla para %s:\n%s\n\nTips:\n  · %s' % (tipo, PLANTILLAS[tipo], '\n  · '.join(ESTRATEGIAS[sec])))
        for s in ('reading', 'listening', 'writing', 'speaking'):
            if s in low or {'reading': 'lectura', 'listening': 'escucha', 'writing': 'escritura', 'speaking': 'habla'}[s] in low:
                sec = next(x for x in EXAMEN['secciones'] if x['id'] == s)
                return r('%s del TOEFL iBT:\n%s\n\nEstrategias:\n  · %s' % (
                    sec['nombre'], '\n'.join('  · %s: %s' % (n, d) for n, _t, d in sec['tareas']), '\n  · '.join(ESTRATEGIAS[s])))
        if re.search(r'puntaje|puntuaci|score|calific|banda|band|cefr|120|cu[aá]nto (necesito|saco)', low):
            return r('%s\nEquivalencia aproximada: 6 = C2 · 5–5.5 = C1 · 4–4.5 = B2 · 3–3.5 = B1 · 2–2.5 = A2 · 1–1.5 = A1.\n'
                     'Muchas universidades piden B2–C1; revisa lo que pide la tuya.\n(%s)' % (EXAMEN['puntaje'], EXAMEN['aviso']))
        if re.search(r'cu[aá]nto dura|duraci|how long|tiempo', low):
            return r('El TOEFL iBT de 2026 es más corto que el anterior; Reading y Listening se adaptan a tu nivel. '
                     'Los tiempos exactos por sección los publica ETS y los puede ajustar: confírmalos en ets.org/toefl. '
                     'En mis prácticas uso 7 min para el Email y 10 min para Academic Discussion.')
        # por defecto: el examen completo
        txt = ['TOEFL iBT (%s):' % EXAMEN['vigente']]
        for sec in EXAMEN['secciones']:
            txt.append('■ %s: %s' % (sec['nombre'], ', '.join(n for n, _t, _d in sec['tareas'])))
        txt += [EXAMEN['puntaje'], EXAMEN['adaptativo'], '(' + EXAMEN['aviso'] + ')',
                'Pregúntame «toefl writing», «plantilla academic discussion», «mi nivel», «plan de estudio» o abre la pestaña INGLÉS para practicar.']
        return r('\n'.join(txt))


# ------------------------------------------------------------------ generadores
def completar_palabras(texto, maximo=10):
    """Complete the Words: desde la 2ª oración, a cada segunda palabra (de 3+ letras) le quita la segunda mitad.
    Regresa (partes, huecos): partes = lista de str o {'prefijo', 'faltan'}; huecos = [(palabra, prefijo)]."""
    oraciones = re.split(r'(?<=[.!?])\s+', texto.strip())
    partes, huecos = [oraciones[0] + ' '], []
    resto = ' '.join(oraciones[1:])
    tokens = re.findall(r"[A-Za-z]+|[^A-Za-z]+", resto)
    cuenta = 0
    for t in tokens:
        if re.fullmatch(r'[A-Za-z]+', t) and len(huecos) < maximo:
            cuenta += 1
            if cuenta % 2 == 0 and len(t) >= 3:
                corte = len(t) // 2
                huecos.append((t, t[:corte]))
                partes.append({'prefijo': t[:corte], 'faltan': len(t) - corte})
                continue
        if partes and isinstance(partes[-1], str):
            partes[-1] += t
        else:
            partes.append(t)
    return partes, huecos


def pedazos_de(oracion):
    """Build a Sentence: parte la oración en pedazos de 1–2 palabras (como en el examen), sin el punto final."""
    ws = oracion[:-1].split() if oracion[-1] in '.?!' else oracion.split()
    pedazos, i = [], 0
    juntar = {'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'by', 'my', 'your', 'our', 'their', 'this', 'that'}
    while i < len(ws):
        if ws[i].lower() in juntar and i + 1 < len(ws):
            pedazos.append(ws[i] + ' ' + ws[i + 1])
            i += 2
        else:
            pedazos.append(ws[i])
            i += 1
    return pedazos


def pista_orden(oracion):
    low = oracion.lower()
    if re.search(r'\b(where|what|when|if|whether|how)\b', low) and re.search(r'\b(tell me|know|wondering|asked|find out|remember|explain)\b', low):
        return 'Pregunta indirecta: después de «where/what/if…» va sujeto + verbo, sin invertir (where the library IS).'
    if oracion.endswith('?'):
        return 'Es pregunta: el auxiliar (do/did/can/have) va antes del sujeto.'
    return 'Busca primero el sujeto y su verbo; luego los complementos (qué, dónde, cuándo).'


def main(argv=None):
    import sys
    argv = sys.argv[1:] if argv is None else argv
    t = Toefl(None)
    if argv and argv[0] in TIPOS:
        print(json.dumps(t.nueva(argv[0]), ensure_ascii=False, indent=1))
        return 0
    r = t.responder(' '.join(argv) or 'toefl')
    print(r['respuesta'] if r else '(no es pregunta de TOEFL)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
