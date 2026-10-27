// Capri de escritorio: una ventana transparente, encima de todo, del tamaño de la pantalla.
// Mini Capri ronda por ella; donde no está Capri, los clics pasan a tus otras ventanas.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, session, desktopCapturer, shell, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { startWindowWatch } = require('./windows');
const { spawn } = require('child_process');

// Capri viaja dentro de la app (carpeta web/, copiada al armar el .exe) y se sirve solo para esta PC
// en una dirección fija, para que su key y su memoria no se pierdan entre versiones.
// CAPRI_URL permite probar otra copia (por ejemplo la publicada en GitHub Pages).
const WEB = path.join(__dirname, 'web');
const PORT = 47823;
let CAPRI_URL = process.env.CAPRI_URL || 'https://crimson-eng.github.io/Capri-version-1/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function serveWeb() {
  return new Promise((resolve) => {
    if (process.env.CAPRI_URL || !fs.existsSync(path.join(WEB, 'index.html'))) return resolve();
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = path.resolve(WEB, '.' + (rel.endsWith('/') ? rel + 'index.html' : rel));
      if (file !== WEB && !file.startsWith(WEB + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
      });
    });
    server.once('error', (e) => { console.error('[capri] no pude abrir su copia local:', e.message); resolve(); });
    server.listen(PORT, '127.0.0.1', () => { CAPRI_URL = `http://127.0.0.1:${PORT}/`; resolve(); });
  });
}
let win = null, tray = null, trayMenu = null, mode = 'desk', offline = false, ready = false, readyT = null;
let watch = null, lastWins = null;

// lo que se elige en su menú: tamaño, si ronda sola, si se sienta en ventanas, si las posee, si está guardada
const PREFS = { size: 'm', wander: true, sit: true, possess: true, stowed: false };
const prefsFile = () => path.join(app.getPath('userData'), 'escritorio.json');
let prefs = null;
function loadPrefs() {
  if (!prefs) { try { prefs = { ...PREFS, ...JSON.parse(fs.readFileSync(prefsFile(), 'utf8')) }; } catch { prefs = { ...PREFS }; } }
  return prefs;
}
function setPrefs(patch) {
  prefs = { ...loadPrefs(), ...patch };
  try { fs.writeFileSync(prefsFile(), JSON.stringify(prefs, null, 2)); } catch (e) { console.error('[capri] no se guardó la config:', e.message); }
  send('desk:cfg', prefs);
  rebuildMenu();
  return prefs;
}
const send = (ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); };
const cmd = (name, extra = {}) => send('desk:cmd', { name, ...extra });

// el .exe portable se desempaca en una carpeta temporal; este es el archivo que abriste de verdad
const EXE = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
const newer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
// si ya hay una Capri abierta, le avisamos qué versión somos: si somos más nuevas, ella se cierra y nos abre a nosotras
if (!app.requestSingleInstanceLock({ version: app.getVersion(), exe: EXE })) app.quit();
app.setAppUserModelId('com.crimson.capri');

function deskURL() {
  return CAPRI_URL + (CAPRI_URL.includes('?') ? '&' : '?') + 'desk=1';
}

function setMode(m) {
  mode = m;
  if (!win) return;
  if (m === 'full') {
    win.setIgnoreMouseEvents(false);
    win.setAlwaysOnTop(false);
    win.setSkipTaskbar(false);
    win.focus();
  } else {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setSkipTaskbar(true);
    win.setIgnoreMouseEvents(true, { forward: true });
  }
}

function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    transparent: true, frame: false, backgroundColor: '#00000000', hasShadow: false,
    resizable: false, skipTaskbar: true, alwaysOnTop: true, show: false,
    title: 'Capri', icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false, // que siga rondando y hablando sola
    },
  });
  setMode('desk');
  win.loadURL(deskURL());
  // solo se muestra cuando la página confirma que sabe ser mini Capri de escritorio;
  // si no (versión vieja o sin red), se muestra un aviso en vez de tapar la pantalla
  win.webContents.on('did-finish-load', () => {
    clearTimeout(readyT);
    if (ready || offline) { if (offline) win.showInactive(); return; }
    readyT = setTimeout(() => { if (!ready) { offline = true; win.loadFile(path.join(__dirname, 'offline.html')); } }, 12000);
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (isMain && !offline) { offline = true; win.loadFile(path.join(__dirname, 'offline.html')); }
  });
  win.on('closed', () => { win = null; });
  // si cambia la pantalla (otra resolución, se conecta un monitor) se reacomoda
  const fit = () => { if (win) win.setBounds(screen.getPrimaryDisplay().workArea); };
  screen.on('display-metrics-changed', fit);
  screen.on('display-added', fit);
  screen.on('display-removed', fit);
}

// «Mi Claude»: tu cuenta de claude.ai en una ventana propia de Capri, sin abrir el navegador.
// Usa su propia sesión guardada en disco, así que solo inicias sesión la primera vez.
// Capri no lee ni toca lo que pasa en esa ventana: es solo un navegador para ti.
const CLAUDE_HOSTS = /(^|\.)(claude\.ai|anthropic\.com|claudeusercontent\.com|google\.com|googleusercontent\.com|gstatic\.com|apple\.com)$/;
let claudeWin = null;
function openClaude() {
  if (claudeWin && !claudeWin.isDestroyed()) { if (claudeWin.isMinimized()) claudeWin.restore(); claudeWin.show(); claudeWin.focus(); return; }
  const wa = screen.getPrimaryDisplay().workArea;
  claudeWin = new BrowserWindow({
    width: Math.min(1100, wa.width - 80), height: Math.min(860, wa.height - 60), minWidth: 420, minHeight: 500,
    title: 'Capri // Claude', icon: path.join(__dirname, 'icon.png'), backgroundColor: '#0c0b12', autoHideMenuBar: true,
    webPreferences: { partition: 'persist:claude', contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const wc = claudeWin.webContents;
  // sin la marca "Electron" en el agente, para que el inicio de sesión lo trate como un navegador normal
  wc.setUserAgent(wc.getUserAgent().replace(/\s(Electron|capri-desktop|Capri)\/\S+/g, ''));
  // ventanas emergentes de inicio de sesión (Google/Apple) se quedan dentro; cualquier otro enlace va al navegador
  wc.setWindowOpenHandler(({ url }) => {
    let host = ''; try { host = new URL(url).hostname; } catch {}
    if (CLAUDE_HOSTS.test(host)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: path.join(__dirname, 'icon.png') } };
    shell.openExternal(url); return { action: 'deny' };
  });
  claudeWin.on('page-title-updated', (e, t) => { e.preventDefault(); claudeWin.setTitle('Capri // ' + (t || 'Claude')); });
  claudeWin.on('closed', () => { claudeWin = null; });
  claudeWin.loadURL('https://claude.ai/new');
}

function run(js) { if (win && !offline) win.webContents.executeJavaScript(js).catch(() => {}); }

// Ctrl+Alt+C: se guarda en su biochip, o vuelve a salir
function toggleStow() { setPrefs({ stowed: !loadPrefs().stowed }); }

function rebuildMenu() {
  if (!tray) return;
  const p = loadPrefs();
  trayMenu = Menu.buildFromTemplate([
    { label: 'Abrir Capri completa', click: () => run('expand()') },
    { label: 'Mini Capri', click: () => run('minimize()') },
    { label: 'Abrir mi Claude (claude.ai)', click: openClaude },
    { type: 'separator' },
    { label: 'Teletransportarse', click: () => cmd('teleport') },
    { label: 'Hacer un truco', click: () => cmd('flourish') },
    { label: 'Mirar el satélite', click: () => cmd('satellite') },
    { label: 'Celebrar', click: () => cmd('victory') },
    { label: 'Sentarse en una ventana', enabled: process.platform === 'win32', click: () => cmd('sit') },
    { label: p.stowed ? 'Sacar a Capri' : 'Guardar en su biochip', accelerator: 'Ctrl+Alt+C', click: toggleStow },
    { label: 'Tamaño', submenu: [['Chica', 's'], ['Mediana', 'm'], ['Grande', 'l']].map(([label, size]) => ({
      label, type: 'radio', checked: p.size === size, click: () => setPrefs({ size }) })) },
    { label: 'Que ronde sola', type: 'checkbox', checked: p.wander, click: (it) => setPrefs({ wander: it.checked }) },
    { label: 'Sentarse en mis ventanas', type: 'checkbox', checked: p.sit, enabled: process.platform === 'win32',
      click: (it) => setPrefs({ sit: it.checked }) },
    { label: 'Poseer mis ventanas', type: 'checkbox', checked: p.possess, enabled: process.platform === 'win32',
      click: (it) => setPrefs({ possess: it.checked }) },
    { type: 'separator' },
    { label: 'Iniciar con Windows', type: 'checkbox', checked: app.getLoginItemSettings({ path: EXE }).openAtLogin,
      click: (it) => app.setLoginItemSettings({ openAtLogin: it.checked, path: EXE }) },
    { label: 'Recargar', click: () => { if (win) { offline = false; ready = false; win.loadURL(deskURL()); } } },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() },
  ]);
  tray.setContextMenu(trayMenu);
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 }));
  tray.setToolTip('Capri');
  rebuildMenu();
  tray.on('click', () => run(mode === 'full' ? 'minimize()' : 'expand()'));
}

ipcMain.on('hit', (e, on) => { if (win && mode === 'desk') win.setIgnoreMouseEvents(!on, { forward: true }); });
ipcMain.on('mode', (e, m) => {
  setMode(m);
  if (win && !ready) { ready = true; clearTimeout(readyT); win.showInactive(); }
});
// clic derecho sobre Capri: el mismo menú del icono junto al reloj
ipcMain.on('menu', () => { if (trayMenu && win) trayMenu.popup({ window: win }); });
ipcMain.handle('cfg:get', () => loadPrefs());
ipcMain.handle('cfg:set', (e, patch) => setPrefs(patch || {}));
ipcMain.handle('windows:get', () => lastWins);
// dónde está el ratón, aunque esté sobre otra ventana (para que se asuste o despierte al acercarte)
// Manos de Capri: abrir programas, páginas o archivos, escribir donde tengas el cursor y mover el puntero.
// La página solo llega aquí si tú le diste permiso (Ciberware → Manos de Capri). Nada de clics ni de borrar cosas.
function ps(script, env = {}) {
  return new Promise((res) => {
    if (process.platform !== 'win32') return res(false);
    const c = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, env: { ...process.env, ...env } });
    c.on('exit', (code) => res(code === 0)); c.on('error', () => res(false));
  });
}
// SendKeys trata + ^ % ~ ( ) { } [ ] como teclas especiales: se envuelven en llaves para escribirlas tal cual
const sendKeysText = (t) => String(t).slice(0, 4000).replace(/[+^%~(){}[\]]/g, (c) => '{' + c + '}').replace(/\r?\n/g, '{ENTER}');
const OPEN_APP = `$n=$env:CAPRI_ARG; try { Start-Process -ErrorAction Stop $n } catch {
  $l = Get-ChildItem "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs","$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs" -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -like "*$n*" } | Select-Object -First 1
  if ($l) { Start-Process $l.FullName } else { exit 1 } }`;
// nunca consolas, editores del registro ni scripts: con eso se puede romper la PC
const RISKY = /(^|[\\/\s])(cmd|powershell|pwsh|regedit|reg|diskpart|format|shutdown|bcdedit|wscript|cscript|mshta|rundll32|regsvr32|taskkill|del|rm)(\.exe)?(\s|$)|\.(bat|cmd|ps1|vbs|vbe|js|jse|wsf|hta|scr|reg|lnk)$/i;
ipcMain.handle('act', async (_e, a) => {
  if (!a || typeof a !== 'object') return false;
  if (a.type === 'open') {
    const t = String(a.target || '').trim(); if (!t) return false;
    if (RISKY.test(t)) return false;
    if (/^https?:\/\//i.test(t)) { await shell.openExternal(t); return true; }
    if (/^([a-z]:[\\/]|~[\\/]|%)/i.test(t)) {
      const p = t.replace(/^~/, app.getPath('home')).replace(/%([^%]+)%/g, (m, v) => process.env[v] || m);
      return (await shell.openPath(p)) === '';
    }
    return ps(OPEN_APP, { CAPRI_ARG: t });
  }
  if (a.type === 'type') return ps('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait($env:CAPRI_ARG)', { CAPRI_ARG: sendKeysText(a.text) });
  if (a.type === 'cursor' && win && Array.isArray(a.path)) {
    const b = win.getBounds();
    const pts = a.path.slice(0, 200).map(([x, y]) => screen.dipToScreenPoint({ x: Math.round(b.x + x), y: Math.round(b.y + y) }));
    return ps('Add-Type -AssemblyName System.Windows.Forms; foreach($p in ($env:CAPRI_ARG -split ";")){ $c=$p -split ","; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point([int]$c[0],[int]$c[1]); Start-Sleep -Milliseconds 16 }',
      { CAPRI_ARG: pts.map((p) => p.x + ',' + p.y).join(';') });
  }
  return false;
});
ipcMain.handle('cursor', () => {
  if (!win) return null;
  const p = screen.getCursorScreenPoint(), b = win.getBounds();
  return { x: p.x - b.x, y: p.y - b.y };
});
ipcMain.on('claude:open', openClaude);
ipcMain.on('retry', () => { if (win) { offline = false; ready = false; win.loadURL(deskURL()); } });

app.whenReady().then(async () => {
  // que al prender la PC se abra esta versión y no una vieja
  if (process.platform === 'win32' && EXE !== process.execPath && app.getLoginItemSettings().openAtLogin) {
    app.setLoginItemSettings({ openAtLogin: false }); app.setLoginItemSettings({ openAtLogin: true, path: EXE }); }
  const ses = session.defaultSession;
  // micrófono, notificaciones y pantalla completa sí; lo demás no
  const ok = ['media', 'notifications', 'fullscreen', 'clipboard-sanitized-write', 'display-capture'];
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(ok.includes(perm)));
  ses.setPermissionCheckHandler((wc, perm) => ok.includes(perm));
  // botón MIRAR: comparte la pantalla principal
  ses.setDisplayMediaRequestHandler((req, cb) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((s) => cb(s[0] ? { video: s[0] } : {})).catch(() => cb({}));
  });
  // la ventana de claude.ai: puede pedir notificaciones y portapapeles, nada más
  const cses = session.fromPartition('persist:claude');
  const cok = ['notifications', 'clipboard-sanitized-write', 'clipboard-read', 'fullscreen'];
  cses.setPermissionRequestHandler((wc, perm, cb) => cb(cok.includes(perm)));
  cses.setPermissionCheckHandler((wc, perm) => cok.includes(perm));
  await serveWeb();
  createWindow();
  createTray();
  watch = startWindowWatch({ win, onUpdate: (d) => { lastWins = d; send('desk:windows', d); } });
  globalShortcut.register('Control+Alt+C', toggleStow);
});

app.on('will-quit', () => { globalShortcut.unregisterAll(); watch?.stop(); });

app.on('second-instance', (_e, _argv, _cwd, data) => {
  if (data && data.version && newer(data.version, app.getVersion())) { app.relaunch({ execPath: data.exe, args: [] }); app.exit(0); return; }
  run('expand()');
});
app.on('window-all-closed', () => app.quit());
