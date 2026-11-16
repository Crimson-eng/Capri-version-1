# Capri 2.24 — Inglés sin IA (módulo del cerebro Python)

Capri entiende y contesta **inglés aunque no tenga ninguna IA prendida**: sin Gemini, sin Ollama en tu GPU, sin Claude
y sin internet. Lo resuelve su cerebro Python (`capri-cerebro/`) con reglas y un diccionario local.

## Qué tan lista es sin IA (léelo antes de usarlo)

No es un modelo de lenguaje. Son reglas escritas a mano + ~900 palabras y ~100 frases hechas. Por eso:

| Lo hace bien | Lo hace más o menos | No lo hace |
|---|---|---|
| Saber si un texto está en **inglés puro** o si metiste español | Oraciones largas con varias ideas (sale entendible pero «robótico») | Platicar de cualquier tema como con Gemini |
| Traducir frases normales al español: tiempos (presente, pasado, futuro, «going to», «have done»), ser/estar, «tener hambre», «hace frío», «me gusta», negaciones, preguntas, «ayúdame / dime» | Palabras que no están en su diccionario (te las marca y se las puedes enseñar) | Modismos raros, slang, doble sentido |
| Decir qué significa una palabra (`what does went mean` → ir, pasado) | Español → inglés (solo palabra por palabra, sin gramática) | Escribir textos largos o ensayos |
| Corregir los errores típicos de quien habla español (he don't, I have 20 years, informations, can to, a apple, explain me…) | | Corregir cualquier error: solo los ~25 que conoce |
| Hora, fecha, cuentas (`what is 12 times 4`, `square root of 81`), deletrear | | |

Es instantánea: menos de 1 ms por respuesta, sin GPU.

## Cómo se usa

**Automático.** Si el cerebro Python está corriendo y no hay ninguna IA disponible, lo que escribas en inglés se lo contesta
el módulo. En el chat sale como **CAPRI · SIN IA**. Si escribes en español sin IA, Capri se porta como siempre.

**A propósito.** `en: <texto>` lo manda al módulo aunque Gemini esté prendida (útil para practicar o ahorrar cupo).

**Desde la página del cerebro o el celular** (`http://127.0.0.1:47824/`): si Gemini/Ollama fallan y le escribes en inglés,
contesta el módulo en vez de dar error.

Ejemplos:

```
what does tired mean?               → «tired» significa: cansado (adjetivo)
I need a new phone because my phone is broken
                                    → Necesito un teléfono nuevo porque mi teléfono está roto
He don't have money                 → Él no tiene dinero  ✎ «He don't» → «He doesn't»
how do you say perro grande         → big dog
translate I am going to study tonight → Voy a estudiar esta noche
what is 12 times 4                  → That's 48.
spell beautiful                     → B - E - A - U - T - I - F - U - L
learn: lizard = lagartija           → la guarda para siempre
```

## Enseñarle palabras

`learn: word = palabra` (o `aprende: word = palabra`). Se guardan en `capri-cerebro/datos/ingles_palabras.json`
y ganan sobre el diccionario de fábrica. También sirve para frases: `learn: what's up = qué onda`.

## Cómo está hecho

| Archivo | Qué es |
|---|---|
| `capri-cerebro/ingles_offline.py` | El módulo: `detectar`, `traducir`, `al_ingles`, `corregir`, `responder`, clase `Ingles`. Solo biblioteca estándar. |
| `capri-cerebro/ingles_dicc.py` | Diccionario de fábrica (sustantivos con género, adjetivos, verbos con cambio de raíz, frases, irregulares). Fácil de crecer: una entrada por `palabra=traducción`. |
| `capri-cerebro/prueba_ingles.py` | Pruebas del módulo (`python prueba_ingles.py`). |
| `capri-cerebro/capri_cerebro.py` | 1.1.0: carga el módulo (si falta, el cerebro sigue igual), lo usa de respaldo en `/api/chat` y agrega la API. |
| `cerebropy.js` | La app: detecta «sin IA» y manda el inglés al cerebro; comando `en:`. |

**Detección de idioma:** cuenta palabras que delatan inglés (lista + diccionario) y español (lista, acentos, ñ, ¿¡,
terminaciones -ción/-mente…, y el diccionario al revés). Las palabras que existen en los dos (no, me, ok, hospital,
color…) no cuentan. Resultado: `en`, `es`, `mixto` o `?`, y `puro: true` solo si no hay nada de español.

**Traducción:** junta contracciones (`don't` → do not), busca frases hechas primero y luego va palabra por palabra
llevando la cuenta de quién es el sujeto (para conjugar), el tiempo (do/did/will/would/have + participio), ser vs. estar,
el género y número de los sustantivos (artículos y adjetivos concuerdan, el adjetivo va después), pronombres pegados
(`ayúdame`, `te amo`, `le dije`) y «gustar» (`She likes cats` → A ella le gustan los gatos).

## API del cerebro (todas POST con `X-Capri: 1`, igual que las demás)

| Ruta | Cuerpo | Regresa |
|---|---|---|
| `/api/ingles` | `{texto, guardar?}` | `{idioma, puro, intencion, respuesta, respuesta_en, traduccion, correcciones, desconocidas, estado}` |
| `/api/ingles/detectar` | `{texto}` | `{idioma, puro, confianza, es: [palabras en español]}` |
| `/api/ingles/traducir` | `{texto, a?: 'en'}` | `{texto, desconocidas}` |
| `/api/ingles/corregir` | `{texto}` | `{texto, correcciones: [{mal, bien, porque}]}` |
| `/api/ingles/aprende` | `{en, es}` o `{olvidar}` | lo guardado |
| `/api/ingles/palabras` | `{}` | las palabras que le enseñaste |

Probarlo sin la app: `python capri-cerebro/ingles_offline.py "I don't understand this word"` (o sin texto para modo
interactivo).

## Siguiente paso posible

Si Kiga quiere que sin IA platique «de verdad» en inglés, lo que sigue es un modelo chiquito local (por ejemplo
`qwen2.5:0.5b` o `gemma3:1b` en Ollama, corre en CPU) con este módulo como respaldo cuando ni eso esté. El diccionario
también puede crecer cargando una lista libre más grande.
