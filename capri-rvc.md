# Capri 2.19 · Voz RVC propia y canto

Capri puede hablar y **cantar** con una voz RVC entrenada por ti. Todo corre en tu PC.

## ¿Dónde consigo RVC de forma legal?

El software de RVC es **libre y gratis** (código abierto). Lo que tiene dueño es la **voz** con la que entrenas.

| Qué | Dónde | Licencia |
|---|---|---|
| **Applio** (recomendado: instalador para Windows, entrena e infiere, español) | https://github.com/IAHispano/Applio · versión compilada en https://huggingface.co/IAHispano/Applio/tree/main/Compiled | MIT |
| **RVC WebUI** (el proyecto original) | https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI | MIT |
| **audio-separator** (opcional, separa voz y música) | https://github.com/nomadkaraoke/python-audio-separator | MIT |

Bájalos **solo** de esos enlaces oficiales. No compres "RVC premium" ni bajes .exe de sitios raros.

**Qué es legal:**
- ✅ Tu propia voz (la que grabaste en RELIC → Voz → Entrenar sirve directo).
- ✅ La voz de alguien que te dio permiso (mejor por escrito).
- ✅ Modelos con una licencia que lo permita.
- ❌ Voces de actrices, cantantes, personajes o cualquier persona sin su permiso. Esto incluye los modelos "de fans" que circulan en Discord o en weights.gg. Se usa su voz sin consentimiento, y en México (Ley Federal del Derecho de Autor, derechos de la personalidad) y en otros países eso puede meterte en problemas.
- Canciones con derechos de autor: cantarlas con Capri para escucharlas tú está bien. Publicarlas o monetizarlas no está bien sin permiso.

"De patente": tu modelo entrenado con tu voz es tuyo. Si quieres dejar constancia, guarda las grabaciones originales, el .pth y la fecha (y si quieres, regístralo como obra en INDAUTOR). Capri te pide decir de dónde viene cada voz antes de usarla y lo guarda junto al modelo.

## Dos formas de usar tu modelo en Capri (RELIC → Voz → RVC)

| | En la página | Servidor con Applio |
|---|---|---|
| Archivo | `.onnx` (convertido del .pth) | tu `.pth` + `.index` tal cual |
| Instalar | nada (baja ContentVec una vez, 360 MB) | Applio (~6 GB con todo) |
| Calidad | buena (tono YIN, sin índice) | la mejor (RMVPE, índice, autotune) |
| Velocidad | procesador | **GPU NVIDIA** si tienes (o procesador) |
| Cantar | sí, también "letra con melodía" | sí, con autotune y separador de voz/música |

Si el servidor se cae, Capri usa la página (si está lista) o habla con la voz de tu PC sin convertir. Nunca se queda callada.

## Paso a paso: servidor con Applio (Windows)

1. **Instala Applio.** Baja el código de https://github.com/IAHispano/Applio (botón *Code → Download ZIP*) y descomprímelo en `C:\Applio`. Luego doble clic en `run-install.bat` (tarda 10–30 min y baja PyTorch). Prueba que abre con `run-applio.bat` y ciérralo.
2. **Entrena tu voz** (si aún no tienes modelo). En RELIC → Voz → Entrenar graba el guion y exporta el .zip. En Applio, pestaña *Train*, ponle un nombre (ej. `capri`), elige la carpeta `wavs/` del zip, 40 kHz, *RMVPE*, y entrena 200–400 épocas. Al terminar quedan `logs\capri\capri_XXXe_XXXs.pth` y `logs\capri\added_....index`.
3. **En Capri de escritorio:** RELIC → Voz → RVC → **Servidor con Applio** → **▶ Iniciar servidor**. Capri busca Applio en tu carpeta de usuario, Escritorio, Descargas o `C:\Applio`. Si no lo encuentra, usa *Elegir la carpeta de Applio*.
   - Ve directo los modelos de `Applio\logs\`. También puedes poner un `.pth` + `.index` en **📂 Mis modelos** (`Documentos\Capri\RVC\modelos`; pueden ir en una subcarpeta con el nombre de la voz).
4. Elige **Tu modelo**, escribe de dónde viene la voz, marca la casilla y dale a **Confirmar**.
5. Ajusta: *Cómo mide el tono* = RMVPE, *Índice* 0.5 (súbelo si no se parece; bájalo si suena metálico), *Proteger* 0.33.
6. Pulsa **▶ Probar** y, si te gusta, activa **Usar RVC cuando habla la voz de tu PC** (el motor debe estar en *Voz de tu PC* en la pestaña Motor).

En la **página web** (GitHub Pages) el servidor no se arranca solo. Corre `entrenar\iniciar_rvc_windows.bat` (o `bash entrenar/iniciar_rvc.sh` en Linux/Mac) y pulsa *revisar*.

**Separar voz y música (opcional):** corre `entrenar\instalar_separador_windows.bat` y reinicia el servidor. Aparece el botón **✂ Canción completa → separar**.

## Cantar (RELIC → Voz → Cantar)

RVC copia la **melodía** de quien canta y le pone la voz de tu modelo. Hay tres modos:

1. **Canción:** carga la **voz a capela** y, si quieres, la **música sin voz**. Pulsa **✦ Que Capri la cante**. Capri convierte la voz, la mezcla con la música y le pone eco de neón.
2. **Grabarte cantando:** ⏺ graba tu voz (con la música de fondo y **audífonos**, para que el micrófono no la capte). Capri la canta con su voz.
   - Si cantas tú (hombre) para una Capri femenina, pon **Tono +12** (o +7 si queda muy aguda).
3. **Letra con melodía (experimental):** escribe la letra y unas notas (`Do Re Mi Sol` o `C4 E4 G4`, `_` repite). La voz de tu PC dice la letra y a cada sílaba le toca la siguiente nota, con vibrato. Suena tipo vocaloid.
   - Necesita el modelo **en la página** (.onnx). Solo con el servidor sale como "canto robot" con autotune.

Lo que te guste lo guardas en su **repertorio**. En el chat:
- `canta` canta algo al azar de su repertorio.
- `canta NOMBRE` canta esa canción.
- `canta: letra…` canta esa letra con las notas guardadas.
- `para` la detiene.

**Consejos:**
- La voz a capela debe estar limpia, sin eco ni coros. Si viene de una separación, revisa que no tenga restos de batería.
- Si Capri desafina, prueba el autotune (servidor) o canta tú la parte con la nota más firme.
- Para el método de tono, RMVPE es el mejor para canto. CREPE es más fino, pero más lento.

## Archivos

- `rvc.js`: motores (página ONNX / servidor), interfaz de RVC.
- `canto.js`: pestaña Cantar, mezcla, letra con melodía, repertorio y comandos.
- `entrenar/capri_rvc_servidor.py`: servidor local (solo escucha en 127.0.0.1:5050, usa el Python de Applio).
- `entrenar/iniciar_rvc_windows.bat`, `entrenar/iniciar_rvc.sh`, `entrenar/instalar_separador_windows.bat`.
- `entrenar/rvc_a_onnx.sh`: convierte un .pth a .onnx para el motor "en la página".
