// Le pasa a la página dónde están tus otras ventanas (solo Windows), para que Capri se siente encima.
// Un ayudante de PowerShell (windows.ps1) lee las posiciones, sin títulos ni contenido, y aquí se
// pasan a coordenadas de la ventana de Capri.
// Adaptado de capri-desktop (https://github.com/mochiiwuff/capri-desktop), licencia MIT.
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { screen } = require('electron');

// instalada, el script vive fuera del archivo .asar (asarUnpack) para que PowerShell lo pueda leer
const SCRIPT = path.join(__dirname, 'windows.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

function startWindowWatch({ win, onUpdate }) {
  if (process.platform !== 'win32') return { stop() {} };
  let child = null, stopped = false, restarts = 0;
  const handle = win.getNativeWindowHandle();
  const self = handle.length >= 8 ? handle.readBigUInt64LE(0) : BigInt(handle.readUInt32LE(0));

  const start = () => {
    child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', SCRIPT, String(self), String(process.pid)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      let snap;
      try { snap = JSON.parse(line); } catch { return; }
      if (win.isDestroyed()) return;
      const b = win.getBounds();
      const wins = snap.wins.map((w) => {
        const d = screen.screenToDipRect(null, { x: w.x, y: w.y, width: w.w, height: w.h });
        return { id: w.id, x: d.x - b.x, y: d.y - b.y, w: d.width, h: d.height, max: w.max };
      }).filter((w) => w.x < b.width && w.x + w.w > 0 && w.y < b.height && w.y + w.h > 0);
      onUpdate({ fg: snap.fg, wins });
    });
    child.stderr.on('data', (d) => console.error('[capri] ventanas:', String(d).trim()));
    child.on('exit', () => { child = null; if (!stopped && restarts++ < 3) setTimeout(start, 3000); });
  };
  start();
  return { stop() { stopped = true; child?.kill(); } };
}

module.exports = { startWindowWatch };
