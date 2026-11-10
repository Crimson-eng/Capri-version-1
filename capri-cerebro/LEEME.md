# Cerebro de Capri (opcional)

Un programa chiquito que se queda vivo en tu PC aunque cierres la app de Capri.

- **Memoria compartida.** Capri le pasa sus recuerdos, su ánimo y la plática. Lo que borras en un lado se borra en todos.
- **Vida propia con la app cerrada.** Cada 30 a 90 minutos (tú eliges) te habla por su cuenta con una notificación, y si quieres también en voz alta. Respeta tus horas de silencio y un máximo de mensajes al día. Cuando abres la app, te enseña lo que te dijo.
- **Platicar desde el navegador o el celular.** Su página está en http://127.0.0.1:47824/. Si prendes «Celular en mi wifi», te da un enlace con un código para abrirla desde el celular.

Si no está corriendo, **Capri funciona exactamente igual que siempre**.

## Cómo prenderlo

| Sistema | Qué hacer |
|---|---|
| Windows | Doble clic en `Capri-Cerebro.exe` (no necesita Python). También sirve `run.bat` si tienes Python. |
| Linux | `./run.sh` |
| Mac | Doble clic en `run.command` |

Si la carpeta `capri-cerebro` está junto a `Capri.exe`, la app lo prende sola al abrir. En su página puedes marcar **Prender con la PC**.

Solo usa Python 3.8 o más nuevo, sin librerías extra y sin GPU.

## Para que pueda hablar con la app cerrada

Necesita con qué pensar:
- **Gemini:** en el chat de Capri escribe `cerebro key sí`, o pega la key en la página del cerebro.
- **Ollama:** si lo tienes abierto en tu PC, lo usa solo, sin key.

## Privacidad

- Todo se guarda en `datos/`, junto al programa.
- En Windows, la memoria va cifrada con tu usuario (DPAPI). Solo se abre en esa PC con tu sesión.
- Para llevarla en una USB a otra PC, arráncalo con `--sin-cifrar`.
- Solo acepta conexiones de esta PC y de la app de Capri. Desde tu wifi pide el código, y solo si prendiste esa opción.
- Si usas Gemini, lo que Capri piensa viaja a Google, igual que en la app.

## Comandos en el chat de Capri

`cerebro` · `cerebro key sí/no` · `cerebro abrir` · `cerebro url <dirección> <código>` · `cerebro apagar/prender`

## Opciones

`--puerto 47824` · `--datos <carpeta>` · `--sin-cifrar` · `--red` · `--abrir` · `--hablar-ya` (para probar: habla una vez y sale)

Pruebas: `python prueba_cerebro.py`
