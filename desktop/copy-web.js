// Copia la página de Capri (la misma de GitHub Pages) dentro de la app antes de armar el .exe.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'web');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of ['index.html', 'boveda.html', 'boveda.js', 'desk.js', 'medico.js', 'ingles.js', 'manos.js', 'redaccion.js', 'crimson.js', 'tecnico.js', 'saber.js', 'clinica.js', 'mundo.js', 'expediente.js', 'biblioteca.js', 'rip.js', 'lectura.js', 'vozlocal.js', 'voz.js', 'cerebro.js', 'aprende.js', 'hilos.js', 'asocia.js', 'hud.js', 'relic.js', 'relic3d.js', 'holo3d.js', 'vendor', 'manifest.webmanifest', 'assets', 'icons']) {
  fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
}
console.log('página de Capri copiada en', out);
