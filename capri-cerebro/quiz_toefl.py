#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Resolver de quizzes de inglés / TOEFL sin IA (cerebro de Capri).

Le pegas una pregunta de opción múltiple (o varias) como las de tus clases y quizzes:

    She ___ to school every day.
    a) go   b) goes   c) going   d) gone

y te dice qué inciso es el correcto, POR QUÉ, y por qué cada una de las otras está mal.

Cómo lo hace (sin IA): mete cada opción en el hueco, revisa la oración con ~90 reglas de gramática del inglés (las
que más salen en TOEFL ITP/iBT y en quizzes de clase) y se queda con la opción que no rompe ninguna. Solo cuenta
los errores que distinguen a las opciones, y de ahí salen las explicaciones.

También entiende:
  - «Which sentence is correct?» con oraciones completas como opciones,
  - «find the error / incorrect» (la opción subrayada que está mal),
  - vocabulario «closest in meaning to X» (sinónimos de su lista),
  - preguntas de lectura si pegas también el texto (modo pista: por coincidencias con el texto, confianza baja).

Límites honestos: si la pregunta depende del sentido, del contexto de una plática o de un tema que sus reglas no
cubren, lo dice («no estoy segura») en vez de inventar. Solo biblioteca estándar.
"""
import re

try:
    import ingles_offline as IO
except ImportError:  # pragma: no cover
    IO = None

VERSION = '1.0.0'

# ------------------------------------------------------------------ morfología
IRREG = """be was been|have had had|do did done|go went gone|come came come|get got gotten|give gave given|take took taken
make made made|say said said|see saw seen|know knew known|think thought thought|tell told told|find found found
leave left left|feel felt felt|bring brought brought|buy bought bought|begin began begun|keep kept kept|hold held held
write wrote written|stand stood stood|hear heard heard|let let let|mean meant meant|set set set|meet met met|run ran run
pay paid paid|sit sat sat|speak spoke spoken|lead led led|read read read|grow grew grown|lose lost lost|fall fell fallen
send sent sent|build built built|understand understood understood|draw drew drawn|break broke broken|spend spent spent
cut cut cut|rise rose risen|drive drove driven|wear wore worn|choose chose chosen|eat ate eaten|drink drank drunk
swim swam swum|sing sang sung|ring rang rung|fly flew flown|forget forgot forgotten|forgive forgave forgiven
freeze froze frozen|hide hid hidden|ride rode ridden|shake shook shaken|steal stole stolen|throw threw thrown
wake woke woken|win won won|teach taught taught|catch caught caught|fight fought fought|seek sought sought|sell sold sold
sleep slept slept|shoot shot shot|shut shut shut|put put put|hit hit hit|hurt hurt hurt|cost cost cost|quit quit quit
spread spread spread|bite bit bitten|blow blew blown|feed fed fed|hang hung hung|strike struck struck|tear tore torn
beat beat beaten|become became become|bend bent bent|deal dealt dealt|dig dug dug|flee fled fled|forbid forbade forbidden
lay laid laid|lend lent lent|show showed shown|sink sank sunk|stick stuck stuck|undergo underwent undergone
withdraw withdrew withdrawn|arise arose arisen|lie lay lain|wind wound wound|bear bore born|overcome overcame overcome
swear swore sworn|weep wept wept|light lit lit|prove proved proven|shine shone shone|split split split|bet bet bet"""
BASE_DE, PAST_DE, PP_DE = {}, {}, {}
for _l in IRREG.replace('\n', '|').split('|'):
    _b, _p, _pp = _l.split()
    PAST_DE[_b], PP_DE[_b] = _p, _pp
    BASE_DE.setdefault(_p, _b)
    BASE_DE.setdefault(_pp, _b)
VERBOS_EXTRA = set("""want need like love hate work play study live visit watch listen talk walk finish start stop open close
help ask answer call clean cook travel arrive decide plan try use change move improve learn practice prefer enjoy avoid
suggest consider deny admit mind miss recommend agree refuse promise hope expect afford manage offer seem appear happen
explain describe discuss develop increase reduce require provide include involve allow continue complete create produce
protect prepare compare contain depend believe remember wait stay return receive reach rely complain apologize insist
succeed participate focus graduate attend apply accept arrange attempt deserve fail intend pretend threaten volunteer wish
dislike delay postpone practise resist risk tolerate imagine regret appreciate encourage invite order persuade remind warn
advise permit look turn rain snow dance smile laugh cry jump climb paint print type save solve share check fix wash
fill join kill land last laugh like marry name need notice obey own pass pick pull push rain relax repeat rest rush shop
shout sign smell sound taste test thank touch train trust visit vote wonder worry yell borrow lend belong cause collect
cover cross damage deliver design destroy discover earn enter exist finish follow gather guess identify ignore inform
invent join kick knock lift listen measure mention mix obtain occur paint perform pray predict prefer pronounce publish
raise realize recognize record reduce reflect refer reject release remain remove rent repair replace reply report rescue
respond review rob roll satisfy seat select serve settle shape shout ski solve spell stare stay steal stretch submit
suffer supply support suppose surprise survive suspect switch talk tend thank tie travel treat try underline unite
update vary wander wave weigh whisper wish wonder work wrap yawn smoke cook bake smile hope jog shop chat text email
phone kiss hug hurry marry carry copy cry dry fry worry study""".split())
MODALES = {'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must'}
BE = {'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'}
SUJ = {'i': 1, 'you': 2, 'we': 2, 'they': 2, 'he': 3, 'she': 3, 'it': 3}
SUJ_SING3 = {'he', 'she', 'it', 'everyone', 'everybody', 'someone', 'somebody', 'nobody', 'no one', 'anyone', 'anybody',
             'each', 'everything', 'nothing', 'something', 'this', 'that'}
ADV_FREC = r'(?:always|usually|often|sometimes|never|rarely|seldom|also|really|still|just|already|hardly|generally|frequently|normally|even)'
ESTATIVOS = {'know', 'like', 'love', 'hate', 'want', 'need', 'believe', 'understand', 'belong', 'seem', 'prefer', 'own',
             'mean', 'remember', 'forget', 'contain', 'consist', 'depend', 'deserve', 'exist', 'matter', 'possess', 'recognize', 'suppose'}
INCONTABLES = {'information', 'advice', 'furniture', 'money', 'water', 'news', 'homework', 'equipment', 'knowledge',
               'research', 'luggage', 'baggage', 'traffic', 'weather', 'bread', 'rice', 'music', 'evidence', 'progress',
               'work', 'time', 'sugar', 'milk', 'coffee', 'help', 'fun', 'patience', 'courage', 'vocabulary', 'grammar',
               'pollution', 'electricity', 'air', 'food', 'love', 'happiness', 'education', 'health', 'software', 'feedback'}
PLURAL_IRREG = {'people', 'children', 'men', 'women', 'feet', 'teeth', 'mice', 'police', 'cattle', 'data', 'criteria', 'phenomena'}
VOCAL_CONSONANTE = {'university', 'uniform', 'unique', 'useful', 'user', 'union', 'unit', 'european', 'one', 'once', 'usual',
                    'usually', 'eulogy', 'euro', 'utensil', 'unicorn', 'universe', 'use', 'used', 'usb', 'ufo'}
CONSONANTE_VOCAL = {'hour', 'hours', 'honest', 'honor', 'honour', 'heir', 'herb', 'mba', 'fbi', 'x-ray', 'sos', 'mp3', 'hourly'}
SOLO_ING = {'enjoy', 'avoid', 'finish', 'mind', 'suggest', 'consider', 'deny', 'admit', 'miss', 'recommend', 'keep',
            'practice', 'practise', 'quit', 'postpone', 'delay', 'imagine', 'risk', 'resist', 'appreciate', 'dislike',
            'tolerate', 'involve', 'mention', 'regret', "can't help", 'give up', 'carry on', 'go on', 'put off', 'feel like'}
SOLO_TO = {'want', 'decide', 'plan', 'hope', 'agree', 'refuse', 'promise', 'need', 'learn', 'expect', 'afford', 'manage',
           'offer', 'seem', 'appear', 'pretend', 'threaten', 'deserve', 'fail', 'intend', 'tend', 'wish', 'choose', 'arrange',
           'attempt', 'volunteer', 'would like', 'would love', 'ask', 'prepare', 'claim', 'demand', 'hesitate'}
OBJ_TO = {'want', 'ask', 'tell', 'allow', 'advise', 'encourage', 'invite', 'remind', 'warn', 'expect', 'need', 'teach',
          'persuade', 'force', 'order', 'permit', 'require', 'enable', 'get'}
CAUSATIVOS = {'make', 'let', 'have', 'help', 'watch', 'see', 'hear'}
TO_ING = r'(?:look(?:s|ed|ing)? forward to|(?:am|is|are|was|were|be|been|get|got|getting) used to|object(?:s|ed)? to|' \
         r'(?:is|are|was|were) committed to|(?:is|are|was|were) devoted to|admit(?:s|ted)? to|in addition to|' \
         r'(?:is|are|was|were) accustomed to|the key to|when it comes to|opposed to|with a view to|confess(?:es|ed)? to)'
PREPS_ING = r'(?:in|on|at|of|for|about|without|before|after|by|instead of|besides|despite|in spite of|from|against|upon|through)'
DIAS = r'(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekdays?|weekends?|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?|my birthday|christmas day|new year\'s day)'
MESES = r'(?:january|february|march|april|june|july|august|september|october|november|december|spring|summer|fall|autumn|winter|\d{4}|the (?:morning|afternoon|evening)|the \d{2,4}s|the (?:\w+) century)'
HORAS = r'(?:\d{1,2}(?::\d{2})?\s*(?:o\'clock|a\.?m\.?|p\.?m\.?)|noon|midnight|night|dawn|sunset|sunrise|the moment|present|the end of|the beginning of|lunchtime|dinnertime|bedtime)'
PASADO_MARCAS = r'\b(?:yesterday|last (?:night|week|month|year|summer|winter|spring|fall|monday|tuesday|wednesday|thursday|friday|saturday|sunday|time)|\w+ (?:days?|weeks?|months?|years?|hours?|minutes?) ago|ago\b|in (?:19|20)[0-2]\d\b(?! years)|when (?:i|he|she|we|they|you) (?:was|were) (?:a )?(?:child|kid|young|little|younger)|the other day|in the past|once upon a time)'
FUTURO_MARCAS = r'\b(?:tomorrow|next (?:week|month|year|summer|monday|tuesday|wednesday|thursday|friday|saturday|sunday|time)|in the future|soon\b|tonight|in \d+ (?:days|weeks|months|years)|in (?:a|two|three|few) (?:days|weeks|months|years))'
AHORA_MARCAS = r'\b(?:right now|at the moment|at present|currently|now\b(?! that)|look!|listen!|these days|this (?:week|month|semester) (?!ago))'
HABITO_MARCAS = r'\b(?:every (?:day|morning|night|week|month|year|summer|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|usually|always|often|sometimes|never|rarely|seldom|on (?:mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays|weekends)|once a (?:day|week|month|year)|twice a (?:day|week|month))'


def base_de(w):
    """go/goes/went/gone/going -> go (o None si no parece verbo)."""
    w = w.lower()
    if w in BE:
        return 'be'
    if w in ('has', 'had', 'having'):
        return 'have'
    if w in ('does', 'did', 'doing', 'done'):
        return 'do'
    if w in BASE_DE:
        return BASE_DE[w]
    if w in PAST_DE or w in VERBOS_EXTRA or _en_dic(w):
        return w
    cand = []
    if w.endswith('ing') and len(w) > 4:
        r = w[:-3]
        cand += [r, r + 'e'] + ([r[:-1]] if len(r) > 2 and r[-1] == r[-2] else []) + ([r[:-1] + 'ie'] if r.endswith('y') else [])
    if w.endswith('ied'):
        cand.append(w[:-3] + 'y')
    if w.endswith('ed') and len(w) > 3:
        r = w[:-2]
        cand += [r, w[:-1]] + ([r[:-1]] if len(r) > 2 and r[-1] == r[-2] else [])
    if w.endswith('ies'):
        cand.append(w[:-3] + 'y')
    if w.endswith('es'):
        cand.append(w[:-2])
    if w.endswith('s') and not w.endswith('ss'):
        cand.append(w[:-1])
    for c in cand:
        if c in PAST_DE or c in VERBOS_EXTRA or _en_dic(c):
            return c
    return None


_DIC = None


def _en_dic(w):
    global _DIC
    if IO is None:
        return False
    if _DIC is None:
        _DIC = IO.Diccionario(None)
    return w in _DIC.verb


def es_sustantivo(w):
    w = w.lower()
    if w in INCONTABLES or w in PLURAL_IRREG:
        return True
    if IO is not None:
        global _DIC
        if _DIC is None:
            _DIC = IO.Diccionario(None)
        if _DIC.sustantivo(w):
            return True
    return bool(re.search(r'(tion|sion|ment|ness|ity|ance|ence|ship|ism|hood|ist|ure|ics)s?$', w)) and len(w) > 5


def formas(w):
    """Etiquetas posibles de una palabra: base, s3, past, pp, ing, modal, be…"""
    w = w.lower()
    t = set()
    if w in MODALES:
        return {'modal'}
    if w in BE:
        t.add('be')
        t.add({'am': 'pres', 'is': 's3', 'are': 'pres', 'was': 'past', 'were': 'past', 'be': 'base', 'been': 'pp', 'being': 'ing'}[w])
        return t
    b = base_de(w)
    if not b:
        if w.endswith('ing') and len(w) > 4:
            return {'ing'}
        return t
    if w == b:
        t.add('base')
    if b in PAST_DE:
        if w == PAST_DE[b]:
            t.add('past')
        if w == PP_DE[b]:
            t.add('pp')
    elif w != b and w.endswith('ed'):
        t |= {'past', 'pp'}
    if w != b and (w.endswith('s') and not w.endswith('ss')) and w not in PAST_DE.values():
        t.add('s3')
    if w in ('has', 'does'):
        t.add('s3')
    if w.endswith('ing') and w != b:
        t.add('ing')
    return t


def describe(w):
    """Para explicar: qué forma es la opción («went: pasado de go»)."""
    ws = w.strip().split()
    if len(ws) != 1:
        return ''
    w = ws[0].lower().strip('.,!?')
    f = formas(w)
    b = base_de(w) or w
    if 'modal' in f:
        return '«%s» es un verbo modal (va con verbo en forma base)' % w
    partes = []
    if 'base' in f:
        partes.append('forma base de «%s»' % b)
    if 's3' in f:
        partes.append('presente con he/she/it de «%s»' % b)
    if 'past' in f and 'pp' in f:
        partes.append('pasado y participio de «%s»' % b)
    elif 'past' in f:
        partes.append('pasado simple de «%s»' % b)
    elif 'pp' in f:
        partes.append('participio de «%s» (va con have/has/had o con be en voz pasiva)' % b)
    if 'ing' in f:
        partes.append('forma -ing de «%s»' % b)
    if w == 'pres':
        partes.append('presente')
    if not partes:
        if re.search(r'ly$', w) and len(w) > 4:
            return '«%s» es adverbio (dice cómo se hace algo)' % w
        if re.search(r'(ive|ous|ful|less|able|ible|al|ic|ent|ant|ish|y)$', w) and len(w) > 4 and not es_sustantivo(w):
            return '«%s» parece adjetivo' % w
        if es_sustantivo(w):
            return '«%s» es sustantivo' % w
        return ''
    return '«%s»: %s' % (w, ', '.join(partes))


def tipo_palabra(w):
    w = w.lower()
    if w in MODALES or formas(w) & {'base', 's3', 'past', 'pp', 'ing'}:
        if not es_sustantivo(w):
            return 'verbo'
    if re.search(r'ly$', w) and len(w) > 4 and w not in ('family', 'only', 'early', 'friendly', 'lovely', 'likely', 'daily', 'ugly', 'lonely', 'silly', 'holy', 'elderly', 'costly'):
        return 'adverbio'
    if es_sustantivo(w):
        return 'sustantivo'
    if re.search(r'(ive|ous|ful|less|able|ible|al|ic|ent|ant|ish|ary|ory)$', w) and len(w) > 4:
        return 'adjetivo'
    if IO is not None and _DIC is not None and w in _DIC.adj:
        return 'adjetivo'
    return ''


# ------------------------------------------------------------------ reglas
def _v(code, mal, regla, span='', peso=1.0):
    return {'c': code, 'mal': mal, 'regla': regla, 'span': span, 'peso': peso}


def revisar(oracion):
    """Todas las reglas sobre una oración. Regresa la lista de problemas (cada uno con explicación y regla)."""
    s = ' ' + re.sub(r'\s+', ' ', oracion.strip()) + ' '
    low = s.lower().replace('’', "'")
    low = re.sub(r"\b(\w+)n't\b", lambda m: {'won': 'will', 'can': 'can', 'shan': 'shall'}.get(m.group(1), m.group(1)) + ' not', low)
    low = low.replace("i'm", 'i am').replace("'re ", ' are ').replace("let's", 'let us')
    low = re.sub(r"\b(he|she|it|that|what|there|who)'s\b", r'\1 is', low)
    low = re.sub(r"\b(i|you|we|they)'ve\b", r'\1 have', low)
    low = re.sub(r"\b(i|you|we|they|he|she|it)'ll\b", r'\1 will', low)
    low = re.sub(r"\b(i|you|we|they|he|she|it)'d\b", r'\1 would', low)
    P = []
    add = P.append
    # --- modales y auxiliares + forma base
    for m in re.finditer(r'\b(can|could|will|would|shall|should|may|might|must|do|does|did)\s+(?:not\s+)?(?:(i|you|he|she|it|we|they|the \w+|\w+)\s+)?(\w+)\b', low):
        aux, suj, v = m.group(1), m.group(2), m.group(3)
        if suj and (suj not in SUJ and not suj.startswith('the ')):
            # «can go» (sin sujeto en medio): el que cuenta es suj
            v = suj
        f = formas(v)
        if v in ('not', 'to', 'you', 'i', 'he', 'she', 'it', 'we', 'they') or not f or 'base' in f:
            if v == 'to' and aux in MODALES and aux not in ('ought',):
                add(_v('modal_to', '«%s to»: después de un modal no va «to»' % aux, 'Modal (can, should, must, will…) + verbo en forma base, sin «to».', m.group(0)))
            continue
        if f & {'s3', 'past', 'pp', 'ing'} and 'base' not in f:
            quien = 'un modal' if aux in MODALES else '«%s»' % aux
            add(_v('aux_base', 'después de %s el verbo va en forma base («%s», no «%s»)' % (quien, base_de(v) or v, v),
                   'Modal (can, will, should…) o do/does/did + verbo en forma base.', m.group(0)))
    # --- have/has/had + participio
    for m in re.finditer(r'\b(have|has|had)\s+(?:not\s+|never\s+|already\s+|just\s+|ever\s+|recently\s+|always\s+)?(\w+)\b', low):
        v = m.group(2)
        f = formas(v)
        if v in ('to', 'got', 'been', 'a', 'an', 'the', 'no', 'some', 'any', 'my', 'your', 'his', 'her', 'their', 'our', 'many', 'much', 'lots', 'fun', 'breakfast', 'lunch', 'dinner'):
            continue
        if f and 'pp' not in f and f & {'base', 'past', 'ing', 's3'} and not es_sustantivo(v):
            b = base_de(v)
            add(_v('perf_pp', '«%s %s»: con have/has/had va el participio («%s %s»)' % (m.group(1), v, m.group(1), PP_DE.get(b, (b or v) + 'ed')),
                   'Presente/pasado perfecto = have/has/had + participio (gone, written, seen, worked…).', m.group(0)))
    # --- be + base / be + pasado (en vez de participio o -ing)
    for m in re.finditer(r'\b(am|is|are|was|were|be|been|being)\s+(?:not\s+|being\s+|also\s+|always\s+|still\s+|just\s+)?(\w+)\b', low):
        v = m.group(2)
        f = formas(v)
        if not f or v in ('going', 'able', 'used', 'about', 'to') or es_sustantivo(v) or 'pp' in f or 'ing' in f:
            continue
        if 'base' in f and v not in ('be',) and tipo_palabra(v) == 'verbo':
            b = v
            add(_v('be_base', '«%s %s» no existe: o «%s %s» (pasiva) o «%s %s» (continuo)' % (m.group(1), v, m.group(1), PP_DE.get(b, b + ('d' if b.endswith('e') else 'ed')), m.group(1), _ing(b)),
                   'Be + participio (voz pasiva) o be + -ing (tiempo continuo); nunca be + verbo base.', m.group(0)))
        elif 'past' in f and 'pp' not in f:
            b = base_de(v)
            add(_v('be_past', '«%s %s»: en voz pasiva va el participio («%s %s»)' % (m.group(1), v, m.group(1), PP_DE.get(b, v)),
                   'Voz pasiva = be + participio (was written, not was wrote).', m.group(0)))
    # --- -ing o participio solos como verbo (sin be / have)
    for m in re.finditer(r'\b(i|you|he|she|it|we|they)\s+(?:' + ADV_FREC + r'\s+)?(\w+)\b', low):
        v = m.group(2)
        f = formas(v)
        if 'ing' in f and 'base' not in f:
            add(_v('ing_solo', '«%s %s»: la forma -ing sola no es verbo, le falta am/is/are (o was/were)' % (m.group(1), v),
                   'Tiempo continuo = be + -ing (she is going).', m.group(0)))
        elif 'pp' in f and 'past' not in f and 'base' not in f:
            add(_v('pp_solo', '«%s %s»: «%s» es participio; solo no funciona, necesita have/has (o usa el pasado «%s»)' % (m.group(1), v, v, PAST_DE.get(base_de(v) or '', '?')),
                   'El participio (gone, seen, written) va con have/has/had o con be; el pasado simple es otra forma (went, saw, wrote).', m.group(0)))
    # --- to + verbo
    for m in re.finditer(r'(\b\w+\s+)?\bto\s+(\w+)\b', low):
        v = m.group(2)
        antes = low[max(0, m.start() - 30):m.start() + len(m.group(1) or '') + 3]
        es_to_ing = re.search(TO_ING + r'\s*$', low[:m.start() + len(m.group(1) or '') + 2].rstrip() + ' to'[:0]) or re.search(TO_ING + r'$', low[:m.end() - len(v)].strip())
        f = formas(v)
        if es_to_ing:
            if 'base' in f and 'ing' not in f and tipo_palabra(v) == 'verbo':
                add(_v('to_ing', 'en «…%s %s» el «to» es preposición: va -ing («%s»)' % (low[m.start():m.end() - len(v)].strip(), v, _ing(v)),
                       'Look forward to / be used to / object to + -ing (I look forward to seeing you).', m.group(0)))
            continue
        if f & {'s3', 'past', 'ing'} and 'base' not in f and not es_sustantivo(v) and v not in ('being', 'everything', 'something', 'nothing', 'morning', 'evening', 'building', 'meeting', 'wedding', 'ceiling', 'beginning', 'ending', 'feeling', 'painting', 'reading', 'writing', 'shopping', 'swimming', 'clothing', 'spring', 'king', 'thing', 'sing', 'bring', 'string'):
            if re.search(r'\b(went|go|goes|going|come|came|walk|walked|drive|drove|listen|talk|due|according|next|close|similar|from)\s*$', antes.split(' to')[0]):
                continue
            add(_v('to_base', '«to %s»: después de «to» (infinitivo) va la forma base («to %s»)' % (v, base_de(v) or v),
                   'Infinitivo = to + verbo en forma base (to go, to study).', m.group(0)))
    # --- verbos que piden -ing o to
    for m in re.finditer(r'\b(\w+(?: \w+)?)\s+(?:(me|you|him|her|us|them|it)\s+)?(to\s+\w+|\w+ing)\b', low):
        frase, obj, sig = m.group(1), m.group(2), m.group(3)
        palabras = frase.split()
        verbo = palabras[-1]
        b2 = ' '.join(palabras[-2:]) if len(palabras) > 1 else ''
        b = base_de(verbo) or verbo
        lemma2 = (base_de(palabras[-2]) or palabras[-2]) + ' ' + verbo if len(palabras) > 1 else ''
        if b2 in ('would like', 'would love', 'would prefer'):
            lemma = b2
        elif lemma2 in SOLO_ING or b2 in SOLO_ING:
            lemma = lemma2 if lemma2 in SOLO_ING else b2
        else:
            lemma = b
        if sig.startswith('to '):
            v2 = sig[3:]
            if lemma in SOLO_ING and not obj:
                add(_v('ger_to', '«%s» va con -ing, no con «to» («%s %s»)' % (lemma, verbo, _ing(base_de(v2) or v2)),
                       'Enjoy, avoid, finish, mind, suggest, consider, keep, practice, miss, deny, admit, quit, postpone, recommend + -ing.', m.group(0)))
            if lemma in CAUSATIVOS - {'help', 'have', 'get'} and obj:
                add(_v('caus_to', '«%s %s to…»: con make/let el verbo va sin «to» («%s %s %s»)' % (verbo, obj, verbo, obj, base_de(v2) or v2),
                       'Make / let + persona + verbo base (they made me wait; let him go).', m.group(0)))
        else:
            if sig in ('morning', 'evening', 'thing', 'nothing', 'something', 'everything', 'anything', 'king', 'ring', 'spring', 'during', 'building', 'meeting'):
                continue
            if lemma in SOLO_TO and lemma not in SOLO_ING:
                add(_v('to_ger', '«%s» va con «to» + verbo («%s to %s»)' % (lemma, verbo, base_de(sig) or sig),
                       'Want, decide, plan, hope, agree, refuse, promise, need, learn, expect, afford, manage, offer, would like + to + verbo.', m.group(0)))
            if lemma in ('make', 'let') and obj:
                add(_v('caus_ing', 'con «%s %s» va el verbo en forma base («%s %s %s»)' % (verbo, obj, verbo, obj, base_de(sig) or sig),
                       'Make / let + persona + verbo base.', m.group(0)))
    for m in re.finditer(r'\b(used to)\s+(\w+)\b', low):
        if re.search(r'\b(am|is|are|was|were|be|been|get|got|getting)\s+used to', low[max(0, m.start() - 12):m.end()]):
            continue
        v = m.group(2)
        if 'ing' in formas(v) and 'base' not in formas(v):
            add(_v('usedto', '«used to» (antes, ya no) va con forma base («used to %s»)' % base_de(v), 'Used to + base = hábito pasado; be used to + -ing = estar acostumbrado.', m.group(0)))
    for m in re.finditer(r'\b(would rather|had better|let us|why not)\s+(to\s+)?(\w+)\b', low):
        if m.group(2) or (formas(m.group(3)) & {'ing', 's3', 'past'} and 'base' not in formas(m.group(3))):
            add(_v('rather', '«%s» va con verbo en forma base, sin «to»' % m.group(1), 'Would rather / had better / let\'s + verbo base.', m.group(0)))
    # --- preposición + verbo -> -ing
    for m in re.finditer(r'\b' + PREPS_ING + r'\s+(\w+)\b', low):
        v = m.group(1)
        f = formas(v)
        if 'base' in f and 'ing' not in f and tipo_palabra(v) == 'verbo' and v not in ('be',) and not es_sustantivo(v) \
                and v not in ('a', 'the', 'my', 'it', 'time', 'work', 'help', 'rain', 'love', 'fun', 'dance', 'cook', 'call', 'study', 'answer', 'change', 'plan', 'use', 'visit', 'walk', 'test', 'record', 'dream', 'rest', 'shop', 'play', 'sleep', 'drink'):
            add(_v('prep_ing', 'después de una preposición el verbo va en -ing («%s %s»)' % (m.group(0).split()[0], _ing(v)),
                   'Preposición (in, of, about, without, before, after, by, instead of…) + verbo en -ing.', m.group(0)))
    # --- concordancia sujeto-verbo
    for m in re.finditer(r'(?:^|[.,;!?] |\b(?:and|but|because|that|if|when|so|while|although|who|which) )\s*(he|she|it|everyone|everybody|someone|somebody|nobody|each of them|each|this|that)\s+(?:' + ADV_FREC + r'\s+)?(\w+)\b', low):
        suj, v = m.group(1), m.group(2)
        f = formas(v)
        if v in ('am', 'are', 'were'):
            add(_v('sv_be3', '«%s %s»: con %s va «%s»' % (suj, v, suj, {'am': 'is', 'are': 'is', 'were': 'was'}[v]),
                   'Concordancia: he/she/it (y everyone, nobody, each…) + is / was / has / does / verbo con -s.', m.group(0)))
        elif v in ('have', 'do') and not re.search(r'\b(did|will|can|could|should|would|must|might|may|does|to)\s+' + re.escape(suj), low):
            add(_v('sv_have3', '«%s %s»: con %s va «%s»' % (suj, v, suj, {'have': 'has', 'do': 'does'}[v]),
                   'Concordancia: he/she/it + has / does.', m.group(0)))
        elif 'base' in f and 's3' not in f and 'past' not in f and tipo_palabra(v) == 'verbo' and v not in ('be', 'not') \
                and not re.search(r'\b(suggest|insist|recommend|demand|important|essential|necessary|require|ask)\w*( that)? ' + suj + r'\b', low) \
                and suj not in ('this', 'that'):
            add(_v('sv_3s', '«%s %s»: en presente con %s el verbo lleva -s («%s %s»)' % (suj, v, suj, suj, _s3(v)),
                   'Presente simple: he/she/it + verbo con -s (she goes, he studies, it has).', m.group(0)))
    for m in re.finditer(r'\b(i|you|we|they)\s+(?:' + ADV_FREC + r'\s+)?(\w+)\b', low):
        suj, v = m.group(1), m.group(2)
        if re.search(r'\b(do|does|did|will|would|can|could|should|must|may|might|are|is|am|were|was|have|has|had)\s+' + suj + r'\s*$', low[:m.start() + len(suj) + 1]):
            continue
        if v == 'is' or (v == 'was' and suj != 'i') or v in ('has', 'does') or (v == 'am' and suj != 'i') or (v == 'are' and suj == 'i'):
            correcto = {'is': 'am' if suj == 'i' else 'are', 'was': 'were', 'has': 'have', 'does': 'do', 'am': 'are', 'are': 'am'}[v]
            add(_v('sv_plural', '«%s %s»: con «%s» va «%s»' % (suj, v, suj, correcto),
                   'Concordancia: I am / was · you, we, they are / were · I, you, we, they have / do.', m.group(0)))
        elif 's3' in formas(v) and 'base' not in formas(v) and tipo_palabra(v) == 'verbo' and v not in ('is', 'was', 'has', 'does', 'its'):
            add(_v('sv_no_s', '«%s %s»: con «%s» el verbo va sin -s («%s %s»)' % (suj, v, suj, suj, base_de(v)),
                   'La -s del presente es solo para he/she/it.', m.group(0)))
    for m in re.finditer(r'\b(the|a|an|this|that|my|your|his|her|our|their|every|each|one)\s+(\w+)\s+(?:' + ADV_FREC + r'\s+)?(is|are|was|were|has|have|does|do)\b', low):
        det, n, v = m.groups()
        if not es_sustantivo(n) and n not in PLURAL_IRREG:
            continue
        plural = n in PLURAL_IRREG or (n.endswith('s') and not n.endswith(('ss', 'us', 'is', 'news', 'physics', 'mathematics')) and det not in ('a', 'an', 'this', 'that', 'every', 'each', 'one'))
        if det in ('a', 'an', 'this', 'that', 'every', 'each', 'one'):
            plural = False
        if n in INCONTABLES:
            plural = False
        if plural and v in ('is', 'was', 'has', 'does'):
            add(_v('sv_np_pl', '«%s %s» es plural: va «%s»' % (det, n, {'is': 'are', 'was': 'were', 'has': 'have', 'does': 'do'}[v]),
                   'Sujeto plural (the students, people, children) + are / were / have / do.', m.group(0)))
        elif not plural and v in ('are', 'were', 'have', 'do') and not re.search(r'\band\b', low[max(0, m.start() - 25):m.start()]):
            add(_v('sv_np_sg', '«%s %s» es singular%s: va «%s»' % (det, n, ' (incontable)' if n in INCONTABLES else '', {'are': 'is', 'were': 'was', 'have': 'has', 'do': 'does'}[v]),
                   'Sujeto singular o incontable (the information, the news, every student) + is / was / has / does.', m.group(0)))
    for m in re.finditer(r'\b(one|each|neither|either|none) of (?:the|my|your|his|her|our|their|these|those) (\w+) (?:who |that )?(\w+)\b', low):
        if m.group(3) in ('are', 'were', 'have', 'do'):
            add(_v('one_of', '«%s of the …» es singular: va «%s»' % (m.group(1), {'are': 'is', 'were': 'was', 'have': 'has', 'do': 'does'}[m.group(3)]),
                   'One of / each of / neither of + plural + verbo en singular (one of my friends is…).', m.group(0)))
    for m in re.finditer(r'\bone of (?:the|my|your|his|her|our|their|these|those) (?:\w+ )?(\w+)\b', low):
        n = m.group(1)
        if es_sustantivo(n) and not n.endswith('s') and n not in PLURAL_IRREG and n not in INCONTABLES:
            add(_v('one_of_pl', '«one of the %s»: después de «one of the» el sustantivo va en plural' % n, 'One of the + sustantivo en plural (one of the best students).', m.group(0)))
    for m in re.finditer(r'\bthere (is|was|are|were|has been|have been) (a |an |one |many |several |some |two |three |a lot of |lots of |no |few |a few )?(\w+)', low):
        v, det, n = m.group(1), (m.group(2) or '').strip(), m.group(3)
        plural_n = det in ('many', 'several', 'two', 'three', 'a few', 'few') or (n.endswith('s') and det not in ('a', 'an', 'one') and n not in ('news', 'this') and es_sustantivo(n[:-1] if n.endswith('s') else n)) or n in PLURAL_IRREG
        if det in ('a', 'an', 'one') or n in INCONTABLES:
            plural_n = False
        if plural_n and v in ('is', 'was', 'has been'):
            add(_v('there_pl', '«there %s» + plural: va «there %s»' % (v, {'is': 'are', 'was': 'were', 'has been': 'have been'}[v]),
                   'There is / was + singular o incontable; there are / were + plural.', m.group(0)))
        elif not plural_n and (det in ('a', 'an', 'one') or n in INCONTABLES) and v in ('are', 'were', 'have been'):
            add(_v('there_sg', '«there %s» + singular: va «there %s»' % (v, {'are': 'is', 'were': 'was', 'have been': 'has been'}[v]),
                   'There is / was + singular o incontable; there are / were + plural.', m.group(0)))
    for m in re.finditer(r'\b(people|children|police|men|women|the students|students)\s+(is|was|has|does)\b', low):
        add(_v('plural_irreg', '«%s» es plural: «%s %s»' % (m.group(1), m.group(1), {'is': 'are', 'was': 'were', 'has': 'have', 'does': 'do'}[m.group(2)]),
               'People, children, police son plurales.', m.group(0)))
    for m in re.finditer(r'\b(the number of|a number of) \w+ (is|are|was|were|has|have)\b', low):
        sing = m.group(1) == 'the number of'
        if sing and m.group(2) in ('are', 'were', 'have'):
            add(_v('number_of', '«the number of…» es singular: «is / was / has»', 'The number of + verbo singular; a number of + verbo plural.', m.group(0)))
        if not sing and m.group(2) in ('is', 'was', 'has'):
            add(_v('number_of', '«a number of…» (= varios) es plural: «are / were / have»', 'The number of + verbo singular; a number of + verbo plural.', m.group(0)))
    # --- tiempos según marcas de tiempo
    verbo_fin = _verbos_finitos(low)
    if re.search(PASADO_MARCAS, low) and not re.search(r'\b(since|for)\b', low):
        for v, ini, tipo in verbo_fin:
            if tipo in ('pres', 's3', 'base_pres', 'fut'):
                add(_v('t_pasado', 'la oración habla del pasado (%s): «%s» no es pasado' % (re.search(PASADO_MARCAS, low).group(0).strip(), v),
                       'Con yesterday, last…, …ago, in 2010 va pasado simple (went, studied, was).', v, 0.9))
            if tipo == 'perf' and re.search(r'\b(ago|yesterday|last \w+|in (?:19|20)\d\d)\b', low) and not re.search(r'\bhad\b', v):
                add(_v('t_perf_ago', 'con «%s» no va present perfect («%s»): usa pasado simple' % (re.search(r'\b(ago|yesterday|last \w+|in (?:19|20)\d\d)\b', low).group(0), v),
                       'Present perfect NO va con yesterday / ago / last… / in 2010 (tiempos terminados): ahí va pasado simple.', v))
    if re.search(FUTURO_MARCAS, low) and not re.search(r'\b(if|when|before|after|until|as soon as)\b', low):
        for v, ini, tipo in verbo_fin:
            if tipo in ('past', 'perf'):
                add(_v('t_futuro', 'la oración habla del futuro (%s): «%s» es pasado' % (re.search(FUTURO_MARCAS, low).group(0).strip(), v),
                       'Con tomorrow, next…, soon, tonight va futuro (will + verbo, be going to, o presente continuo para planes).', v))
    if re.search(r'\bsince\b\s+(?:\d|last|yesterday|i was|he was|she was|we were|they were|monday|january|february|march|april|may|june|july|august|september|october|november|december|then|childhood|\w+ (?:started|began|moved|arrived|met))', low) \
            or re.search(r'\bfor\s+(?:\d+|two|three|four|five|six|ten|many|several|a few|a long|ages)\s+(?:years?|months?|weeks?|days?|hours?|time)\b', low) and re.search(r'\b(so far|up to now|until now|now)\b|\bsince\b', low):
        for v, ini, tipo in verbo_fin:
            if ini < low.find(' since ') or ini < low.find(' for ') or ' since ' not in low:
                antes_since = ' since ' in low and ini < low.find(' since ')
                if tipo in ('pres', 's3', 'base_pres', 'past', 'fut') and (antes_since or not re.search(r'\b(was|were|started|began|moved|arrived|met)\b', v)):
                    add(_v('t_since', 'con «since / for + tiempo» hasta ahora va present perfect («have/has + participio»), no «%s»' % v,
                           'Since (desde un punto) / for (durante) + algo que sigue hasta hoy → present perfect (I have lived here since 2010).', v))
    if re.search(r'\b(already|yet|ever|just|so far|recently|lately)\b', low) and re.search(r'\b(already|yet|ever|so far|lately)\b', low):
        for v, ini, tipo in verbo_fin:
            if tipo == 'past' and not re.search(PASADO_MARCAS, low):
                add(_v('t_already', 'con «already / yet / ever / so far» lo esperado en examen es present perfect, no pasado simple («%s»)' % v,
                       'Already, yet, ever, never, just, so far → present perfect (have/has + participio).', v, 0.5))
    if re.search(AHORA_MARCAS, low):
        for v, ini, tipo in verbo_fin:
            b = base_de(v.split()[-1]) or ''
            if tipo in ('s3', 'base_pres') and b not in ESTATIVOS and b != 'be':
                add(_v('t_ahora', 'la acción pasa ahorita (%s): va presente continuo («am/is/are + -ing»), no «%s»' % (re.search(AHORA_MARCAS, low).group(0).strip(), v),
                       'Now / right now / at the moment / look! → presente continuo (she is studying now).', v))
    for m in re.finditer(r'\b(am|is|are|was|were)\s+(?:not\s+)?(\w+ing)\b', low):
        b = base_de(m.group(2))
        if b in ESTATIVOS and b not in ('think', 'have', 'see', 'feel', 'look', 'taste', 'smell'):
            add(_v('estativo', '«%s» es de estado (saber, querer, gustar…): casi nunca va en -ing («%s»)' % (b, _s3(b) if m.group(1) == 'is' else b),
                   'Verbos de estado (know, want, like, need, believe, understand, belong, prefer) van en presente simple, no continuo.', m.group(0)))
    if re.search(HABITO_MARCAS, low) and not re.search(AHORA_MARCAS, low) and not re.search(PASADO_MARCAS, low):
        for m in re.finditer(r'\b(am|is|are)\s+(\w+ing)\b', low):
            if re.search(r'\b(always)\b', low):
                continue
            add(_v('t_habito', 'es un hábito (%s): va presente simple, no continuo («%s»)' % (re.search(HABITO_MARCAS, low).group(0), m.group(0)),
                   'Hábitos y rutinas (every day, usually, often, on Mondays) → presente simple.', m.group(0), 0.8))
    m = re.search(r'\bby the time\b[^,]*\b(\w+ed|was|were|came|went|arrived|got|left)\b[^,]*,\s*(.*)', low)
    if m and not re.search(r'\bhad\s+\w+', m.group(2)):
        add(_v('pastperf', 'con «by the time + pasado» la otra parte va en pasado perfecto («had + participio»)',
               'By the time + pasado → had + participio (By the time we arrived, the movie had started).', m.group(2)[:30]))
    # --- condicionales
    m = re.search(r'\bif\b(.*?)(?:,|\bthen\b)(.*)', low) or re.search(r'^(.*?)\bif\b(.*)', low)
    if m and re.search(r'\b(know|wonder|wondering|wondered|ask|asked|asking|sure|see|check|tell me|find out|whether|idea)\s+if\b', low):
        m = None
    if m:
        if_cl, main = (m.group(1), m.group(2)) if low.find(' if ') < low.find(m.group(2)) and m.re.pattern.startswith(r'\bif') else (m.group(2), m.group(1))
        if re.search(r'\bwill\b', if_cl) and not re.search(r'\bwill you\b', if_cl):
            add(_v('if_will', 'en la parte del «if» no va «will»: va presente (if it rains…)', 'Condicional real: If + presente, … will + verbo.', if_cl.strip()[:40]))
        if_past = re.search(r'\b(were|was|had|did|\w+ed|went|came|knew|saw|got|took|made|could|lived|studied)\b', if_cl) and not re.search(r'\b(had\s+\w+(ed|en|ne|wn|t)|had been)\b', if_cl)
        if_pp = re.search(r'\bhad\s+(?:not\s+)?(\w+)\b', if_cl) and 'pp' in formas(re.search(r'\bhad\s+(?:not\s+)?(\w+)\b', if_cl).group(1))
        if_pres = not if_past and not if_pp and re.search(r'\b(is|are|am|do|does|has|have|\w+s)\b|\b(i|you|we|they) \w+\b', if_cl)
        if if_pp:
            if not re.search(r'\b(would|could|might) (?:not )?have\b', main):
                add(_v('if3', 'if + had + participio (pasado imposible) → «would have + participio» en la otra parte',
                       'Tercer condicional: If + had + participio, … would have + participio.', main.strip()[:40]))
        elif if_past and re.search(r'\bwill\b', main):
            add(_v('if2_will', 'if + pasado (algo imaginario) va con «would», no «will»', 'Segundo condicional: If + pasado (were), … would + verbo.', main.strip()[:40]))
        elif if_past and re.search(r'\bwould have\b', main):
            add(_v('if2_wouldhave', 'si el «if» va en pasado simple, la otra parte va con «would + verbo» (no «would have»)', 'Segundo condicional: If + pasado, … would + verbo.', main.strip()[:40], 0.8))
        elif if_pres and re.search(r'\bwould\b', main) and not re.search(r'\bwould like\b', main):
            add(_v('if1_would', 'if + presente (algo real/probable) va con «will», no «would»', 'Primer condicional: If + presente, … will + verbo.', main.strip()[:40]))
        if re.search(r'\bif (i|he|she|it) was\b', if_cl) and re.search(r'\bwould\b', main):
            add(_v('if_were', 'en condicional imaginario lo formal (y lo que piden en TOEFL) es «If I were…»', 'If I / he / she were… (subjuntivo).', 'was', 0.5))
    for m in re.finditer(r'\bwish(?:es)? (?:that )?(i|you|he|she|it|we|they) (am|is|are|have|has|will|can|do|does)\b', low):
        add(_v('wish', 'después de «wish» va un tiempo hacia atrás: «%s %s»' % (m.group(1), {'am': 'were', 'is': 'were', 'are': 'were', 'have': 'had', 'has': 'had', 'will': 'would', 'can': 'could', 'do': 'did', 'does': 'did'}[m.group(2)]),
               'Wish + pasado (I wish I were / had / could) para deseos del presente.', m.group(0)))
    # --- artículos
    for m in re.finditer(r'\b(a|an)\s+([a-z][\w-]*)', low):
        art, w = m.groups()
        suena_vocal = (w[0] in 'aeiou' and w not in VOCAL_CONSONANTE and not w.startswith(('uni', 'use', 'usu', 'eu', 'one', 'ur'))) or w in CONSONANTE_VOCAL
        if art == 'a' and suena_vocal:
            add(_v('art_an', '«a %s»: antes de sonido de vocal va «an» («an %s»)' % (w, w), 'A + sonido de consonante (a university, a book); an + sonido de vocal (an hour, an apple).', m.group(0)))
        elif art == 'an' and not suena_vocal:
            add(_v('art_a', '«an %s»: antes de sonido de consonante va «a» («a %s»)' % (w, w), 'A + sonido de consonante (a university, a book); an + sonido de vocal (an hour, an apple).', m.group(0)))
        if w in INCONTABLES and w not in ('time', 'work', 'help', 'fun', 'coffee', 'love', 'education', 'food'):
            add(_v('art_incontable', '«%s» es incontable: no lleva «a/an» (usa «some %s» o «a piece of %s»)' % (w, w, w), 'Sustantivos incontables (information, advice, furniture, homework, equipment) no llevan a/an ni plural.', m.group(0)))
        elif (w in PLURAL_IRREG or (w.endswith('s') and not w.endswith(('ss', 'us', 'is', 'ous')) and es_sustantivo(w[:-1]))) and w not in ('news', 'means', 'series'):
            add(_v('art_plural', '«%s %s»: a/an no va con plural' % (art, w), 'A / an solo con un sustantivo contable en singular.', m.group(0)))
    for m in re.finditer(r'\b(informations|advices|furnitures|homeworks|equipments|knowledges|researches|luggages|evidences|vocabularies)\b', low):
        add(_v('incontable_s', '«%s» no tiene plural en inglés' % m.group(1), 'Information, advice, furniture, homework, equipment, knowledge, research son incontables (sin -s).', m.group(0)))
    for m in re.finditer(r'(?:^|[^e]) (?!the\b|my\b|your\b|his\b|her\b|our\b|their\b|its\b)(\w+)\s+(most \w+|best|worst|\w{3,}est)\s+(\w+)\b', low):
        if m.group(1) in ('is', 'was', 'are', 'were', 'be', 'of', 'in', 'and', 'a', 'an') and m.group(2) not in ('rest', 'test', 'west', 'interest', 'forest', 'guest', 'chest', 'nest', 'honest', 'modest', 'request', 'contest', 'protest', 'suggest', 'latest', 'invest', 'manifest', 'harvest') and es_sustantivo(m.group(3)):
            add(_v('sup_the', 'el superlativo lleva «the» («the %s %s»)' % (m.group(2), m.group(3)), 'Superlativo = the + most / -est (the best, the most important).', m.group(0), 0.8))
    # --- comparativos y superlativos
    for m in re.finditer(r'\b(more|less)\s+(\w+er|better|worse)\b', low):
        if m.group(2) not in ('other', 'never', 'over', 'under', 'water', 'paper', 'power', 'after', 'number', 'clever', 'tender', 'bitter', 'proper', 'eager', 'member', 'cancer', 'answer', 'order', 'computer', 'teacher', 'whether', 'together', 'weather', 'however', 'rather'):
            add(_v('doble_comp', '«%s %s» es doble comparativo: solo «%s»' % (m.group(1), m.group(2), m.group(2)), 'O -er o more, nunca los dos (bigger, more important).', m.group(0)))
    for m in re.finditer(r'\bthe\s+most\s+(\w+est|best|worst)\b', low):
        add(_v('doble_sup', '«the most %s» es doble superlativo: solo «the %s»' % (m.group(1), m.group(1)), 'O -est o most, nunca los dos.', m.group(0)))
    CORTOS = {'big', 'small', 'tall', 'short', 'fast', 'slow', 'cheap', 'old', 'young', 'long', 'hot', 'cold', 'easy', 'happy', 'busy', 'early', 'late', 'large', 'nice', 'strong', 'high', 'low', 'rich', 'poor', 'hard', 'heavy', 'near', 'new', 'quick', 'safe', 'warm', 'wide', 'smart', 'funny', 'pretty', 'dirty', 'close', 'clean', 'dark', 'deep', 'great', 'thin', 'fat', 'wet', 'dry', 'lucky'}
    for m in re.finditer(r'\b(more|most)\s+(\w+)\b', low):
        if m.group(2) in CORTOS:
            a = m.group(2)
            add(_v('more_corto', '«%s %s»: «%s» es corto, se dice «%s»' % (m.group(1), a, a, _comp(a, m.group(1) == 'most')), 'Adjetivos cortos (1 sílaba o terminados en -y) → -er / -est (bigger, the easiest); largos → more / most.', m.group(0)))
    LARGOS_ER = re.compile(r'\b(beautifuller|importanter|interestinger|expensiver|difficulter|carefuller|famouser|dangerouser|intelligenter|popularer|modernest|beautifullest|importantest|interestingest|expensivest|difficultest)\b')
    for m in LARGOS_ER.finditer(low):
        add(_v('largo_er', '«%s» no existe: con adjetivos largos se usa more / most' % m.group(1), 'Adjetivos largos → more / the most (more important, the most beautiful).', m.group(0)))
    for m in re.finditer(r'\b(gooder|goodest|badder|baddest|more good|most good|more bad|most bad|more well|funner)\b', low):
        add(_v('irreg_comp', '«%s» no se dice: good → better / the best; bad → worse / the worst' % m.group(1), 'Irregulares: good-better-best, bad-worse-worst, far-farther-farthest.', m.group(0)))
    for m in re.finditer(r'\b(\w+)\s+than\b', low):
        a = m.group(1)
        if a in CORTOS or (a in ('good', 'bad', 'beautiful', 'important', 'interesting', 'expensive', 'difficult', 'careful', 'famous', 'dangerous', 'intelligent', 'popular', 'modern')):
            if not re.search(r'\b(more|less)\s+' + a + r'\s+than', low):
                add(_v('than_comp', 'con «than» va comparativo, no «%s»' % a, 'Comparativo + than (taller than, more expensive than, better than).', m.group(0)))
        if re.search(r'(est|^best|^worst)$', a) and a not in ('honest', 'interest', 'rest', 'west', 'test', 'modest'):
            add(_v('sup_than', '«%s than»: con «than» va comparativo, no superlativo' % a, 'Comparativo + than; superlativo con the … of/in.', m.group(0)))
        if re.search(r'\bmost\s+\w+\s+than\b', m.group(0) if False else low[max(0, m.start() - 20):m.end()]):
            add(_v('most_than', 'con «than» va «more», no «most»', 'Comparativo + than (more important than).', m.group(0)))
    for m in re.finditer(r'\bthe\s+(\w+er|more \w+|better|worse)\s+(?:\w+\s+)?(?:of all|in the (?:world|class|school|city|country|family|group|team)|of the (?:three|four|five|group|class|year))\b', low):
        if not re.search(r'\bthe\s+(other|number|water|teacher|weather|computer|paper|power|answer|order|member|player|singer|writer|driver|manager|leader|winner|daughter|brother|sister|mother|father|corner|matter|summer|winter|letter)\b', m.group(0)):
            add(_v('comp_sup', 'con «of all / in the class / in the world» va superlativo (the -est / the most)', 'Superlativo = the + -est / the most + … in / of (the tallest in the class).', m.group(0)))
    for m in re.finditer(r'\bas\s+(\w+er|more \w+|better|worse|\w+est|most \w+)\s+as\b', low):
        if not re.search(r'\bas (clever|tender|eager|proper|bitter|other) as', m.group(0)):
            add(_v('as_as', '«as … as» va con el adjetivo normal («as %s as»)' % re.sub(r'^more |er$|est$|^most ', '', m.group(1)), 'As + adjetivo normal + as (as tall as).', m.group(0)))
    # --- adjetivo / adverbio y -ed / -ing
    ACCION = r'(?:runs?|ran|running|drives?|drove|driving|speaks?|spoke|speaking|works?|worked|working|sings?|sang|singing|plays?|played|writes?|wrote|walks?|walked|talks?|talked|moves?|moved|answered|answers?|finished|finish|dances?|danced|cooks?|cooked|reacted|responded|behaved|behaves?|studies|studied|study|explained|explains?|drives|did|does|do|treated|treats?|learned|learns?|swims?|swam|grew|grows?|changed|changes|increased|increases|decreased|improved|improves|completed)'
    for m in re.finditer(r'\b' + ACCION + r'\s+(?:(?:the|his|her|my|their|our|it|very|so|too|really|extremely)\s+(?:\w+\s+)?)?(careful|quick|slow|bad|beautiful|easy|quiet|loud|careless|nice|perfect|serious|happy|sad|polite|rude|fluent|clear|correct|patient|honest|safe|dangerous|efficient|rapid|gradual|significant|dramatic|steady|sudden|frequent|recent|immediate|successful|complete|accurate|proper|regular|slight|considerable)\b(?!\s+\w*(?:s|tion|ment|ness|ity)\b)', low):
        adj = m.group(1)
        add(_v('adj_adv', 'para decir CÓMO se hace la acción va adverbio («%s»), no adjetivo («%s»)' % (_ly(adj), adj),
               'Verbo de acción + adverbio (-ly): drives carefully, speaks fluently, increased significantly.', m.group(0)))
    LIGA = r'(?:am|is|are|was|were|be|been|seems?|seemed|looks?|looked|feels?|felt|sounds?|sounded|tastes?|tasted|smells?|smelled|becomes?|became|appears?|appeared|remains?|remained|gets?|got|stays?|stayed)'
    for m in re.finditer(r'\b' + LIGA + r'\s+(?:very\s+|so\s+|really\s+|too\s+|quite\s+)?(\w+ly)\b(?!\s+(?:\w+ed|\w+ing|\w+ful|\w+ous|\w+ive|\w+able|\w+ent|\w+ant|\w+al|\w+ic|good|bad|happy|sad|different|important|new|old|hot|cold|difficult|easy|sick|tired|beautiful|interesting|clear|ready|available|possible))', low):
        w = m.group(1)
        if w not in ('friendly', 'lonely', 'lovely', 'likely', 'ugly', 'silly', 'early', 'only', 'daily', 'holy', 'elderly', 'costly', 'family', 'deadly', 'lively', 'curly', 'chilly', 'jolly', 'fly', 'italy', 'july', 'apply', 'reply', 'supply', 'rely'):
            add(_v('liga_adv', 'después de be / seem / look / feel / sound va adjetivo («%s»), no adverbio' % re.sub(r'ily$', 'y', re.sub(r'ly$', '', w)) if not w.endswith('ally') else w[:-2],
                   'Verbos de estado o de los sentidos (be, seem, look, feel, sound, taste, become) + adjetivo: she looks happy, it sounds good.', m.group(0)))
    for m in re.finditer(r'\b(i|we|they|he|she|you|the students|students|people|everyone|the audience|my \w+|his \w+|her \w+)\s+(?:am|is|are|was|were|feel|feels|felt|got|get|gets|seemed|seems|looked|looks|became|become)\s+(?:very\s+|so\s+|really\s+|too\s+|quite\s+|a little\s+|extremely\s+)?(bor|interest|excit|confus|tir|frighten|surpris|disappoint|amaz|annoy|embarrass|satisf|exhaust|worr|shock|terrify|relax|fascinat|frustrat|overwhelm|depress)(ing)\b', low):
        r = m.group(2)
        add(_v('ed_ing_persona', 'la persona SIENTE la emoción: va -ed («%s»); -ing es lo que la causa' % (r + ('ied' if r.endswith('r') and r in ('worr',) else 'ed')),
               '-ed = cómo se siente alguien (I am bored); -ing = cómo es algo que causa eso (the class is boring).', m.group(0)))
    for m in re.finditer(r'\b(the (?:movie|film|class|book|lecture|game|story|news|trip|show|test|exam|situation|result|job|course|speech|class)|it|this|that)\s+(?:is|was|seems?|seemed|sounds?|sounded|looks?|looked)\s+(?:very\s+|so\s+|really\s+|too\s+|quite\s+|extremely\s+)?(bored|interested|excited|confused|tired|frightened|surprised|disappointed|amazed|annoyed|embarrassed|satisfied|exhausted|shocked|terrified|relaxed|fascinated|frustrated|depressed)\b', low):
        add(_v('ed_ing_cosa', '«%s» describe algo que CAUSA la emoción: va -ing («%s»)' % (m.group(1), re.sub(r'ied$', 'ying', re.sub(r'ed$', 'ing', m.group(2))) if m.group(2) != 'tired' else 'tiring'),
               '-ing = algo que causa la emoción (boring, interesting); -ed = la persona que la siente.', m.group(0)))
    for m in re.finditer(r'\b(a|an|the|very|so|too|quite|extremely|really|this|that|my|your|his|her|our|their)\s+(\w+ly)\s+(\w+)\b', low):
        adv, n = m.group(2), m.group(3)
        if m.group(1) in ('a', 'an', 'the', 'this', 'that', 'my', 'your', 'his', 'her', 'our', 'their') and es_sustantivo(n) and adv not in ('friendly', 'lonely', 'lovely', 'likely', 'ugly', 'silly', 'early', 'only', 'daily', 'holy', 'elderly', 'costly', 'weekly', 'monthly', 'yearly', 'family', 'deadly', 'lively', 'curly'):
            add(_v('adv_sust', 'antes de un sustantivo («%s») va adjetivo, no adverbio («%s»)' % (n, adv), 'Adjetivo + sustantivo (a quick answer); adverbio + verbo (answer quickly).', m.group(0)))
    for m in re.finditer(r'\b(real|extreme|incredible|terrible|absolute|complete|total|amazing|surprising|unusual|relative|reasonable|remarkable)\s+(good|bad|hot|cold|fast|slow|important|difficult|easy|happy|sad|tired|expensive|cheap|beautiful|interesting|big|small|different|similar|well|quickly|slowly|high|low|popular|useful|dangerous|strong|large)\b', low):
        add(_v('adv_adj', 'para modificar a un adjetivo va adverbio («%s %s»)' % (_ly(m.group(1)), m.group(2)), 'Adverbio + adjetivo (extremely hot, really good).', m.group(0)))
    # --- word form (sustantivo esperado)
    for m in re.finditer(r'\b(a|an|the|my|your|his|her|its|our|their|this|that|these|those|of the|in the)\s+(?:\w+(?:al|ful|ous|ive|ic|ent|ant|able|ible|ing|ed)\s+)?(\w+)\s*(?=[.?!,]|\s+(?:of|is|was|are|were|in|on|at|for|to|and|with|has|have|had|will|can|that|which)\b|\s*$)', low):
        w = m.group(2)
        t = tipo_palabra(w)
        if t in ('adjetivo', 'adverbio') and not es_sustantivo(w) and w not in ('same', 'best', 'most', 'other', 'rest', 'poor', 'rich', 'young', 'old', 'elderly', 'past', 'future', 'present', 'individual', 'original', 'professional', 'national', 'animal', 'chemical', 'criminal', 'local', 'average', 'potential', 'total', 'material', 'principal', 'arrival', 'proposal', 'approval', 'survival', 'removal', 'denial', 'trial', 'rival', 'festival', 'capital', 'hospital', 'signal', 'journal', 'interval', 'mammal', 'manual', 'tutorial', 'editorial', 'official', 'relative', 'representative', 'executive', 'detective', 'objective', 'alternative', 'initiative', 'perspective', 'motive', 'native', 'adjective', 'magic', 'logic', 'music', 'topic', 'public', 'clinic', 'traffic', 'republic', 'student', 'patient', 'parent', 'agent', 'client', 'event', 'element', 'talent', 'content', 'percent', 'comment', 'moment', 'current', 'president', 'resident', 'accident', 'incident', 'government', 'environment', 'restaurant', 'assistant', 'servant', 'giant', 'plant', 'participant', 'immigrant', 'merchant', 'peasant', 'tenant', 'table', 'cable', 'vegetable', 'bible', 'early', 'only', 'family', 'daily', 'weekly', 'monthly', 'ally', 'rally', 'belly', 'jelly', 'lily', 'bully', 'italy', 'july', 'supply', 'reply', 'assembly', 'anomaly'):
            add(_v('wf_sust', 'después de «%s» va un sustantivo; «%s» es %s' % (m.group(1), w, t), 'Word form: determinante (a, the, my…) + (adjetivo) + SUSTANTIVO.', m.group(0)))
    for m in re.finditer(r'\b(very|so|too|quite|extremely|really|more|most|less)\s+(\w+(?:tion|ment|ness|ity|ance|ence|ship))\b', low):
        add(_v('wf_adj', '«%s %s»: después de «%s» va adjetivo o adverbio, no sustantivo' % (m.group(1), m.group(2), m.group(1)), 'Very / so / too + adjetivo o adverbio.', m.group(0)))
    # --- pronombres
    for m in re.finditer(r'\b(between|for|to|with|from|about|like|than me and|except|without|of|behind|near|by)\s+(?:you and |him and |her and |me and |them and )?(i|he|she|we|they)\b(?!\s+(?:am|is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|must|\w+ed|\w+s)\b)', low):
        if m.group(1) in ('like',) or (m.group(1) == 'than me and'):
            continue
        add(_v('pron_obj', 'después de preposición va pronombre de objeto («%s %s»)' % (m.group(1), {'i': 'me', 'he': 'him', 'she': 'her', 'we': 'us', 'they': 'them'}[m.group(2)]),
               'Preposición + me / him / her / us / them (between you and me, for her).', m.group(0)))
    for m in re.finditer(r'(?:^|[.!?]\s)\s*(me|him|her|us|them) and (i|me|him|her|he|she)\b|(?:^|[.!?]\s)\s*(\w+) and (me|him|her|us|them)\s+(?:am|is|are|was|were|have|has|went|go|will|can|\w+ed)\b', low):
        add(_v('pron_suj', 'como sujeto van I / he / she / we / they (no me / him / her)', 'Sujeto: I, he, she, we, they. Objeto: me, him, her, us, them.', m.group(0)))
    for m in re.finditer(r'\b(hisself|theirselves|theirself|ourself|themself)\b', low):
        add(_v('reflexivo', '«%s» no existe: himself / themselves / ourselves' % m.group(1), 'Reflexivos: myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.', m.group(0)))
    for m in re.finditer(r"\bit's\s+(\w+)\b", s.lower()):
        if es_sustantivo(m.group(1)) and m.group(1) not in ('time', 'fun', 'okay', 'raining', 'snowing'):
            add(_v('its', "«it's» = it is; para posesivo («su») va «its» (its %s)" % m.group(1), "Its = posesivo (its color); it's = it is.", m.group(0)))
    for m in re.finditer(r"\b(their|there|they're)\s+(\w+)\b", s.lower()):
        w, n = m.groups()
        if w == 'there' and n not in ('is', 'are', 'was', 'were', 'will', 'has', 'have', 'had', 'used', 'may', 'might', 'must', 'should', 'could', 'seems', 'seem', 'appears', 'and', 'a', 'an', 'the', 'too', 'yet', 'by', 'in', 'at', 'on', 'for', 'to') and es_sustantivo(n):
            add(_v('their', '«there %s»: para «su/sus» va «their»' % n, 'Their = su/sus; there = allí / there is; they\'re = they are.', m.group(0)))
        if w == 'their' and n in ('is', 'are', 'was', 'were'):
            add(_v('their', '«their %s»: aquí va «there %s» (hay/había)' % (n, n), 'Their = su/sus; there = allí / there is; they\'re = they are.', m.group(0)))
    for m in re.finditer(r"\b(your)\s+(welcome|right|wrong|going|coming|late|not)\b", s.lower()):
        add(_v('your', "«your %s» → «you're %s» (you are)" % (m.group(2), m.group(2)), "Your = tu (posesivo); you're = you are.", m.group(0)))
    for m in re.finditer(r'\b(the|a|an)\s+(\w+)\s+(which|who)\b', low):
        n, rel = m.group(2), m.group(3)
        persona = n in ('man', 'woman', 'person', 'people', 'teacher', 'student', 'students', 'boy', 'girl', 'doctor', 'friend', 'friends', 'professor', 'girl', 'child', 'children', 'guy', 'lady', 'author', 'scientist', 'scientists', 'artist', 'player', 'actor', 'writer', 'nurse', 'patient', 'customer', 'employee', 'boss', 'neighbor', 'singer', 'person', 'manager', 'engineer', 'lawyer', 'worker', 'workers', 'leader', 'president', 'king', 'queen', 'mother', 'father', 'sister', 'brother', 'members', 'member', 'citizens')
        cosa = es_sustantivo(n) and not persona
        if persona and rel == 'which':
            add(_v('rel_who', 'para personas («%s») va «who», no «which»' % n, 'Who = personas; which = cosas; that = ambos (sin coma); whose = de quien.', m.group(0)))
        if cosa and rel == 'who':
            add(_v('rel_which', 'para cosas («%s») va «which/that», no «who»' % n, 'Who = personas; which = cosas; that = ambos (sin coma); whose = de quien.', m.group(0)))
    for m in re.finditer(r',\s*that\b', low):
        add(_v('coma_that', 'después de coma (cláusula explicativa) va «which/who», no «that»', 'Con comas: which / who. «That» solo sin comas.', m.group(0), 0.8))
    for m in re.finditer(r'\b(to|for|with|from|about|of|by)\s+who\b', low):
        add(_v('whom', 'después de preposición va «whom»', 'Preposición + whom (to whom, with whom).', m.group(0), 0.8))
    for m in re.finditer(r'\bwhom\s+(is|are|was|were|has|have|will|can|lives|works|wants|\w+ed)\b', low):
        add(_v('who_suj', '«whom» es objeto; aquí es sujeto del verbo: «who»', 'Who = sujeto (who lives here); whom = objeto (whom you met).', m.group(0)))
    # --- cuantificadores
    for m in re.finditer(r'\b(many|few|a few|several|fewer|number of|these|those|a lot of books)\s+(\w+)\b', low):
        if m.group(2) in INCONTABLES and m.group(2) not in ('time', 'work', 'coffee', 'food'):
            mejor = {'many': 'much', 'few': 'little', 'a few': 'a little', 'several': 'some', 'fewer': 'less', 'number of': 'amount of', 'these': 'this', 'those': 'that'}.get(m.group(1), 'much')
            add(_v('q_incontable', '«%s» es incontable: «%s %s», no «%s»' % (m.group(2), mejor, m.group(2), m.group(1)), 'Contables: many, few, fewer, number of. Incontables: much, little, less, amount of.', m.group(0)))
    for m in re.finditer(r'\b(much|little|a little|less|amount of)\s+(\w+)\b', low):
        n = m.group(2)
        if (n in PLURAL_IRREG or (n.endswith('s') and not n.endswith(('ss', 'us', 'is', 'news', 'ics')) and es_sustantivo(n[:-1]))) and n not in ('less',):
            mejor = {'much': 'many', 'little': 'few', 'a little': 'a few', 'less': 'fewer', 'amount of': 'number of'}[m.group(1)]
            add(_v('q_contable', '«%s» es plural contable: «%s %s», no «%s»' % (n, mejor, n, m.group(1)), 'Contables: many, few, fewer, number of. Incontables: much, little, less, amount of.', m.group(0)))
    for m in re.finditer(r'\b(each|every|another)\s+(\w+)\b', low):
        n = m.group(2)
        if n.endswith('s') and not n.endswith(('ss', 'us', 'is')) and es_sustantivo(n[:-1]) and n not in ('news', 'series', 'means', 'species'):
            add(_v('each_sg', '«%s» va con sustantivo en singular («%s %s»)' % (m.group(1), m.group(1), n[:-1]), 'Each / every / another + singular.', m.group(0)))
    for m in re.finditer(r'\b(several|many|few|both|various|a few|two|three|four|five|these|those|numerous)\s+(\w+)\b', low):
        n = m.group(2)
        if es_sustantivo(n) and not n.endswith('s') and n not in PLURAL_IRREG and n not in INCONTABLES and n not in ('of', 'more', 'other', 'people', 'times', 'hundred', 'thousand', 'million') and not n.endswith(('ing',)):
            add(_v('pl_falta', '«%s %s»: el sustantivo va en plural' % (m.group(1), n), 'Several / many / both / two… + plural.', m.group(0)))
    pares = [(r'\bboth\b', r'\b(or|nor)\b', 'both … and', r'\band\b'), (r'\beither\b', r'\b(nor|and)\b', 'either … or', r'\bor\b'),
             (r'\bneither\b', r'\b(or|and|but)\b', 'neither … nor', r'\bnor\b'), (r'\bnot only\b', r'\band\b(?! also)', 'not only … but (also)', r'\bbut\b')]
    for a, malo, nombre, bueno in pares:
        ma = re.search(a, low)
        if ma and re.search(malo, low[ma.end():]) and not re.search(bueno, low[ma.end():]):
            add(_v('correlativo', 'la pareja correcta es «%s»' % nombre, 'Both…and, either…or, neither…nor, not only…but also.', re.search(malo, low[ma.end():]).group(0)))
    # --- preposiciones de tiempo y lugar
    for m in re.finditer(r'\b(on|at)\s+(' + MESES + r')\b', low):
        if not re.search(r'\bat the (morning|afternoon|evening)', m.group(0)) or True:
            add(_v('prep_in', '«%s %s» → «in %s» (meses, años, estaciones, partes del día)' % (m.group(1), m.group(2), m.group(2)), 'In + mes / año / estación / the morning; on + día / fecha; at + hora / night / noon.', m.group(0)))
    for m in re.finditer(r'\b(in|at)\s+(' + DIAS + r')\b', low):
        if m.group(2).startswith('weekend') and m.group(1) == 'at':
            continue
        add(_v('prep_on', '«%s %s» → «on %s» (días y fechas)' % (m.group(1), m.group(2), m.group(2)), 'In + mes / año / estación / the morning; on + día / fecha; at + hora / night / noon.', m.group(0)))
    for m in re.finditer(r'\b(in|on)\s+(' + HORAS + r')', low):
        if m.group(2) in ('the end of', 'the beginning of', 'the moment', 'present'):
            continue
        add(_v('prep_at', '«%s %s» → «at %s» (horas, night, noon)' % (m.group(1), m.group(2), m.group(2)), 'In + mes / año / estación / the morning; on + día / fecha; at + hora / night / noon.', m.group(0)))
    DEP = {'interested': 'in', 'good': 'at', 'bad': 'at', 'afraid': 'of', 'proud': 'of', 'depend': 'on', 'depends': 'on', 'depended': 'on',
           'rely': 'on', 'relies': 'on', 'married': 'to', 'listen': 'to', 'listened': 'to', 'listening': 'to', 'responsible': 'for',
           'famous': 'for', 'tired': 'of', 'worried': 'about', 'aware': 'of', 'capable': 'of', 'consist': 'of', 'consists': 'of',
           'insist': 'on', 'insisted': 'on', 'believe': 'in', 'focus': 'on', 'focused': 'on', 'apologize': 'for', 'apologized': 'for',
           'succeed': 'in', 'succeeded': 'in', 'participate': 'in', 'participated': 'in', 'similar': 'to', 'fond': 'of', 'full': 'of',
           'keen': 'on', 'excited': 'about', 'jealous': 'of', 'arrive': 'at/in', 'arrived': 'at/in', 'arrives': 'at/in', 'wait': 'for',
           'waiting': 'for', 'waited': 'for', 'look': 'at', 'belong': 'to', 'belongs': 'to', 'prefer': 'to', 'suffer': 'from',
           'suffers': 'from', 'different': 'from', 'composed': 'of', 'based': 'on', 'concerned': 'about/with', 'involved': 'in',
           'satisfied': 'with', 'familiar': 'with', 'pleased': 'with', 'qualified': 'for', 'eligible': 'for', 'known': 'for',
           'dependent': 'on', 'independent': 'of', 'committed': 'to', 'exposed': 'to', 'related': 'to', 'devoted': 'to', 'opposed': 'to', 'addicted': 'to'}
    for m in re.finditer(r'\b(' + '|'.join(DEP) + r')\s+(in|on|at|of|for|to|about|with|from|by|into)\b', low):
        w, p = m.groups()
        bien = DEP[w].split('/')
        if p not in bien and not (w in ('look',) and p in ('for', 'after', 'into', 'up', 'forward')) and not (w in ('good', 'bad') and p in ('for', 'with', 'to')) \
                and not (w in ('arrive', 'arrived', 'arrives') and p in ('on', 'by')) and not (w == 'different' and p == 'than') \
                and not (w in ('tired',) and p in ('from',)) and not (w == 'full' and p == 'time') and not (w in ('wait', 'waiting', 'waited') and p in ('in', 'at', 'on', 'until')) \
                and not (w in ('interested', 'excited', 'worried', 'pleased', 'satisfied', 'afraid', 'proud') and p == 'to' and re.search(r'\bto\s+\w+', low[m.end() - 3:m.end() + 15]) and not re.search(r'\bto\s+(the|a|an|my|your|his|her|their|our)\b', low[m.end() - 3:m.end() + 8])) \
                and not (w == 'prefer' and p in ('in', 'on', 'at', 'by')) and not (w == 'believe' and p == 'that'):
            add(_v('prep_dep', '«%s %s» → «%s %s»' % (w, p, w, DEP[w].replace('/', ' / ')), 'Preposiciones fijas: interested in, good at, afraid of, depend on, married to, listen to, responsible for, arrive at/in…', m.group(0)))
    for m in re.finditer(r'\b(discuss|discussed|discussing|enter|entered|reach|reached|marry|married|emphasize|emphasized|mention|mentioned|answer|answered|attend|attended|approach|approached|lack|lacked|resemble|resembles|contact|contacted)\s+(about|on|to|with|into|at|in)\b', low):
        if m.group(1) in ('married',) and m.group(2) == 'to':
            continue
        if m.group(1).startswith('enter') and m.group(2) == 'into' and re.search(r'into (an? )?(agreement|contract|discussion|negotiation)', low):
            continue
        add(_v('sin_prep', '«%s» va directo, sin «%s»' % (m.group(1), m.group(2)), 'Discuss, enter, reach, marry, emphasize, mention, attend, contact, resemble van sin preposición.', m.group(0)))
    for m in re.finditer(r'\b(explain|explained|explains|describe|described|suggest|suggested)\s+(me|him|her|us|them)\b', low):
        add(_v('explain_me', '«%s %s» → «%s (it) to %s»' % (m.group(1), m.group(2), m.group(1), m.group(2)), 'Explain / describe / suggest + algo + to + persona.', m.group(0)))
    for m in re.finditer(r'\b(arrive|arrived|arrives|arriving)\s+to\b', low):
        add(_v('arrive_to', '«arrive to» → «arrive at» (lugar chico) o «arrive in» (ciudad, país)', 'Arrive at / in, nunca arrive to.', m.group(0)))
    for m in re.finditer(r'\b(go|goes|went|going|come|came|comes|coming|get|got|return|returned)\s+to\s+(home|downtown|here|there|abroad|upstairs|downstairs)\b', low):
        add(_v('to_home', '«%s to %s» → «%s %s» (sin to)' % (m.group(1), m.group(2), m.group(1), m.group(2)), 'Home, here, there, abroad, downtown van sin «to».', m.group(0)))
    for m in re.finditer(r'\bduring\s+(\d+|two|three|four|five|six|ten|several|many|a few)\s+(\w+)', low):
        add(_v('during_for', '«during + duración» → «for %s %s»' % (m.group(1), m.group(2)), 'For + cuánto tiempo (for two hours); during + un evento (during the class).', m.group(0)))
    for m in re.finditer(r'\bsince\s+(\d+|two|three|four|five|six|ten|several|many|a few)\s+(years|months|weeks|days|hours|minutes)\b', low):
        add(_v('since_for', '«since %s %s» → «for %s %s» (duración)' % (m.group(1), m.group(2), m.group(1), m.group(2)), 'For + duración (for 3 years); since + punto de inicio (since 2020).', m.group(0)))
    for m in re.finditer(r'\bfor\s+((?:19|20)\d\d|last \w+|yesterday|monday|january|i was|he was|she was)\b', low):
        if re.search(r'\b(have|has|had)\b', low):
            add(_v('for_since', '«for %s» → «since %s» (punto de inicio)' % (m.group(1), m.group(1)), 'For + duración (for 3 years); since + punto de inicio (since 2020).', m.group(0)))
    # --- conectores
    if re.search(r'\b(although|though|even though)\b', low) and re.search(r',\s*but\b', low):
        add(_v('although_but', '«although» y «but» no van juntos: usa solo uno', 'Although … , … (sin but) / … , but …', 'but'))
    for m in re.finditer(r'\bbecause of\s+(i|he|she|it|we|they|the \w+ (?:is|was|are|were))\b', low):
        add(_v('because_of', '«because of» va con sustantivo; con oración (sujeto + verbo) va «because»', 'Because + sujeto y verbo; because of + sustantivo (because of the rain).', m.group(0)))
    for m in re.finditer(r'\bbecause\s+(the|a|an|his|her|their|my)\s+(\w+)\s*(?:[,.]|$)', low):
        add(_v('because_n', '«because» + solo sustantivo → «because of»', 'Because + sujeto y verbo; because of + sustantivo.', m.group(0), 0.8))
    for m in re.finditer(r'\b(despite|in spite of)\s+(of\s+)?(i|he|she|it|we|they|the \w+ (?:is|was|are|were))\b', low):
        add(_v('despite', '«%s» va con sustantivo o -ing; con oración va «although»' % m.group(1), 'Despite / in spite of + sustantivo o -ing; although + oración.', m.group(0)))
    if re.search(r'\bdespite of\b', low):
        add(_v('despite_of', '«despite of» no existe: «despite» o «in spite of»', 'Despite (sin of) = in spite of.', 'despite of'))
    for m in re.finditer(r'\b(although|even though|though)\s+(the|a|an|his|her|their|my)\s+(\w+)\s*(?:,|$)', low):
        add(_v('although_n', '«%s» necesita oración (sujeto + verbo); con sustantivo usa «despite»' % m.group(1), 'Although + oración; despite + sustantivo.', m.group(0)))
    for m in re.finditer(r'\b(unless)\s+(\w+\s+)?(not|don\'t|doesn\'t|didn\'t)\b', low):
        add(_v('unless_not', '«unless» ya es negativo (= if not): no lleva otro «not»', 'Unless = if … not.', m.group(0)))
    for m in re.finditer(r'\b(not|never|n\'t)\s+(?:\w+\s+){0,3}?(nothing|nobody|no one|nowhere|none|never)\b', low):
        add(_v('doble_neg', 'doble negación: con «not» va «anything / anybody / anywhere / ever»', 'En inglés solo una negación por oración (I don\'t need anything).', m.group(0)))
    for m in re.finditer(r'\bso\s+(a|an)\s+\w+', low):
        add(_v('so_such', '«so a …» → «such a …» (such + a + adjetivo + sustantivo)', 'Such (a) + adjetivo + sustantivo; so + adjetivo solo.', m.group(0)))
    for m in re.finditer(r'\bsuch\s+(\w+)\s+(that|[.!?]|$)', low):
        if tipo_palabra(m.group(1)) in ('adjetivo',) or m.group(1) in ('big', 'good', 'bad', 'hot', 'cold', 'fast', 'late', 'tired', 'happy', 'nice', 'difficult', 'easy', 'expensive', 'beautiful', 'important'):
            add(_v('such_so', '«such %s» (sin sustantivo) → «so %s»' % (m.group(1), m.group(1)), 'So + adjetivo (so hot that…); such + (a) + adjetivo + sustantivo.', m.group(0)))
    for m in re.finditer(r'\benough\s+(big|old|tall|good|fast|strong|warm|cold|hot|rich|smart|easy|long|large|old|young|quiet|clean|ready|close|near|high|early|late|experienced|qualified|mature)\b', low):
        add(_v('enough', '«enough %s» → «%s enough» (enough va DESPUÉS del adjetivo)' % (m.group(1), m.group(1)), 'Adjetivo + enough (old enough); enough + sustantivo (enough money).', m.group(0)))
    for m in re.finditer(r'\btoo\s+much\s+(big|hot|cold|expensive|difficult|easy|tired|fast|slow|late|early|old|young|good|bad|small|heavy|long|short|far|loud)\b', low):
        add(_v('too_much', '«too much %s» → «too %s»' % (m.group(1), m.group(1)), 'Too + adjetivo; too much + sustantivo incontable.', m.group(0)))
    for m in re.finditer(r'\b(say|says|said|saying)\s+(me|him|her|us|them|you)\b', low):
        add(_v('say_tell', '«%s %s» → «told %s» (tell + persona) o «said to %s»' % (m.group(1), m.group(2), m.group(2), m.group(2)), 'Tell + persona (tell me); say + algo (say hello), say to + persona.', m.group(0)))
    for m in re.finditer(r'\b(tell|tells|told)\s+(that|hello|goodbye|something|a word)\b', low):
        if m.group(2) not in ('something', 'a word'):
            add(_v('tell_say', '«%s %s» sin persona → «%s %s» (o «tell someone that…»)' % (m.group(1), m.group(2), {'tell': 'say', 'tells': 'says', 'told': 'said'}[m.group(1)], m.group(2)), 'Tell + persona (tell me that…); say + algo (say that…).', m.group(0)))
    MAKE = r'(?:a mistake|mistakes|a decision|decisions|progress|noise|money|friends|an effort|a plan|plans|a phone call|a call|a suggestion|a promise|an appointment|a choice|a difference|a complaint|an excuse|a list|a speech|dinner|breakfast|lunch|a cake|coffee|the bed|sense|fun of|a wish|an offer|a profit|a comment|a reservation)'
    DO = r'(?:homework|research|business|a favor|a favour|the job|a job|your best|my best|his best|her best|the dishes|the laundry|the shopping|exercise|an exercise|exercises|harm|damage|the housework|housework|the cleaning|an experiment|a test|a course|well|badly|work|a project|an assignment|nothing|something|anything)'
    for m in re.finditer(r'\b(do|does|did|doing|done)\s+(' + MAKE + r')\b', low):
        add(_v('make_do', '«%s %s» → con «%s» se usa MAKE' % (m.group(1), m.group(2), m.group(2)), 'Make = crear/producir (make a mistake, a decision, money, progress, noise); do = tareas y actividades (do homework, research, a favor, exercise).', m.group(0)))
    for m in re.finditer(r'\b(make|makes|made|making)\s+(' + DO + r')\b', low):
        if m.group(2) in ('nothing', 'something', 'anything', 'well', 'work'):
            continue
        add(_v('make_do', '«%s %s» → con «%s» se usa DO' % (m.group(1), m.group(2), m.group(2)), 'Make = crear/producir (make a mistake, a decision, money, progress, noise); do = tareas y actividades (do homework, research, a favor, exercise).', m.group(0)))
    # --- preguntas indirectas y directas
    for m in re.finditer(r'\b(know|tell me|tell us|wonder|wondering|wondered|ask|asked|explain|sure|idea|understand|remember|find out|show me|guess)\s+(where|what|when|why|how|who|which|if|whether|how much|how many|how long|what time)\s+(is|are|was|were|do|does|did|can|could|will|would|has|have|should)\s+(the|a|an|my|your|his|her|their|our|i|you|he|she|it|we|they|this|that)\b', low):
        add(_v('indirecta', 'pregunta indirecta («%s %s…»): va sujeto + verbo, sin invertir ni usar do/does' % (m.group(1), m.group(2)),
               'Do you know where the station IS? (no «where is the station»). Después de know / tell me / wonder: sujeto antes del verbo.', m.group(0)))
    if oracion.strip().endswith('?'):
        m = re.match(r'\s*(where|what|when|why|how|who|which|how much|how many|how long|what time)\s+(i|you|he|she|it|we|they|the \w+|your \w+|his \w+|her \w+)\s+(\w+)', low)
        if m and m.group(1) != 'who' and (formas(m.group(3)) & {'base', 's3', 'past', 'pres'} or m.group(3) in ('are', 'is', 'was', 'were', 'can', 'will')):
            add(_v('directa', 'pregunta directa: el auxiliar va antes del sujeto («%s do/does/did %s…» o «%s is %s…»)' % (m.group(1), m.group(2), m.group(1), m.group(2)),
                   'Pregunta directa: wh- + auxiliar + sujeto + verbo (Where do you live? Where is she?).', m.group(0)))
        m = re.match(r'\s*(do|does|did)\s+(i|you|he|she|it|we|they|the \w+)\s+(\w+)', low)
        if m and m.group(1) == 'do' and m.group(2) in ('he', 'she', 'it'):
            add(_v('do_does', '«do %s» → «does %s»' % (m.group(2), m.group(2)), 'Does con he/she/it; do con I/you/we/they.', m.group(0)))
        if m and m.group(1) == 'does' and m.group(2) in ('i', 'you', 'we', 'they'):
            add(_v('do_does', '«does %s» → «do %s»' % (m.group(2), m.group(2)), 'Does con he/she/it; do con I/you/we/they.', m.group(0)))
    # --- paralelismo
    m = re.search(r'\b(\w+ing|to \w+|\w+)\s*,\s*(\w+ing|to \w+|\w+)\s*,?\s*(and|or)\s+(\w+ing|to \w+)\b', low)
    if m:
        ks = [('ing' if g.endswith('ing') and not g.startswith('to ') else 'to' if g.startswith('to ') else 'x') for g in (m.group(1), m.group(2), m.group(4))]
        if 'x' not in ks and len(set(ks)) > 1:
            add(_v('paralelo', 'en una lista todo va igual (todo -ing o todo to + verbo)', 'Paralelismo: swimming, running, and hiking (no swimming, to run, and hiking).', m.group(0)))
    _reglas_extra(low, oracion, add)
    return P


CONTABLES = set("""umbrella apple orange egg idea book car house dog cat friend job pen pencil chair table phone computer question
answer problem student teacher doctor nurse engineer lawyer artist bag ticket hour island hotel university uniform window
door room bed box letter email message umbrella animal elephant onion ice-cream exam test movie song city country student
child girl boy woman man person bike bicycle bus train plane boat camera watch key map picture photo shirt dress coat jacket
hat shoe sandwich hamburger banana cake cookie restaurant school office hospital airport station museum library bank park
store shop apartment flat garden kitchen bathroom newspaper magazine novel story game ball toy gift present chance mistake
decision choice plan reason example problem accident opinion umbrella engineer actor actress architect astronaut""".split())
VERBO_LIGA = r'(?:am|is|are|was|were|be|been|seems?|seemed|looks?|looked|feels?|felt|sounds?|sounded|becomes?|became|remains?|remained)'
ABSTRACTOS_DE_ADJ = {'beauty', 'care', 'quickness', 'happiness', 'success', 'perfection', 'danger', 'honesty', 'safety',
                     'patience', 'fluency', 'clarity', 'accuracy', 'efficiency', 'ease', 'silence', 'quietness', 'slowness',
                     'carefulness', 'politeness', 'rudeness', 'seriousness', 'sadness', 'loudness', 'correctness', 'significance',
                     'frequency', 'regularity', 'gradualness', 'suddenness', 'completion', 'beautify'}


def _es_adj(w):
    if IO is not None:
        global _DIC
        if _DIC is None:
            _DIC = IO.Diccionario(None)
        if w in _DIC.adj:
            return True
    return tipo_palabra(w) == 'adjetivo' or w in ('hot', 'cold', 'big', 'small', 'tall', 'short', 'good', 'bad', 'old', 'young',
                                                   'happy', 'sad', 'tired', 'busy', 'late', 'early', 'easy', 'hard', 'nice', 'fast',
                                                   'honest', 'kind', 'smart', 'clever', 'great', 'new', 'rich', 'poor', 'strong', 'weak',
                                                   'simple', 'quiet', 'famous', 'important', 'interesting', 'beautiful', 'ugly', 'excellent',
                                                   'useful', 'expensive', 'cheap', 'difficult', 'wonderful', 'terrible', 'amazing', 'funny',
                                                   'clear', 'careful', 'quick', 'slow', 'loud', 'polite', 'rude', 'fluent', 'correct',
                                                   'patient', 'safe', 'dangerous', 'perfect', 'serious', 'careless', 'quiet', 'calm', 'proud',
                                                   'angry', 'brave', 'bright', 'dark', 'warm', 'cool', 'dirty', 'clean', 'full', 'empty')


def _es_comparativo(w):
    if w in ('better', 'worse', 'more', 'less', 'farther', 'further'):
        return True
    if not w.endswith('er') or len(w) < 5:
        return False
    r = w[:-2]
    return any(_es_adj(c) for c in (r, r + 'e', r[:-1] if len(r) > 2 and r[-1] == r[-2] else '', r[:-1] + 'y' if r.endswith('i') else '') if c)


def _hay_finito(low):
    if re.search(r'\b(am|is|are|was|were|can|could|will|would|shall|should|may|might|must|do|does|did|have|has|had)\b', low):
        return True
    if [v for v in _verbos_finitos(low) if v[0] not in ('united', 'used', 'based')]:
        return True
    ws = re.findall(r'[a-z]+', low)
    det = {'the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their', 'its', 'this', 'that', 'western', 'eastern', 'northern', 'southern', 'very', 'well', 'newly', 'recently'}
    return any('past' in formas(w) and tipo_palabra(w) == 'verbo' and ws[i - 1] not in det and w not in ('united', 'used', 'based')
               for i, w in enumerate(ws) if i > 0)


def _reglas_extra(low, oracion, add):
    """Reglas que cubren las opciones «basura» típicas de los quizzes (sin verbo, dos verbos, very + sustantivo…)."""
    primera = (re.findall(r'[a-z]+', low) or [''])[0]
    imperativo = 'base' in formas(primera) and primera not in SUJ and not es_sustantivo(primera)
    # sin verbo conjugado
    if not imperativo and len(low.split()) >= 3 and not _hay_finito(low) and not oracion.strip().endswith(':'):
        add(_v('sin_verbo', 'la oración se queda sin verbo conjugado (una forma -ing o un participio solos no son verbo)',
               'Toda oración necesita sujeto + verbo conjugado (Every student HAS a book; the book IS read…).', '', 0.9))
    # sujeto + not + verbo (falta do/does/did)
    for m in re.finditer(r'\b(i|you|he|she|it|we|they)\s+not\s+(\w+)\b', low):
        v = m.group(2)
        f = formas(v)
        if f & {'base', 's3', 'past', 'pp'} and 'be' not in f and 'modal' not in f and v not in ('have', 'has', 'had', 'only', 'yet'):
            aux = 'does' if m.group(1) in ('he', 'she', 'it') else 'do'
            add(_v('not_sin_aux', '«%s not %s»: para negar hace falta auxiliar («%s %s not %s», «%s did not %s», o «has not %s»)' % (
                m.group(1), v, m.group(1), aux, base_de(v) or v, m.group(1), base_de(v) or v, PP_DE.get(base_de(v) or v, (base_de(v) or v) + 'ed')),
                   'Negación: do/does/did + not + verbo base (he doesn\'t like); o have/has + not + participio.', m.group(0)))
    # dos verbos conjugados seguidos (stopped smoked)
    for m in re.finditer(r'\b(\w+)\s+(?=(\w+)\b)', low):
        v1, v2 = m.groups()
        f1, f2 = formas(v1), formas(v2)
        b1 = base_de(v1) or ''
        if not (f1 & {'past', 's3', 'base'}) or 'be' in f1 or 'modal' in f1 or b1 in CAUSATIVOS | {'get', 'become', 'seem', 'have', 'do', 'go', 'feel', 'keep', 'stay', 'look', 'sound', 'remain', 'appear', 'make', 'need'} \
                or tipo_palabra(v1) != 'verbo':
            continue
        if 'past' in f2 and 'base' not in f2 and not es_sustantivo(v2) and v2 not in ('used', 'called', 'named', 'tired', 'interested', 'married', 'excited', 'bored', 'worried', 'scared', 'lost', 'finished', 'done', 'gone', 'left'):
            add(_v('dos_verbos', '«%s %s»: dos verbos conjugados seguidos; el segundo va en -ing o con «to»' % (v1, v2),
                   'Después de un verbo, el segundo va en -ing (stopped smoking) o to + base (decided to go), nunca conjugado.', v1 + ' ' + v2))
    # verbos con -ing / to seguidos de verbo base pelón
    for m in re.finditer(r'\b(\w+)\s+(?=(\w+)\b)', low):
        v1, v2 = m.groups()
        b1 = base_de(v1) or ''
        f2 = formas(v2)
        if b1 in (SOLO_ING | SOLO_TO | {'stop', 'start', 'begin', 'like', 'love', 'hate', 'remember', 'forget', 'try'}) - {'practice', 'practise', 'need', 'help', 'ask'} \
                and tipo_palabra(v1) == 'verbo' and v1 not in ('like',) and 'base' in f2 and 'ing' not in f2 and 'modal' not in f2 and not _es_adj(v2) and v2 not in ('to', 'it', 'him', 'her', 'them', 'me', 'us', 'you', 'that', 'this', 'the', 'a', 'an'):
            add(_v('verbo_base', '«%s %s»: después de «%s» el otro verbo va %s' % (v1, v2, b1, ('en -ing («%s %s»)' % (v1, _ing(v2))) if b1 in SOLO_ING else ('con to («%s to %s»)' % (v1, v2)) if b1 in SOLO_TO else 'en -ing o con to'),
                   'Stop / enjoy / finish / avoid + -ing; decide / want + to + verbo. Nunca dos verbos pegados en forma base.', v1 + ' ' + v2, 0.8))
    # make/let + persona + pasado
    for m in re.finditer(r'\b(make|makes|made|let|lets)\s+(me|you|him|her|us|them|\w+)\s+(\w+)\b', low):
        v = m.group(3)
        f = formas(v)
        if f & {'past', 'pp', 's3'} and 'base' not in f and not es_sustantivo(v):
            add(_v('caus_past', '«%s %s %s»: con make/let el verbo va en forma base («%s %s %s»)' % (m.group(1), m.group(2), v, m.group(1), m.group(2), base_de(v) or v),
                   'Make / let + persona + verbo base (he made me wash the dishes).', m.group(0)))
    # to + pasado/participio (también después de used to / look forward to)
    for m in re.finditer(r'\bto\s+(\w+)\b', low):
        v = m.group(1)
        f = formas(v)
        if f & {'past', 'pp'} and 'base' not in f and 'ing' not in f and not es_sustantivo(v) and tipo_palabra(v) == 'verbo' and not _es_adj(v):
            add(_v('to_past', '«to %s»: después de «to» nunca va pasado ni participio' % v,
                   'To + verbo base (to go) o, si el «to» es preposición (used to, look forward to), -ing (used to waking up).', m.group(0)))
    # very / too / so + sustantivo o verbo
    for m in re.finditer(r'\b(very|too|so|quite|extremely|really)\s+(\w+)\b', low):
        w = m.group(2)
        if w in ('much', 'many', 'well', 'little', 'few', 'far', 'often', 'long', 'soon', 'fast', 'hard', 'late', 'early', 'first', 'last', 'same', 'that', 'the', 'a', 'to', 'i', 'he', 'she', 'it', 'we', 'they', 'you', 'is', 'are', 'was'):
            continue
        if _es_adj(w) or w.endswith(('ed', 'ing', 'ly')):
            continue
        if re.search(r'(dom|ness|ity|tion|sion|ment|ance|ence)$', w) or (tipo_palabra(w) == 'verbo' and not es_sustantivo(w)) or w in ABSTRACTOS_DE_ADJ:
            add(_v('very_adj', '«%s %s»: después de «%s» va adjetivo o adverbio, no %s' % (m.group(1), w, m.group(1), 'sustantivo' if es_sustantivo(w) or w in ABSTRACTOS_DE_ADJ or re.search(r'(dom|ness|ity|tion|sion|ment|ance|ence)$', w) else 'verbo'),
                   'Very / too / so + adjetivo (very boring) o adverbio (very quickly).', m.group(0), 0.9))
    # much + adjetivo normal
    for m in re.finditer(r'\b(very much|so much|too much|much)\s+(\w+)\b', low):
        w = m.group(2)
        if _es_adj(w) and not _es_comparativo(w) and not es_sustantivo(w) and w not in ('more', 'less', 'better', 'worse', 'too', 'the', 'of', 'like', 'own'):
            add(_v('much_adj', '«%s %s»: «much» no va con adjetivo normal; usa very / too / so («too %s»)' % (m.group(1), w, w),
                   'Much solo con comparativos (much bigger) o sustantivos incontables (much money); con adjetivo: very / too / so.', m.group(0)))
    # lot sin «a»
    for m in re.finditer(r'\b(\w+)\s+lot\b', low):
        if m.group(1) not in ('a', 'the', 'parking', 'this', 'that', 'whole', 'empty', 'one', 'each'):
            add(_v('a_lot', '«%s lot» → «a lot (of)»' % m.group(1), 'A lot of + sustantivo; how much / how many para preguntar cantidad.', m.group(0)))
    # comparativo con «ever» / sin than → superlativo
    if re.search(r'\b(have|has|had|i\'ve)\s+ever\b|\bin (the|my|our) (world|class|family|school|city|country)\b|\bof all\b', low) and ' than ' not in low:
        for m in re.finditer(r'\b(?:(the|a|an)\s+)?(more|less)\s+(\w+)\b|\b(?:(the|a|an)\s+)?(\w+er)\s+(\w+)\b', low):
            if m.group(2) and _es_adj(m.group(3)) or m.group(5) and _es_comparativo(m.group(5)):
                add(_v('comp_ever', 'con «ever» / «in the world» / «of all» se compara contra todos: va superlativo (the most… / the -est)',
                       'Superlativo = the + most / -est: the most interesting book I have ever read.', m.group(0)))
                break
    # artículo que falta: verbo + sustantivo contable en singular
    for m in re.finditer(r'\b(need|needs|needed|want|wants|wanted|have|has|had|buy|buys|bought|get|got|is|was|am|be|saw|see|found|find)\s+(?:(more|most)\s+(\w+)\s+)?(\w+)\b', low):
        n = m.group(4)
        if m.group(2) and not _es_adj(m.group(3)):
            continue
        if n in CONTABLES or (IO is not None and _DIC is not None and _DIC.sustantivo(n) and n in CONTABLES):
            if n not in INCONTABLES and n not in ('home', 'school', 'work', 'class', 'bed', 'church', 'college', 'university', 'breakfast', 'lunch', 'dinner', 'time', 'fun', 'hospital'):
                add(_v('art_falta', '«%s»: sustantivo contable en singular sin artículo; necesita a / an / the' % n,
                       'Contable en singular siempre lleva determinante: a / an (uno cualquiera), the (uno específico), my…', m.group(0), 0.8))

    # present perfect + during/from + punto de inicio → since
    if re.search(r'\b(have|has)\s+(?:not\s+)?(?:been|\w+ed|lived|known|worked|had|taught|studied)\b', low):
        for m in re.finditer(r'\b(during|from|in)\s+((?:19|20)\d\d|last \w+|monday|january|i was|he was|she was|childhood)\b', low):
            if not re.search(r'\bfrom\b.*\b(to|until|till)\b', low):
                add(_v('since_punto', '«%s %s» con present perfect → «since %s» (desde ese momento hasta hoy)' % (m.group(1), m.group(2), m.group(2)),
                       'Present perfect + since + punto de inicio (since 2010) / for + duración (for 5 years).', m.group(0)))
    # tiempos mezclados con when/while (They have dinner when I called)
    fin = _verbos_finitos(low)
    if re.search(r'\b(when|while|as soon as|after|before)\b', low) and any(t == 'past' for _v2, _i, t in fin):
        for v, ini, tipo in fin:
            if tipo in ('base_pres', 's3', 'pres') and v not in ('am', 'is', 'are') or (tipo in ('s3', 'pres') and v in ('am', 'is', 'are') and re.search(r'\b(when|while)\s+(i|you|he|she|it|we|they)\s+\w+ed\b|\b(when|while)\s+\w+\s+(called|came|arrived|saw|got|left|knocked|rang)\b', low)):
                add(_v('t_mezcla', 'la otra parte está en pasado («%s»): «%s» también va en pasado (pasado continuo si era algo en progreso)' % (
                    next(v2 for v2, _i, t in fin if t == 'past'), v),
                       'Pasado continuo + when + pasado simple: They were having dinner when I called.', v, 0.8))
                break
    # stop to vs stop -ing (cambia el sentido)
    if re.search(r'\b(stop|stops|stopped|quit)\s+to\s+\w+', low) and re.search(r'\b(because|bad for|health|unhealthy|habit|anymore|any more|doctor|harmful)\b', low):
        add(_v('stop_to', '«stop to + verbo» = detenerse PARA hacer algo; aquí se trata de DEJAR de hacerlo: «stop + -ing»',
               'Stop + -ing = dejar de (stopped smoking); stop + to = parar para (stopped to smoke = se detuvo para fumar).', re.search(r'\b(stop|stops|stopped|quit)\s+to\s+\w+', low).group(0), 0.7))
    # am/is/was + been → have/has been
    for m in re.finditer(r'\b(i|you|he|she|it|we|they)\s+(am|is|are|was|were)\s+(?:never\s+|ever\s+|already\s+|just\s+|not\s+)?been\b', low):
        bien = 'has' if m.group(1) in ('he', 'she', 'it') else 'have'
        add(_v('be_been', '«%s %s … been»: «been» va con have/has («%s %s been»)' % (m.group(1), m.group(2), m.group(1), bien),
               'Present perfect = have/has + participio (I have never been to Paris).', m.group(0)))
    # verbo + adjetivo + sustantivo contable sin artículo (She is honest woman)
    for m in re.finditer(r'\b(is|was|am|are|be|need|needs|needed|have|has|had|bought|buy|want|wants|saw|found)\s+(\w+)\s+(\w+)\b', low):
        if _es_adj(m.group(2)) and m.group(3) in CONTABLES and m.group(2) not in ('a', 'an', 'the', 'more', 'most', 'my', 'your', 'his', 'her', 'their', 'our', 'its', 'no', 'one', 'another', 'every', 'each', 'this', 'that'):
            add(_v('art_falta', '«%s %s»: sustantivo contable en singular sin artículo; necesita a / an / the' % (m.group(2), m.group(3)),
                   'Contable en singular siempre lleva determinante: a / an (uno cualquiera), the (uno específico), my…', m.group(0), 0.8))
    # participios que piden be (The mountains are located in…)
    PART_BE = r'(?:located|situated|born|founded|composed|built|made|known|considered|named|called|surrounded|covered|written|designed|developed|discovered|invented|produced|caused|based)'
    for m in re.finditer(r'\b(\w+)\s+(?:(?:mainly|mostly|largely|primarily|originally|first)\s+)?(' + PART_BE + r')\s+(in|on|at|by|of|as|near|between|from|with|around|for)\b', low):
        prev = m.group(1)
        if prev in BE or prev in ('have', 'has', 'had', 'get', 'got', 'being', 'and', 'or', 'not', 'newly', 'recently', 'well') or prev in MODALES:
            continue
        antes = low[:m.start()].rstrip()
        if antes.endswith(',') or re.search(r'\b(is|are|was|were|be|been)\s*$', antes):
            continue
        if prev in ('which', 'who', 'that') or es_sustantivo(prev) or prev.endswith('s') or prev in SUJ:
            if prev not in ('which', 'who', 'that') and _hay_finito(low.replace(m.group(0), ' ')):
                continue  # «the city founded in 1500 is…» (participio que describe) — ya hay otro verbo
            be = 'is/are' if prev in ('which', 'who', 'that') else ('are' if prev.endswith('s') and not prev.endswith('ss') else 'is')
            add(_v('falta_be', '«%s %s»: aquí va voz pasiva, falta «be» («%s %s %s»)' % (prev, m.group(2), prev, be, m.group(2)),
                   'Pasiva = be + participio: The Rocky Mountains ARE located in…; which ARE located…', m.group(0)))
    # very + comparativo
    for m in re.finditer(r'\b(very|so|too)\s+(\w+)\b', low):
        if _es_comparativo(m.group(2)) and m.group(2) not in ('more', 'less', 'better', 'further') and not es_sustantivo(m.group(2)):
            add(_v('very_comp', '«%s %s»: con comparativo va «much / far» («much %s»), y sin comparación va el adjetivo normal' % (m.group(1), m.group(2), m.group(2)),
                   'Very + adjetivo normal (very clear); much + comparativo (much clearer).', m.group(0)))
    # verbo de acción … very/so + adjetivo al final (explained the lesson very clear)
    if re.search(r'\b(explained|explains|explain|spoke|speaks|speak|talked|talks|drove|drives|drive|worked|works|ran|runs|sang|sings|wrote|writes|answered|did|played|plays|moved|moves|walked|walks|reacted|behaved|danced|dances|studied|studies|cooked|cooks|played)\b', low) \
            and not re.search(r'\b(is|are|was|were|seems?|seemed|looks?|looked|became|becomes)\b', low):
        m = re.search(r'\b(very|so|really|too|quite|extremely|more)\s+(\w+)\s*[.!?]?\s*$', low)
        if m and _es_adj(m.group(2)) and not m.group(2).endswith('ly') and not _es_comparativo(m.group(2)) and m.group(2) not in ('well', 'fast', 'hard', 'late', 'early', 'much', 'often', 'long'):
            add(_v('adj_adv', 'dice CÓMO se hizo la acción: va adverbio («%s %s»), no adjetivo' % (m.group(1), _ly(m.group(2))),
                   'Verbo de acción (+ objeto) + adverbio: explained the lesson very clearly.', m.group(0)))
    # look forward sin «to»
    for m in re.finditer(r'\blook(?:s|ed|ing)? forward\s+(?!to\b)(\w+)', low):
        add(_v('forward_to', '«look forward» siempre lleva «to» + -ing («look forward to %s»)' % _ing(m.group(1)), 'Look forward TO + -ing (I look forward to hearing from you).', m.group(0)))
    # for + duración con presente → present perfect
    md = re.search(r'\bfor\s+(?:\d+|two|three|four|five|six|seven|eight|nine|ten|many|several|a few|a long)\s+(?:years?|months?|weeks?|days?|hours?|time)\b', low)
    if md and not re.search(HABITO_MARCAS, low) and not re.search(PASADO_MARCAS, low) and not re.search(FUTURO_MARCAS, low) \
            and not re.search(r'\b(every|each|per|a day|a week|usually|will|going to|next|ago|when|last)\b', low):
        for v, ini, tipo in _verbos_finitos(low):
            if ini < md.start() and tipo in ('s3', 'base_pres', 'pres') and v not in ('am', 'is', 'are'):
                add(_v('for_perf', 'con «%s» (tiempo que lleva hasta hoy) va present perfect («has/have + participio»), no «%s»' % (md.group(0), v),
                       'For + duración hasta ahora → present perfect (She has studied English for five years).', v, 0.8))
                break
        if re.search(r'\b(am|is|are)\s+\w+ing\b', low) and md:
            ms = re.search(r'\b(am|is|are)\s+\w+ing\b', low)
            if ms.start() < md.start():
                add(_v('for_perf', 'con «%s» (tiempo que lleva hasta hoy) va present perfect («has studied» o «has been studying»)' % md.group(0),
                       'For + duración hasta ahora → present perfect (She has studied English for five years).', ms.group(0), 0.8))
    # works on/to + lugar
    for m in re.finditer(r'\b(work|works|worked|working|study|studies|studied|studying)\s+(on|to)\s+(?:a|an|the|my|his|her)\s+(hospital|school|bank|office|factory|restaurant|store|shop|company|university|hotel|supermarket|library)\b', low):
        add(_v('work_in', '«%s %s a %s» → «%s in/at a %s»' % (m.group(1), m.group(2), m.group(3), m.group(1), m.group(3)),
               'Work in / at + lugar (works in a hospital, at a bank). Work on = trabajar EN un proyecto.', m.group(0)))
    # there be
    for m in re.finditer(r'\bthere be\b', low):
        if not re.search(r'\b(will|would|can|could|should|must|might|may|to|let|going to)\s*$', low[:m.start()]):
            add(_v('there_be', '«there be» → «there is/are» (o «there was/were» en pasado)', 'There is / there are (presente), there was / there were (pasado).', m.group(0)))
    # who/which/whom + sustantivo + verbo → whose
    for m in re.finditer(r'\b(who|whom|which|that)\s+(\w+)\s+(is|was|are|were|has|had|have)\b', low):
        n = m.group(2)
        if (n in CONTABLES or es_sustantivo(n)) and n not in SUJ and n not in ('people', 'everyone') and tipo_palabra(n) != 'verbo':
            add(_v('whose', '«%s %s»: para decir «de quien» (posesión) va «whose %s»' % (m.group(1), n, n),
                   'Whose = de quien / cuyo (the woman whose car was stolen).', m.group(0)))
    # perfecto activo + by → voz pasiva
    for m in re.finditer(r'\b(has|have|had)\s+(\w+)\s+by\b', low):
        if 'pp' in formas(m.group(2)) and m.group(2) != 'been':
            add(_v('pasiva', '«%s %s by…»: si alguien lo hace (by…), es voz pasiva: «%s been %s»' % (m.group(1), m.group(2), m.group(1), m.group(2)),
                   'Pasiva = be + participio (has been read by millions).', m.group(0)))
    # pregunta indirecta con verbo antes del sujeto (where lives she)
    for m in re.finditer(r'\b(know|tell me|wonder|ask|asked|sure|idea|understand|remember)\s+(where|what|when|why|how|who)\s+(\w+)\s+(i|you|he|she|it|we|they)\b', low):
        if formas(m.group(3)) & {'s3', 'past', 'base'}:
            add(_v('indirecta', 'pregunta indirecta: sujeto + verbo («%s %s %s»), no al revés' % (m.group(2), m.group(4), m.group(3)),
                   'Do you know where she lives? Después de know / tell me / wonder: sujeto antes del verbo.', m.group(0)))
    # tell to/for + persona, tell I
    for m in re.finditer(r'\b(tell|tells|told|telling)\s+(to|for)\s+(me|him|her|us|them|you|\w+)\b', low):
        add(_v('tell_to', '«%s %s %s» → «%s %s» (tell va directo con la persona)' % (m.group(1), m.group(2), m.group(3), m.group(1), m.group(3)),
               'Tell + persona sin preposición (tell me); say + algo (to someone).', m.group(0)))
    for m in re.finditer(r'\b(tell|tells|told|give|gives|gave|ask|asks|asked|help|helps|helped|call|called|invite|invited|love|loves|loved|meet|met|see|saw|show|showed)\s+(i|he|she|we|they)\b', low):
        if m.group(1) in ('see', 'saw', 'show', 'showed', 'meet', 'met') and re.search(r'\b(that|if)\s*$', low[:m.start()]):
            continue
        obj = {'i': 'me', 'he': 'him', 'she': 'her', 'we': 'us', 'they': 'them'}[m.group(2)]
        add(_v('pron_obj', 'después del verbo va pronombre de objeto («%s %s»)' % (m.group(1), obj), 'Sujeto: I, he, she, we, they. Objeto: me, him, her, us, them.', m.group(0)))
    # present simple con yet / already / so far
    if re.search(r'\b(yet|so far|already)\b', low):
        for v, ini, tipo in _verbos_finitos(low):
            if tipo in ('s3', 'base_pres', 'pres') and v not in ('is', 'am', 'are', 'have', 'has') and not re.search(r'\b(have|has)\s+(?:not\s+)?\w+', low):
                add(_v('t_yet', 'con «yet / already / so far» va present perfect («has finished»), no presente simple («%s»)' % v,
                       'Yet, already, so far → present perfect (He hasn\'t finished yet).', v))
                break
    # arrive in/on + lugar chico
    for m in re.finditer(r'\b(arrive|arrives|arrived|arriving)\s+(in|on)\s+the\s+(airport|station|bus stop|office|hotel|party|meeting|museum|restaurant|cinema|hospital|library|gate|school|stadium|house)\b', low):
        add(_v('arrive_at', '«arrive %s the %s» → «arrive at the %s» (lugar o punto concreto)' % (m.group(2), m.group(3), m.group(3)),
               'Arrive at + lugar concreto (the airport, the station); arrive in + ciudad o país.', m.group(0)))
    # good for/in + materia → good at
    for m in re.finditer(r'\b(good|bad|better|terrible|excellent|great|best|worst)\s+(for|in|on|with)\s+(math|maths|english|spanish|french|sports?|science|history|music|art|chemistry|physics|languages|soccer|football|tennis|chess|cooking|drawing|singing|dancing|swimming)\b', low):
        add(_v('good_at', '«%s %s %s» → «%s at %s» (hablar de habilidad)' % (m.group(1), m.group(2), m.group(3), m.group(1), m.group(3)),
               'Good / bad / excellent AT algo (habilidad). Good FOR = que le hace bien a algo.', m.group(0)))
    # visit to
    for m in re.finditer(r'\b(visit|visits|visited|visiting)\s+to\b', low):
        if not re.search(r'\b(a|the|my|your|his|her|our|their|first|last)\s*$', low[:m.start()]):
            add(_v('visit_to', '«%s to» → «%s» (visit va directo: visit my grandmother)' % (m.group(1), m.group(1)), 'Visit + lugar/persona sin preposición.', m.group(0)))
    # although … , so / and
    if re.search(r'\b(although|though|even though)\b', low) and re.search(r',\s*(so|and)\b', low):
        add(_v('although_so', '«although» ya une las dos ideas: no lleva «so» ni «and» después de la coma', 'Although … , … (sin but / so / and).', re.search(r',\s*(so|and)\b', low).group(0)))
    # verbo de acción + sustantivo abstracto (sings beauty)
    for m in re.finditer(r'\b(sings?|sang|speaks?|spoke|runs?|ran|drives?|drove|works?|worked|plays?|played|writes?|wrote|dances?|danced|talks?|talked|walks?|walked)\s+(\w+)\s*[.!?,]?\s*$', low):
        w = m.group(2)
        if w in ABSTRACTOS_DE_ADJ or re.search(r'(ness|ity|ance|ence)$', w):
            add(_v('sust_adv', '«%s %s»: «%s» es sustantivo; para decir CÓMO se hace va adverbio (-ly)' % (m.group(1), w, w),
                   'Verbo de acción + adverbio: sings beautifully, speaks fluently.', m.group(0)))
    for m in re.finditer(r'\b(sings?|sang|speaks?|spoke|runs?|ran|drives?|drove|works?|worked|dances?|danced|talks?|talked|walks?|walked|writes?|wrote)\s+(more|most|less)\s+(\w+)\s*[.!?,]?\s*$', low):
        if _es_adj(m.group(3)) and not m.group(3).endswith('ly'):
            add(_v('adj_adv', 'para decir CÓMO se hace la acción va adverbio («%s %s»), no adjetivo' % (m.group(2), _ly(m.group(3))),
                   'Verbo de acción + adverbio (-ly): sings more beautifully.', m.group(0)))


def _ing(v):
    v = base_de(v) or v
    if v.endswith('ie'):
        return v[:-2] + 'ying'
    if v.endswith('e') and v not in ('be', 'see', 'agree', 'free'):
        return v[:-1] + 'ing'
    if re.search(r'[^aeiou][aeiou][bdgmnprt]$', v) and len(v) <= 4:
        return v + v[-1] + 'ing'
    return v + 'ing'


def _s3(v):
    v = base_de(v) or v
    if v in ('have',):
        return 'has'
    if v in ('be',):
        return 'is'
    if re.search(r'(s|sh|ch|x|z|o)$', v):
        return v + 'es'
    if re.search(r'[^aeiou]y$', v):
        return v[:-1] + 'ies'
    return v + 's'


def _ly(a):
    if a.endswith('y'):
        return a[:-1] + 'ily'
    if a.endswith('le'):
        return a[:-1] + 'y'
    if a.endswith('ic'):
        return a + 'ally'
    return {'good': 'well', 'fast': 'fast', 'hard': 'hard', 'late': 'late', 'early': 'early'}.get(a, a + 'ly')


def _comp(a, sup=False):
    irreg = {'good': ('better', 'the best'), 'bad': ('worse', 'the worst'), 'far': ('farther', 'the farthest')}
    if a in irreg:
        return irreg[a][sup]
    if a.endswith('y'):
        r = a[:-1] + 'i'
    elif a.endswith('e'):
        r = a[:-1]
    elif re.search(r'[^aeiou][aeiou][^aeiouwy]$', a):
        r = a + a[-1]
    else:
        r = a
    return ('the ' + r + 'est') if sup else (r + 'er')


def _verbos_finitos(low):
    """Verbo(s) principal(es) con su tiempo: [(texto, posición, tipo)] tipo = past | pres | s3 | base_pres | fut | perf | cont."""
    out = []
    for m in re.finditer(r'\b(will|shall|am going to|is going to|are going to)\s+(?:not\s+)?(\w+)', low):
        out.append((m.group(0), m.start(), 'fut'))
    for m in re.finditer(r'\b(have|has|had)\s+(?:not\s+|never\s+|already\s+|just\s+|ever\s+)?(\w+)', low):
        if 'pp' in formas(m.group(2)):
            out.append((m.group(0), m.start(), 'perf' if m.group(1) != 'had' else 'pastperf'))
    for m in re.finditer(r'\b(i|you|he|she|it|we|they|people|the \w+|my \w+|\w+s)\s+(?:' + ADV_FREC + r'\s+|not\s+)?(\w+)\b', low):
        v = m.group(2)
        if any(m.start(2) >= o[1] and m.start(2) <= o[1] + len(o[0]) for o in out):
            continue
        prev = low[max(0, m.start() - 12):m.start()]
        if re.search(r'\b(will|would|can|could|should|must|might|may|do|does|did|to)\s*$', prev):
            continue
        f = formas(v)
        if v in ('am', 'is', 'are'):
            out.append((v, m.start(2), 's3' if v == 'is' else 'pres'))
        elif v in ('was', 'were'):
            out.append((v, m.start(2), 'past'))
        elif v in ('do', 'does', 'did'):
            out.append((v, m.start(2), 'past' if v == 'did' else ('s3' if v == 'does' else 'base_pres')))
        elif v in ('will', 'shall'):
            continue
        elif v in ('have', 'has', 'had'):
            if not any(o[1] == m.start(2) for o in out):
                out.append((v, m.start(2), 'past' if v == 'had' else ('s3' if v == 'has' else 'base_pres')))
        elif f & {'past'} and 'base' not in f:
            out.append((v, m.start(2), 'past'))
        elif 's3' in f and 'base' not in f and tipo_palabra(v) == 'verbo':
            out.append((v, m.start(2), 's3'))
        elif 'base' in f and tipo_palabra(v) == 'verbo' and not es_sustantivo(v):
            out.append((v, m.start(2), 'base_pres'))
    return out


# ------------------------------------------------------------------ leer el quiz pegado
OPCION = re.compile(r'^\s*(?:\(([a-eA-E])\)|([a-eA-E])[\)\.\-:]|([a-eA-E])\s+\))\s*(.+?)\s*$')
OPCIONES_EN_LINEA = re.compile(r'(?:^|\s)\(?([a-eA-E])[\)\.]\s+')
BUSCA_ERROR = re.compile(r'\b(error|incorrect|not correct|mistake|wrong|needs? to be (corrected|changed)|ungrammatical)\b', re.I)
HUECO = re.compile(r'_{2,}|\(\s*\)|\[\s*\]|…{1,}|\.{3,}|-{3,}')


def leer_quiz(texto):
    """Separa el texto pegado en preguntas: [{'pregunta', 'opciones': [(letra, texto)], 'contexto'}]."""
    lineas = [l.rstrip() for l in (texto or '').replace('\r', '').split('\n')]
    preguntas, actual, contexto = [], None, []
    for l in lineas:
        if not l.strip():
            continue
        m = OPCION.match(l)
        if m and actual is not None:
            letra = (m.group(1) or m.group(2) or m.group(3)).lower()
            # «a) go b) goes» en la misma línea
            resto = m.group(4)
            partes = _partir_en_linea('%s) %s' % (letra, resto))
            actual['opciones'] += partes or [(letra, resto)]
            continue
        partes = _partir_en_linea(l)
        if len(partes) >= 2 and actual is not None and not actual['opciones'] and BUSCA_ERROR.search(actual['pregunta']):
            # la oración con las partes marcadas (A) (B)… de «encuentra el error»: es parte de la pregunta
            actual['pregunta'] += ' ' + l.strip()
            actual['marcas'] = partes
            continue
        if len(partes) >= 2:
            ini = OPCIONES_EN_LINEA.search(l)
            enunciado = l[:ini.start()].strip() if ini else ''
            if enunciado and BUSCA_ERROR.search(enunciado) and not HUECO.search(l):
                # «Identify the error: My sister (A) have lived (B) …» todo en una línea
                actual = {'pregunta': _sin_numero(l.strip()), 'opciones': partes, 'contexto': ' '.join(contexto)}
                preguntas.append(actual)
                continue
            if enunciado:
                actual = {'pregunta': _sin_numero(enunciado), 'opciones': [], 'contexto': ' '.join(contexto)}
                preguntas.append(actual)
            elif actual is None:
                continue
            actual['opciones'] += partes
            continue
        if actual is not None and not actual['opciones']:
            actual['pregunta'] += ' ' + l.strip()
            continue
        if actual is not None and actual['opciones'] and re.match(r'^\s*\d+[\.\)]', l) is None and not HUECO.search(l) and not l.strip().endswith('?') and len(l) > 200:
            contexto.append(l.strip())
            continue
        if HUECO.search(l) or l.strip().endswith('?') or re.match(r'^\s*\d+[\.\)]\s', l) or re.search(r'\b(choose|select|which|identify|correct|incorrect|error|mistake|complete|fill|meaning|closest|synonym|refers? to|best (?:completes|answer)|underlined)\b', l, re.I):
            actual = {'pregunta': _sin_numero(l.strip()), 'opciones': [], 'contexto': ' '.join(contexto)}
            preguntas.append(actual)
        else:
            contexto.append(l.strip())
    for p in preguntas:
        if len(p['opciones']) < 2 and p.get('marcas'):
            p['opciones'] = p['marcas']
    return [p for p in preguntas if len(p['opciones']) >= 2]


def _sin_numero(t):
    return re.sub(r'^\s*(?:\d+|[ivx]+)[\.\)\-]\s*', '', t)


def _partir_en_linea(l):
    ms = list(OPCIONES_EN_LINEA.finditer(l))
    if len(ms) < 2:
        return []
    letras = [m.group(1).lower() for m in ms]
    esperado = [chr(ord('a') + i) for i in range(len(letras))]
    if letras != esperado[:len(letras)] and letras != esperado:
        if not all(ord(letras[i + 1]) == ord(letras[i]) + 1 for i in range(len(letras) - 1)):
            return []
    out = []
    for i, m in enumerate(ms):
        fin = ms[i + 1].start() if i + 1 < len(ms) else len(l)
        out.append((m.group(1).lower(), l[m.end():fin].strip()))
    return out


# ------------------------------------------------------------------ vocabulario (sinónimos)
SINONIMOS = [s.split(',') for s in """
abundant,plentiful,ample,copious,numerous|accurate,precise,exact,correct|adequate,sufficient,enough|alter,change,modify,transform|
ambiguous,unclear,vague|ancient,old,very old|apparent,obvious,clear,evident|approximately,about,roughly|attain,achieve,reach|
assist,help,aid|beneficial,helpful,useful,advantageous|brief,short|capable,able,competent|cautious,careful|cease,stop,end|
commence,begin,start|comprehend,understand,grasp|consequently,therefore,as a result,thus|conceal,hide|considerable,significant,large,substantial|
constantly,continuously,always|crucial,essential,vital,critical|decline,decrease,drop,fall|deliberately,intentionally,on purpose|
demonstrate,show,prove|diminish,reduce,decrease,lessen|distinct,different,separate|dominant,main,principal,primary|eliminate,remove,get rid of|
enormous,huge,vast,immense|enhance,improve,increase|essential,necessary,vital,crucial|eventually,finally,in the end,ultimately|
evident,clear,obvious,apparent|exhibit,show,display|expand,grow,enlarge,increase|feasible,possible,practical|fragile,delicate,easily broken|
fundamental,basic,essential|gradually,slowly,little by little|hazardous,dangerous,risky|however,nevertheless,but|identical,the same,alike|
immediately,at once,instantly|incredible,unbelievable,amazing|indicate,show,suggest,point out|inevitable,unavoidable,certain|
initial,first,early|innovative,new,original|intense,strong,extreme|interpret,explain,understand|massive,huge,enormous|
merely,only,just|minor,small,unimportant|modify,change,alter,adjust|notable,remarkable,significant|numerous,many,a lot of|
obtain,get,acquire,gain|occur,happen,take place|perceive,notice,see|persist,continue,last|precise,exact,accurate|
predominantly,mainly,mostly|primary,main,principal|prior,previous,earlier|profound,deep,intense|prohibit,forbid,ban|
rapid,fast,quick|rare,uncommon,unusual|reluctant,unwilling,hesitant|remarkable,extraordinary,notable|require,need,demand|
reside,live,dwell|resemble,look like,be similar to|reveal,show,disclose|rigid,stiff,inflexible|scarce,rare,limited|
significant,important,considerable|similar,alike,comparable|sufficient,enough,adequate|subsequent,later,following|
substantial,considerable,large|sufficiently,enough|thrive,flourish,prosper|tiny,very small,minute|ultimately,finally,eventually|
undergo,experience,go through|unique,one of a kind,unusual|utilize,use,employ|vary,differ,change|vast,huge,enormous,immense|
vital,essential,crucial|widespread,common,extensive,prevalent|yield,produce,give
""".replace('\n', '').split('|') if s.strip()]


def sinonimo(palabra, opciones):
    p = palabra.lower().strip(' "\'«»')
    grupos = [set(x.strip() for x in g) for g in SINONIMOS if p in [x.strip() for x in g]]
    if not grupos:
        return None
    sinos = set().union(*grupos) - {p}
    hits = [i for i, (_l, o) in enumerate(opciones) if o.lower().strip(' .') in sinos]
    return hits


# ------------------------------------------------------------------ resolver
def _llenar(pregunta, opcion):
    huecos = HUECO.findall(pregunta)
    partes = [opcion]
    if len(huecos) > 1:
        partes = [x.strip() for x in re.split(r'\s*(?:/|…|\.\.\.|;|\s–\s|\s-\s|,)\s*', opcion) if x.strip()]
        if len(partes) != len(huecos):
            partes = [opcion] + [''] * (len(huecos) - 1)
    out = pregunta
    for p in partes:
        p = '' if p.strip().lower() in ('ø', '—', '-', 'no word', 'nothing', '(nothing)', 'x', '∅', 'no article', '(no article)', 'zero article', 'no preposition', '(no preposition)', 'none') else p
        out = HUECO.sub(lambda m: p, out, count=1)
    return re.sub(r'\s{2,}', ' ', out).strip()


BIEN = [  # (patrón sobre la oración ya completa con la opción correcta, por qué está bien)
    (r'\bif\b[^,]*\bhad\s+\w+(?:ed|en|ne|wn|t)\b.*\bwould have\b|\bwould have\b.*\bif\b[^,]*\bhad\b',
     'Tercer condicional (algo que NO pasó en el pasado): If + had + participio, … would have + participio.'),
    (r'\bif\b[^,]*\b(were|was|had|did|could|\w+ed|went|knew|lived)\b.*\bwould\b(?! have)|\bwould\b(?! have).*\bif\b[^,]*\b(were|had|did|\w+ed)\b',
     'Segundo condicional (algo imaginario o poco probable ahora): If + pasado (con «were» para todas las personas), … would + verbo.'),
    (r'\bif\b[^,]*\b(am|is|are|do|does|\w+s)\b.*\bwill\b', 'Primer condicional (algo real/probable): If + presente, … will + verbo.'),
    (r'\bwish\b\s+\w+\s+(had|were|could|knew|lived|\w+ed)\b', 'Wish + pasado = deseo sobre el presente (I wish I had more time).'),
    (r'\b(have|has)\s+(been\s+)?\w+\b.*\b(since|for)\b', 'Present perfect: algo que empezó antes y sigue hasta hoy (have/has + participio + since/for).'),
    (r'\bhad\s+(already\s+)?\w+(ed|en|ne|wn|t)\b.*\bby the time\b|\bby the time\b.*\bhad\s+(already\s+)?\w+', 'Pasado perfecto: lo que pasó ANTES de otro momento del pasado (had + participio).'),
    (r'\b(was|were)\s+\w+ing\b.*\bwhen\b', 'Pasado continuo (acción en progreso) + when + pasado simple (lo que la interrumpió).'),
    (r'\b(is|are|was|were|has been|have been|be)\s+(\w+ed|\w+en|built|made|known|located|read|written|sold|born)\s+(by|in)\b', 'Voz pasiva: be + participio (lo importante es lo que recibe la acción).'),
    (r'\b(\w+er|more \w+|less \w+|better|worse)\s+than\b', 'Comparativo: adjetivo corto + -er (o more + adjetivo largo) + than.'),
    (r'\bthe\s+(most|least)\s+\w+|\bthe\s+\w+est\b|\bthe best\b|\bthe worst\b', 'Superlativo: the + -est / the most (comparar contra todos).'),
    (r'\b(look forward to|used to|object to)\s+\w+ing\b', 'Aquí «to» es preposición, por eso va -ing.'),
    (FUTURO_MARCAS + r'.*\bwill\b|\bwill\b.*' + FUTURO_MARCAS, 'Futuro: con tomorrow / next… / soon va will + verbo base (o be going to).'),
    (r'\b(can|could|will|would|should|must|may|might)\s+(not\s+)?\w+\b', 'Modal + verbo en forma base (sin to, sin -s).'),
]


def por_que_bien(frase):
    low = ' ' + frase.lower() + ' '
    for pat, txt in BIEN:
        if re.search(pat, low):
            return txt
    return ''


def resolver_una(q):
    preg, ops, ctx = q['pregunta'].strip(), q['opciones'], q.get('contexto', '')
    low = preg.lower()
    res = {'pregunta': preg, 'opciones': [], 'correcta': None, 'confianza': 'baja', 'tipo': '', 'explicacion': ''}
    # vocabulario
    mv = re.search(r'(?:closest in meaning to|nearest in meaning to|synonym (?:of|for)|similar in meaning to|same meaning as|meaning of|means the same as)\s+(?:the (?:word|phrase)\s+)?["“«\'‘]?([a-z\- ]+?)["”»\'’]?\s*(?:\s(?:in|is|as used|in paragraph)\b|[?.:,]|$)', low) \
        or re.search(r'\b(?:word|phrase)\s+["“«\'‘]([a-z\- ]+?)["”»\'’]', low)
    if mv and re.search(r'closest in meaning|synonym|similar in meaning|means|meaning of', low):
        hits = sinonimo(mv.group(1), ops)
        res['tipo'] = 'vocabulario'
        for i, (l, o) in enumerate(ops):
            res['opciones'].append({'letra': l, 'texto': o, 'problemas': [], 'forma': ''})
        if hits:
            i = hits[0]
            res.update(correcta=ops[i][0], confianza='alta' if len(hits) == 1 else 'media',
                       explicacion='«%s» significa lo mismo que «%s» (sinónimos de mi lista).' % (mv.group(1), ops[i][1]))
        else:
            res['explicacion'] = 'Esa palabra no está en mi lista de sinónimos. Sin IA no la puedo deducir del contexto; prueba con Gemini o enséñamela.'
        return res
    hay_hueco = bool(HUECO.search(preg))
    busca_error = bool(BUSCA_ERROR.search(low))
    if busca_error and not hay_hueco:
        # quita la instrucción y las marcas (A) (B)… para revisar solo la oración
        oracion = re.split(r'(?<=[.?:!])\s+(?=[A-Z(])', preg)
        oracion = [o for o in oracion if not BUSCA_ERROR.search(o)] or oracion
        preg_rev = re.sub(r'\s*\(?\b[A-Da-d]\)\s*|\s*\([A-Da-d]\)\s*', ' ', ' '.join(oracion)).strip()
    else:
        preg_rev = preg
    # lectura (sin hueco y con texto largo): pista por coincidencias
    if not hay_hueco and ctx and len(ctx) > 250 and not all(len(o.split()) > 4 and o[0].isupper() for _l, o in ops):
        return _lectura(preg, ops, ctx, res)
    evals = []
    for l, o in ops:
        if hay_hueco:
            frase = _llenar(preg, o)
        elif busca_error:
            frase = preg_rev
        else:
            frase = o
        probs = revisar(frase)
        evals.append({'letra': l, 'texto': o, 'frase': frase, 'problemas': probs, 'forma': describe(o)})
    if busca_error and not hay_hueco:
        res['tipo'] = 'encontrar el error'
        probs = evals[0]['problemas']
        cand = []
        for e in evals:
            t = e['texto'].lower().strip(' .')
            tw = set(re.findall(r"[a-z']+", t))
            golpes, extra = [], 0.0
            for p in probs:
                sp = (p['span'] or '').lower()
                sw = re.findall(r"[a-z']+", sp)
                if t and (t in sp or sp.strip() in t or tw & set(sw)):
                    golpes.append(p)
                    # desempate: la palabra que hay que cambiar suele ser la última del tramo o la que el mensaje cita como mala
                    malas = re.findall(r'no «([^»]+)»', p['mal']) + ([sw[-1]] if sw else [])
                    if any(m in tw for m in malas):
                        extra += 0.1
            e['problemas'] = golpes
            cand.append((sum(p['peso'] for p in golpes) + extra, e))
        cand.sort(key=lambda x: -x[0])
        res['opciones'] = evals
        if cand and cand[0][0] > 0 and (len(cand) == 1 or cand[0][0] > cand[1][0]):
            e = cand[0][1]
            res.update(correcta=e['letra'], confianza='alta' if len(cand) < 2 or cand[1][0] == 0 else 'media',
                       explicacion='La parte que está mal es «%s»: %s.' % (e['texto'], e['problemas'][0]['mal']))
        else:
            res['explicacion'] = 'No encontré con seguridad cuál parte rompe una regla de las que conozco.'
        return res
    res['tipo'] = 'completar el hueco' if hay_hueco else 'elegir la oración correcta'
    # solo cuentan los problemas que distinguen a las opciones
    comunes = None
    for e in evals:
        claves = {(p['c'], p['mal']) for p in e['problemas']}
        comunes = claves if comunes is None else comunes & claves
    for e in evals:
        e['problemas'] = [p for p in e['problemas'] if (p['c'], p['mal']) not in comunes]
        e['problemas'].sort(key=lambda p: p['c'] in ('sin_verbo', 'dos_verbos'))
        e['puntos'] = sum(p['peso'] for p in e['problemas'])
    res['opciones'] = evals
    orden = sorted(evals, key=lambda e: e['puntos'])
    limpias = [e for e in evals if e['puntos'] == 0]
    if len(limpias) == 1:
        mejor = limpias[0]
        res['correcta'] = mejor['letra']
        malas = [e for e in evals if e is not mejor]
        res['confianza'] = 'alta' if all(e['puntos'] >= 0.9 for e in malas) else 'media'
    elif len(limpias) > 1:
        res['empate'] = [e['letra'] for e in limpias]
        res['confianza'] = 'baja'
        textos = {e['texto'].lower().strip() for e in limpias}
        if textos <= {'a', 'an', 'the', '-', '—', 'x', 'no article', 'nothing', 'ø'} and 'the' in textos:
            res['explicacion'] = ('Gramaticalmente sirven %s. Depende del sentido: «a/an» = uno cualquiera o que se menciona por primera vez; '
                                  '«the» = uno específico que los dos ya saben cuál es. En quizzes sin más contexto casi siempre esperan a/an.') % ', '.join(x + ')' for x in res['empate'])
    elif orden and orden[0]['puntos'] < orden[1]['puntos']:
        res['correcta'] = orden[0]['letra']
        res['confianza'] = 'baja'
    # el por qué de la correcta: las reglas que tumbaron a las demás y que esta sí cumple
    if res['correcta']:
        mejor = next(e for e in evals if e['letra'] == res['correcta'])
        reglas = []
        for e in evals:
            for p in e['problemas']:
                if p['regla'] not in reglas:
                    reglas.append(p['regla'])
        res['reglas'] = reglas
        partes = []
        bien = por_que_bien(mejor['frase']) if hay_hueco else ''
        if bien:
            partes.append(bien)
        if mejor['forma'] and not bien:
            partes.append(mejor['forma'][0].upper() + mejor['forma'][1:] + ', y es la única que no rompe ninguna regla.')
        else:
            partes.append('Es la única opción que no rompe ninguna regla.')
        if reglas and not bien:
            partes.append('Regla: ' + ' / '.join(reglas[:2]))
        res['explicacion'] = '\n'.join(partes)
    return res


def _lectura(preg, ops, ctx, res):
    stop = set('the a an of to in on at for and or but is are was were be been it its this that these those with as by from which who what why how when where according passage author paragraph text following not except true mentioned'.split())
    toks = lambda t: [w for w in re.findall(r"[a-z]+", t.lower()) if w not in stop and len(w) > 2]
    ctx_t = set(toks(ctx))
    negativa = bool(re.search(r'\b(not|except|least)\b', preg.lower()))
    puntajes = []
    for l, o in ops:
        ws = toks(o)
        pc = sum(1 for w in ws if w in ctx_t or w[:5] in {c[:5] for c in ctx_t}) / max(1, len(ws))
        puntajes.append(pc)
        res['opciones'].append({'letra': l, 'texto': o, 'problemas': [], 'forma': '', 'coincide': round(pc * 100)})
    i = min(range(len(ops)), key=lambda k: puntajes[k]) if negativa else max(range(len(ops)), key=lambda k: puntajes[k])
    res.update(tipo='lectura (pista)', correcta=ops[i][0], confianza='baja',
               explicacion=('Es la opción que %s se parece a lo que dice el texto (%d%% de sus palabras aparecen). '
                            'Sin IA solo comparo palabras, no el sentido: revísala tú.') % ('MENOS' if negativa else 'más', round(puntajes[i] * 100)))
    return res


QUIZ_PREFIJO = re.compile(r'^\s*(?:quiz|resuelve|resolver|solve|examen|ex[aá]men)\s*:\s*', re.I)


def es_quiz(texto):
    """¿El texto es una pregunta de opción múltiple (o trae «quiz:»)?"""
    if QUIZ_PREFIJO.match(texto or ''):
        return True
    return bool(leer_quiz(texto or ''))


def resolver(texto):
    """Resuelve todas las preguntas del texto pegado. Regresa {'preguntas': [...], 'respuesta': texto para el chat}."""
    qs = leer_quiz(QUIZ_PREFIJO.sub('', texto or '', count=1))
    resultados = [resolver_una(q) for q in qs]
    return {'preguntas': resultados, 'respuesta': formatear(resultados) if resultados else
            'No encontré preguntas con incisos. Pégala así:\nShe ___ to school every day.\na) go\nb) goes\nc) going\nd) gone',
            'version': VERSION}


def formatear(resultados):
    out = []
    for n, r in enumerate(resultados, 1):
        cab = ('%d. ' % n if len(resultados) > 1 else '') + r['pregunta']
        out.append(cab)
        if r['correcta']:
            op = next(o for o in r['opciones'] if o['letra'] == r['correcta'])
            out.append('✅ %s) %s%s' % (r['correcta'], op['texto'], '' if r['confianza'] == 'alta' else '   (confianza %s)' % r['confianza']))
            if r.get('explicacion'):
                out.append('Por qué: ' + r['explicacion'].replace('\n', '\n'))
        elif r.get('empate'):
            out.append('🤔 ' + (r.get('explicacion') or 'No estoy segura: con mis reglas quedan %s. Puede depender del sentido o de algo que no reviso.' % ', '.join(x + ')' for x in r['empate'])))
        else:
            out.append('🤔 ' + (r.get('explicacion') or 'No estoy segura: ninguna regla de las que conozco decide esta.'))
        for o in r['opciones']:
            if o['letra'] == r['correcta']:
                continue
            if r['tipo'] == 'encontrar el error' and r['correcta']:
                out.append('✗ %s) %s — esta parte está bien escrita' % (o['letra'], o['texto']))
            elif o.get('problemas'):
                p = o['problemas'][0]
                out.append('✗ %s) %s — %s' % (o['letra'], o['texto'], p['mal']))
            elif r['tipo'] not in ('vocabulario', 'lectura (pista)') and r['correcta']:
                out.append('✗ %s) %s — %s' % (o['letra'], o['texto'], o['forma'] or 'no encaja aquí'))
        out.append('')
    return '\n'.join(out).strip()


if __name__ == '__main__':
    import sys
    print(resolver(sys.stdin.read() if not sys.argv[1:] else ' '.join(sys.argv[1:]))['respuesta'])
