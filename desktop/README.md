# Capri de escritorio (Windows)

Mini Capri ronda por tu escritorio, encima de todas tus ventanas. Donde no está ella, los clics pasan a tus otras apps.

Capri anda por tu pantalla como personaje (la Capri pixel), a la manera de [capri-desktop](https://github.com/mochiiwuff/capri-desktop):

- **Entra con glitch**, saluda y cae a su lugar.
- **Ronda sola**: camina de manos, se teletransporta (se vuelve una línea roja y reaparece en otro lado), se asoma por abajo o por los lados de la pantalla (si acercas el ratón se esconde), te persigue el cursor y le lanza un rayo, y hace trucos con sus otras mentes (una copia verde y una roja).
- **Se sienta encima de tus ventanas** (solo Windows): va con la ventana si la mueves y se cae si la cierras, minimizas, maximizas o tapas. A veces **posee la ventana** dos segundos (marco rojo y sus ojos); no lee nada de lo que hay dentro.
- **Se cae** con gravedad, y una orilla de ventana la puede atrapar en el camino. Si la arrastras y la sueltas sobre la orilla de una ventana, se queda sentada ahí.
- **Duerme** después de 10 minutos sin que le hables; acerca el ratón y despierta.
- **Tócala** para abrirle su globo y hablarle; cuando piensa, escucha o contesta se le ve en la pose y en la etiqueta de su cabeza, y el globo sale junto a ella. Varios toques seguidos la molestan.
- **Clic derecho** sobre ella: su menú (el mismo del icono junto al reloj): teletransportarse, truco, sentarse en una ventana, guardarla, tamaño, que ronde sola, sentarse en / poseer tus ventanas, iniciar con Windows.
- **Ctrl+Alt+C**: se guarda en su biochip (la estrellita, abajo a la izquierda). Un clic en el biochip o Ctrl+Alt+C otra vez la saca.
- **⤢** abre Capri completa; el botón **MINI** la regresa al escritorio.

Solo atrapa el ratón donde está su cuerpo, pixel por pixel; el resto de la pantalla funciona normal. Para saber dónde están tus ventanas usa un pequeño script de PowerShell (`windows.ps1`) que lee solo posiciones, sin títulos ni contenido. En Mac y Linux ronda, se asoma, cae y duerme, pero no se sienta en ventanas.

La página de Capri viaja dentro de la app (`copy-web.js` la copia a `web/` antes de armar el .exe) y se sirve solo para tu PC en `http://127.0.0.1:47823`, así funciona aunque GitHub Pages tenga otra versión. Para tener lo nuevo hay que bajar el .exe nuevo. Tu API key y la memoria se guardan dentro de la app, aparte del navegador, así que la primera vez hay que pegar la key en ⚙. Para probar otra copia: `CAPRI_URL=https://… npm start`.

El instalador lo genera GitHub Actions (`.github/workflows/desktop.yml`). Para probar en tu PC con Node: `npm install` y `npm start` en esta carpeta.

La parte de moverse por el escritorio (`windows.js`, `windows.ps1` y los comportamientos de `desk.js`) está adaptada de capri-desktop, licencia MIT: ver `LICENSES/capri-desktop.txt`. Su arte no se usa; Capri usa sus propios sprites.
