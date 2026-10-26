// Copia la página de Capri (la misma de GitHub Pages) dentro de la app antes de armar el .exe.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'web');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of ['index.html', 'desk.js', 'medico.js', 'ingles.js', 'hud.js', 'manifest.webmanifest', 'assets', 'icons']) {
  fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
}
console.log('página de Capri copiada en', out);
