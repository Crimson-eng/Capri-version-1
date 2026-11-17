# Capri 2.24–2.26 — Inglés sin IA, profe de TOEFL y resolver quizzes (cerebro Python)

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
| `cerebropy.js` | La app: detecta «sin IA» y manda el inglés al cerebro; comando `en:`. Sin IA, las preguntas de TOEFL (aunque sean en español) las contesta el profe. |

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

## 2.25 — Profe de TOEFL sin IA (módulo aparte + pestaña INGLÉS)

Kiga pidió que el inglés sin IA tuviera «inteligencia de docente de TOEFL» y su propio espacio. Quedó así:

**Pestaña INGLÉS** en la barra de arriba (grupo herramientas, junto a BIBLIOTECA; tecla 9, Q/E para moverte, o Ctrl+K →
«toefl»). También en el chat: `toefl` abre la pestaña; `practica toefl email` te lleva directo a esa práctica.

| Apartado | Qué hace |
|---|---|
| Inicio | Tu banda estimada (1–6) y nivel CEFR, por sección, racha, qué te conviene practicar y «pregúntale al profe». |
| Practicar | Las tareas del examen con formato real: Complete the Words, Build a Sentence, Read in Daily Life / Academic Passage, Write an Email (7 min), Academic Discussion (10 min), Listen and Repeat, Take an Interview (45 s), Dictado. Califica al momento y explica. |
| Vocabulario | 120 palabras académicas con ejemplo y repaso espaciado (cajas de Leitner: 0, 1, 3, 7, 16 días). Botón para oírlas. |
| El examen | Formato 2026, puntaje 1–6 y CEFR, estrategias por sección y plantillas. |
| Traductor | Inglés↔español y corrector del módulo 2.24, en grande. |
| Plan | Pones banda objetivo y fecha del examen y te arma semanas con foco en tu sección más floja. |

**Cómo califica sin IA**

- Reading y Build a Sentence: exacto (cada hueco, cada opción, el orden), con la explicación de cada respuesta.
- Listen and Repeat y Dictado: Capri lee la oración con la voz en inglés de tu PC (funciona sin internet) y compara
  palabra por palabra lo que escribiste: qué te faltó y qué pusiste de más.
- Writing y Interview: una **rúbrica de reglas 0–5** (como la escala de ETS para esas tareas) que revisa: si cumpliste la
  tarea (en el Email, cada una de las 3 cosas; en Discussion, postura + razón + ejemplo + mencionar a un compañero),
  el largo, los conectores, vocabulario académico, variedad de oraciones y los errores que detecta el corrector. Te dice
  qué sí hiciste bien, qué te falta para subir, tu texto corregido y la plantilla.
- **Es una estimación**, no la calificación de ETS: una IA o un maestro leen el sentido; las reglas solo ven la forma.
  Sirve mucho para practicar la estructura, no para predecir tu puntaje exacto.
- Speaking real (tu voz) no se califica sin IA: en Interview contestas en voz alta y escribes (o dictas, si tu sistema
  lo permite) lo que dijiste.
- Listening del examen (conversaciones, anuncios, clases) necesita audios grabados; sin IA solo hay dictado con voz de la PC.

**Sobre el examen.** El formato es el que ETS usa desde el 21 de enero de 2026 (Reading, Listening, Writing, Speaking;
puntaje 1–6 en medios puntos alineado al CEFR; Reading y Listening adaptativos). Los tiempos exactos los puede cambiar
ETS: confírmalos en ets.org/toefl antes de inscribirte. Todo el material de práctica es original de Capri, no preguntas
reales de ETS.

**Archivos:** `capri-cerebro/toefl_offline.py` (el profe), `capri-cerebro/toefl_banco.py` (banco: párrafos, oraciones,
lecturas, correos, discusiones, entrevista, vocabulario; para crecerlo se agregan renglones), `capri-cerebro/prueba_toefl.py`,
`toefl.js` (la pestaña). Progreso en `capri-cerebro/datos/toefl_progreso.json`.

**API** (POST, `X-Capri: 1`): `/api/toefl/examen`, `/nueva {tipo, id?}`, `/calificar {tipo, id, respuesta}`,
`/vocab {n}` o `{palabra, bien}`, `/progreso`, `/meta {banda, fecha}`, `/plan`, `/pregunta {texto}`.
Tipos: completar, ordenar, lectura, correo, discusion, repetir, entrevista, dictado.

## 2.26 — Resolver quizzes: el inciso correcto y por qué (sin IA)

Kiga pidió que después de sus clases y quizzes de inglés pudiera pegarle una pregunta a Capri y que le dijera **qué inciso
es el correcto, por qué, y por qué los demás están mal**. Quedó así:

**Dónde:** pestaña INGLÉS → **Resolver quiz** (o Ctrl+K → «quiz»). En el chat: `quiz: <pregunta con incisos>` (eso usa las
reglas aunque Gemini esté prendida). Sin ninguna IA, si pegas una pregunta con incisos en el chat la contesta sola. Al pegar
en el chat varias líneas, Capri las junta en una para que no se pierdan los incisos.

```
She ___ to school every day.
a) go  b) goes  c) going  d) gone

✅ b) goes
Por qué: «goes»: presente con he/she/it de «go», y es la única que no rompe ninguna regla.
Regla: Presente simple: he/she/it + verbo con -s (she goes, he studies, it has).
✗ a) go — «she go»: en presente con she el verbo lleva -s («she goes»)
✗ c) going — «she going»: la forma -ing sola no es verbo, le falta am/is/are (o was/were)
✗ d) gone — «she gone»: «gone» es participio; solo no funciona, necesita have/has (o usa el pasado «went»)
```

**Qué tipos de pregunta entiende**

| Tipo | Ejemplo | Qué tan bien |
|---|---|---|
| Completar el hueco (`___`, `( )`, `…`) | `If I ___ rich, I would travel.` | Bien en gramática: tiempos, condicionales 1/2/3 y wish, verbo + -ing o to, modales, pasiva, comparativo/superlativo, artículos a/an, much/many, preposiciones fijas (good at, interested in, arrive at), who/which/whose, preguntas indirectas, although/despite, so/such, too/enough, make/do, say/tell… |
| ¿Cuál oración es correcta? | 4 oraciones completas | Bien si el error es de gramática |
| Encuentra el error | `He (A) can (B) speaks English…` con o sin los incisos aparte | Bien si la parte mala rompe una regla que conoce |
| Sinónimos | `closest in meaning to "rapid"` | Solo palabras de su lista (~110 grupos de vocabulario académico) |
| Lectura | pegas el texto + la pregunta | **Solo pista** (compara palabras, no entiende el sentido): confianza baja |

Varias preguntas a la vez: numéralas (`1.`, `2)`…). Los incisos pueden ir en renglones (`a)`, `A.`, `(a)`) o en la misma línea.

**Cómo decide (sin IA):** pone cada opción en el hueco y revisa la oración completa con ~120 reglas. Se queda solo con los
errores que distinguen a las opciones (si algo está mal en todas, no cuenta). La opción que no rompe ninguna regla es la
correcta; cada regla trae su explicación en español, y de ahí salen el «por qué» de la buena y el «✗» de cada mala.

**Confianza**
- **alta**: todas las demás rompen una regla clara.
- **media**: alguna mala solo rompe una regla «suave» (lo que se prefiere en examen, p. ej. already + present perfect).
- **baja / no estoy segura**: dos o más opciones quedan bien con sus reglas (p. ej. `works ___ a hospital`: in y at sirven) o la
  pregunta depende del sentido. Ahí te dice cuáles quedan y no inventa. Con artículos (a/an vs the) te explica la diferencia.

**Límites honestos:** no entiende el significado. Preguntas de comprensión, de qué palabra «suena mejor» por sentido, de
tono o de contexto de una plática, necesitan IA o a tu maestro. Se probó con 40 preguntas típicas (39 elige bien, la otra la
marca como empate a/an–the) y con 70 oraciones correctas sin inventarles errores (`prueba_quiz.py`), pero tu quiz puede traer
una regla que no tiene: si ves que se equivoca, pásale la pregunta a Claude en un hilo y se agrega la regla.

**Archivos:** `capri-cerebro/quiz_toefl.py` (lector del quiz + reglas + explicaciones), `capri-cerebro/prueba_quiz.py`.
**API:** `POST /api/toefl/resolver {texto}` → `{preguntas: [{pregunta, tipo, correcta, confianza, explicacion, empate?,
opciones: [{letra, texto, frase, problemas: [{mal, regla}]}]}], respuesta}`. También lo usa `/api/ingles` cuando el texto es un quiz.

## Siguiente paso posible

Si Kiga quiere que sin IA platique «de verdad» en inglés, lo que sigue es un modelo chiquito local (por ejemplo
`qwen2.5:0.5b` o `gemma3:1b` en Ollama, corre en CPU) con este módulo como respaldo cuando ni eso esté. El diccionario
también puede crecer cargando una lista libre más grande.
