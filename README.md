# Project Capri

Capri es una asistente personal con personalidad propia: platica contigo por texto o voz, mira tu pantalla si se lo pides, te ayuda a estudiar con tus documentos y habla sola de vez en cuando para hacerte compañía.

## Cómo usarla

1. Abre la página publicada (GitHub Pages) en Chrome o Edge, en la PC o en el celular.
2. Instálala: en la PC, ícono de "Instalar" en la barra de direcciones; en Android, menú ⋮ → "Instalar app"; en iPhone (Safari), Compartir → "Agregar a inicio".
3. Abre ⚙, pega tu API key de Google Gemini, dale "Conectar" y elige un modelo flash.

Tu key, tu memoria y tus documentos se guardan solo en el navegador de cada dispositivo.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | Toda la app (pantalla, voz, cerebro con Gemini, estudio) |
| `rip.js` | Pestaña R.I.P: fuentes oficiales (GPC, NOM, Compendio), verificador de medicamentos, lector de escaneos, modo estudio, respaldo del expediente y calculadoras clínicas |
| `receta.js` | Receta médica para imprimir o guardar en PDF: Capri la redacta con el tratamiento del expediente, revisa lo que pide el Reglamento de Insumos para la Salud (arts. 28–31), alergias, interacciones, antibióticos y controlados; tres estilos, media carta o carta, logo y color. Botón ℞ en el expediente o comando `receta` |
| `vendor/ocr/` | Lector de escaneos (Tesseract.js, Apache-2.0) con español e inglés, para leer fotos y PDF escaneados sin internet |
| `assets/*.webp` | Las animaciones de Capri |
| `manifest.webmanifest`, `icons/` | Lo que permite instalarla como app |
| `sw.js` | Guarda la app en el dispositivo para que abra rápido. Sube `VERSION` cuando cambies archivos |

## Probarla en tu PC

```
python -m http.server 8000
```

Luego abre http://localhost:8000 (abrir `index.html` con doble clic también funciona, pero sin instalación).
