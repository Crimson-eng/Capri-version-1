# Capri 2.30: certeza cuando importa, y ya ve tus imágenes

## 1. Certeza o charla

Antes Capri elegía cerebro por rapidez y por lo largo del mensaje. Una pregunta corta de TOEFL como
«She ___ to school every day. a) go b) goes c) going d) gone» se iba al cerebro chico de tu GPU (gemma3:4b)
solo porque era corta, aunque tenía que estar bien.

Ahora cada mensaje se clasifica al momento (sin IA, en menos de 1 ms) en una de dos:

| Tipo | Ejemplos | Qué hace Capri |
|------|----------|----------------|
| **Certeza** · toefl | quiz con incisos en inglés, «diferencia entre since y for», «is it correct to say…», «present perfect vs simple past» | ver abajo (TOEFL) |
| **Certeza** · examen | preguntas con incisos, «examen», «tarea», «cuál es la correcta» | |
| **Certeza** · médica | dosis, síntomas, «me duele…», fármacos, NOM, GPC | además usa las fuentes verificadas de siempre (MedlinePlus/PubMed y tu biblioteca) |
| **Certeza** · técnica | «¿cómo instalo python en windows?», «me salió un error en powershell» | |
| **Certeza** · dato | «¿cuánto es 15×23?», «¿en qué año…?», «¿qué significa…?» | |
| **Charla** | «hola», «jaja qué onda», «me aburro», «cuéntame algo» | todo igual que antes: lo más rápido |

Con **certeza**:

- **No** contesta el cerebro chico de tu GPU si hay otro (Gemini, Claude, Groq u OpenRouter).
- Gemini contesta con menos «creatividad» (temperatura 0.3 en vez de 1.1) y con un poquito de razonamiento
  (`thinkingLevel: low`), que tarda alrededor de 1 s más pero se equivoca menos.
- Si tienes a Claude prendido como coprocesador, también se va a Claude.
- A la pregunta se le agrega al final una nota: «respuesta correcta, no creativa; primero la respuesta exacta, luego
  el porqué; si no estás segura, dilo». Va al final para no romper la caché del prompt (la regla de 2.28).
- Si Gemini falla, prueba primero los respaldos más listos: en Groq usa **Kimi K2** aunque tengas puesto Llama
  (igual de rápido y más certero), luego OpenRouter.
- Si al final solo queda tu GPU, contesta pero te avisa: «esto pedía certeza y mi cerebro chico es el menos confiable,
  verifícalo».

Tú mandas:

- `seguro: <pregunta>` fuerza el modo certeza.
- `rápido: <pregunta>` lo apaga para ese mensaje.

En el REGISTRO verás `◎ certeza · toefl (pregunta de inglés / TOEFL): contesta el cerebro más confiable`.

## 2. TOEFL: con certeza y rápido

El profe de reglas del cerebro Python (2.26) ya era las dos cosas: contesta en milisegundos y solo da por segura
una respuesta cuando las reglas la aseguran. El hueco era que **solo entraba si escribías `quiz:`**. Si pegabas la
pregunta tal cual en el chat, se iba a la IA genérica, y si era corta, a tu GPU.

Ahora:

1. **Quiz de inglés pegado tal cual** (con incisos a/b/c/d y en inglés) → va solo al profe de reglas.
   Probado: lo resolvió en 43 ms, sin gastar nada.
2. Lo que las reglas no aseguran → Claude (si lo tienes) → Gemini → **Groq/OpenRouter (nuevo)** → tu GPU.
   Cada uno tiene 25 s; si se tarda, pasa al siguiente en vez de dejarte esperando.
3. **Sin el cerebro Python prendido**, o preguntas de inglés que no son quiz («¿cuándo uso since y cuándo for?») →
   modo certeza: Gemini o Claude, nunca el cerebro chico si hay otro.

## 3. Capri ve tus imágenes

Antes solo veía tu pantalla (👁). Ahora le puedes mandar imágenes en el chat:

- **Botón de imagen** junto al micrófono (una o varias, hasta 4).
- **Ctrl+V**: pega una captura o una imagen copiada.
- **Arrastra y suelta** la imagen sobre el chat.

Se ven en miniatura arriba de donde escribes (✕ para quitarla) y debajo de tu mensaje cuando la mandas.
Si mandas solo la imagen sin texto, Capri te dice qué ve.

¿Quién la ve?

- **Gemini** (siempre que esté).
- **Claude**, si lo tienes prendido.
- **Tu GPU**, si Gemini falla y su modelo ve imágenes (gemma3:4b sí; también llava, qwen2.5vl, llama3.2-vision…).
- Groq y OpenRouter solo leen texto: con imagen no se usan.

Las imágenes se achican a 1600 px (JPEG) antes de mandarlas: suben más rápido y gastan menos.

Una foto de tu quiz también funciona: «¿cuál es la correcta?» + la foto → certeza (examen) + imagen → Gemini o Claude.

## Archivos

- `certeza.js` (nuevo): el clasificador `capriCerteza()`, la nota de certeza y el quiz pegado → profe de reglas.
- `adjuntos.js` (nuevo): botón, Ctrl+V, arrastrar y soltar, miniaturas y achicar.
- `cerebro.js`: `ask` clasifica; `rutaLocal`/`rutaClaude` respetan la certeza; Kimi K2 en Groq para certeza;
  `cerebroNubeTexto()` para el quiz; tu GPU ve imágenes (`veGPU`, `images` en Ollama).
- `index.html`: Gemini con temperatura/razonamiento de certeza; `send`/`respond` aceptan varias imágenes.
- `cerebropy.js`: `inglesSinIA(…, soloQuiz)` expuesto; `toefl.js`: tope de 25 s y Groq/OpenRouter en `quizIA`.

## Probado

Con Gemini, Ollama y Groq simulados y el cerebro Python real (Playwright), 15 de 15:

1. «hola capri» → tu GPU, como antes.
2. «cual es la diferencia entre since y for en ingles» → Gemini (no GPU), temperatura 0.3, razonamiento low, con la nota.
3. Quiz pegado sin `quiz:` → profe de reglas en 43 ms, ninguna IA.
4. Quiz con el cerebro Python apagado → Gemini en modo certeza.
5. Imagen con el botón → miniatura; se manda a Gemini como imagen, achicada a 1600 px.
6. Imagen con Ctrl+V → se adjunta. Solo imagen sin texto → «¿Qué ves en esta imagen?».
7. Arrastrar y soltar → se adjunta.
8. Gemini caído + imagen → tu GPU (gemma3:4b) la recibe.
9. Pregunta técnica + Gemini caído → Groq con Kimi K2 (no Llama).
10. Charla + Gemini caído → como antes.

Falta probarlo en tu PC con Gemini, Ollama y tus keys reales.
