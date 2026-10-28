// Capri de escritorio: una ventana transparente, encima de todo, del tamaño de la pantalla.
// Mini Capri ronda por ella; donde no está Capri, los clics pasan a tus otras ventanas.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, session, desktopCapturer, shell, nativeImage, globalShortcut, safeStorage } = require('electron');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const { startWindowWatch } = require('./windows');
const { spawn, execFile } = require('child_process');

// Aceleración por GPU: que Chromium dibuje con la tarjeta dedicada (en laptops con dos GPU usa la potente, no la integrada),
// rasterice en la GPU y no la descarte por estar en listas viejas. El holograma 3D y las animaciones van más fluidos.
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Capri viaja dentro de la app (carpeta web/, copiada al armar el .exe) y se sirve solo para esta PC
// en una dirección fija, para que su key y su memoria no se pierdan entre versiones.
// CAPRI_URL permite probar otra copia (por ejemplo la publicada en GitHub Pages).
const WEB = path.join(__dirname, 'web');
const PORT = 47823;
let CAPRI_URL = process.env.CAPRI_URL || 'https://crimson-eng.github.io/Capri-version-1/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.gz': 'application/gzip' };

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
// ---------- modo portátil (USB) ----------
// Si junto al .exe hay una carpeta «CapriData», TODO lo de Capri (memoria, pláticas, apuntes, expediente, keys, sesión de
// claude.ai, respaldos) se guarda ahí y no en la PC: te la llevas en la USB y en la PC donde la conectes no queda nada.
// Para pasarte a la USB: menú de la bandeja → «Llevar mis datos junto al .exe»; se copian al volver a abrir Capri.
const DIR_EXE = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
const DATA_USB = path.join(DIR_EXE, 'CapriData');
const DATA_PC = app.getPath('userData');
const PORTATIL = fs.existsSync(DATA_USB);
if (PORTATIL) {
  const marca = path.join(DATA_USB, '.copiar-desde');
  if (fs.existsSync(marca)) {   // primera vez: se copian los datos de esta PC (Capri estaba cerrada, así que nada está en uso)
    try { const src = fs.readFileSync(marca, 'utf8').trim(); if (src && fs.existsSync(src) && path.resolve(src) !== path.resolve(DATA_USB))
      fs.cpSync(src, DATA_USB, { recursive: true, force: false, errorOnExist: false, filter: (f) => !/[\\/](Cache|Code Cache|GPUCache|DawnCache|GrShaderCache|ShaderCache|Crashpad|SingletonLock|SingletonCookie|SingletonSocket|lockfile)([\\/]|$)/.test(f) }); }
    catch (e) { console.error('no pude copiar los datos a la USB:', e.message); }
    try { fs.unlinkSync(marca); } catch {}
  }
  app.setPath('userData', DATA_USB);
  app.setPath('crashDumps', path.join(DATA_USB, 'Crashpad'));
}
const carpetaDatos = (...p) => PORTATIL ? path.join(DATA_USB, ...p) : path.join(app.getPath('documents'), 'Capri', ...p);
function llevarAUsb() {
  const { dialog } = require('electron');
  if (PORTATIL) return shell.openPath(DATA_USB);
  const r = dialog.showMessageBoxSync({ type: 'question', buttons: ['Sí, llevarlos', 'Cancelar'], defaultId: 0, cancelId: 1, title: 'Capri portátil',
    message: 'Guardar los datos de Capri junto al .exe',
    detail: `Se crea la carpeta:\n${DATA_USB}\n\nAl volver a abrir Capri desde ahí, se copia tu memoria, apuntes, expediente y ajustes de esta PC y desde entonces todo se guarda en esa carpeta (llévala junto con el .exe en tu USB).\n\nCapri se va a cerrar para copiar todo sin que nada esté en uso.` });
  if (r !== 0) return;
  try { fs.mkdirSync(DATA_USB, { recursive: true }); fs.writeFileSync(path.join(DATA_USB, '.copiar-desde'), DATA_PC); }
  catch (e) { return dialog.showErrorBox('No pude crear la carpeta', e.message + '\n\n¿La USB está protegida contra escritura?'); }
  app.relaunch({ execPath: EXE }); app.quit();
}

// si ya hay una Capri abierta, le avisamos qué versión somos: si somos más nuevas, ella se cierra y nos abre a nosotras
const LOCK = app.requestSingleInstanceLock({ version: app.getVersion(), exe: EXE });
if (!LOCK) app.quit();

// ---------- bóveda: todo cifrado con tu llave (boveda.js hace el cifrado; aquí solo se guardan los archivos ya cifrados) ----------
// Con la bóveda activa, la ventana de Capri usa una sesión que vive solo en la RAM ('capri-ram'): su IndexedDB y su
// localStorage nunca tocan el disco. Lo único que se escribe es la carpeta Boveda con los archivos cifrados (AES-256-GCM).
const BOVEDA = path.join(app.getPath('userData'), 'Boveda');
const META = path.join(BOVEDA, 'meta.json');
const BOVEDA_ON = fs.existsSync(META);
// lo que Chromium guarda en claro de una sesión normal; se borra la primera vez que Capri abre ya cifrada
const PLANO = ['IndexedDB', 'Local Storage', 'Session Storage', 'WebStorage', 'Service Worker', 'blob_storage', 'databases', 'Cookies', 'Cookies-journal', 'Partitions', 'Network Persistent State', 'TransportSecurity'];
if (LOCK && BOVEDA_ON) {
  const marca = path.join(BOVEDA, '.borrar-plano');
  if (fs.existsSync(marca)) {
    let op = {}; try { op = JSON.parse(fs.readFileSync(marca, 'utf8')); } catch {}
    const dirs = [app.getPath('userData')]; if (op.borrarPC && PORTATIL && path.resolve(DATA_PC) !== path.resolve(DATA_USB)) dirs.push(DATA_PC);
    for (const d of dirs) for (const n of PLANO) { try { fs.rmSync(path.join(d, n), { recursive: true, force: true }); } catch (e) { console.error('[capri] no pude borrar', n, e.message); } }
    try { fs.unlinkSync(marca); } catch {}
  }
}
const nombreOk = (n) => typeof n === 'string' && n.length < 240 && /^[A-Za-z0-9._~%!'()#-]+$/.test(n) && !/^\.+$/.test(n);
const escribeAtomico = async (f, data) => { const t = f + '.tmp'; await fs.promises.writeFile(t, data); await fs.promises.rename(t, f); };
ipcMain.on('boveda:activa', (e) => { e.returnValue = BOVEDA_ON; });
ipcMain.handle('boveda:info', () => {
  let meta = null; try { meta = JSON.parse(fs.readFileSync(META, 'utf8')); } catch {}
  return { activa: BOVEDA_ON, creada: !!meta, meta, dir: BOVEDA, portatil: PORTATIL };
});
ipcMain.handle('boveda:lista', () => { try { return fs.readdirSync(BOVEDA).filter((f) => f.endsWith('.enc')); } catch { return []; } });
ipcMain.handle('boveda:leer', (e, n) => { if (!nombreOk(n)) throw new Error('nombre'); return fs.promises.readFile(path.join(BOVEDA, n)); });
ipcMain.handle('boveda:escribir', async (e, n, bytes) => {
  if (!nombreOk(n) || !n.endsWith('.enc') || !(bytes instanceof Uint8Array)) throw new Error('nombre');
  await fs.promises.mkdir(BOVEDA, { recursive: true });
  await escribeAtomico(path.join(BOVEDA, n), Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return true;
});
ipcMain.handle('boveda:borrar', (e, n) => { if (!nombreOk(n) || !n.endsWith('.enc')) throw new Error('nombre'); fs.rmSync(path.join(BOVEDA, n), { force: true }); return true; });
ipcMain.handle('boveda:meta', async (e, meta, op = {}) => {
  if (!meta || meta.v !== 1 || typeof meta.wrapL !== 'string' || typeof meta.wrapR !== 'string') throw new Error('meta');
  await fs.promises.mkdir(BOVEDA, { recursive: true });
  await escribeAtomico(META, JSON.stringify(meta, null, 1));
  if (!BOVEDA_ON) fs.writeFileSync(path.join(BOVEDA, '.borrar-plano'), JSON.stringify({ borrarPC: !!(op && op.borrarPC) }));
  return true;
});
// antes de cerrar, la página guarda cifrado lo último que cambió (máx. 30 s, por si la USB es lenta)
let escucha = false, cerrando = false;
ipcMain.on('boveda:escucha', (e) => { if (win && e.sender === win.webContents) escucha = true; });
function vaciarBoveda() {
  return new Promise((res) => {
    if (!BOVEDA_ON || !escucha || !win || win.isDestroyed()) return res();
    const t = setTimeout(res, 30000);
    ipcMain.once('boveda:listo', () => { clearTimeout(t); res(); });
    send('boveda:flush');
  });
}
// tu sesión de claude.ai: con bóveda vive en la RAM, así que la página la guarda cifrada aparte (claude.enc) y la vuelve a meter al abrir
let claudeCambio = false;
const esCapri = (e) => win && e.sender === win.webContents;
ipcMain.handle('boveda:claudeSacar', async (e, todo) => {
  if (!BOVEDA_ON || !esCapri(e) || (!claudeCambio && !todo)) return null;
  claudeCambio = false;
  const cs = await session.fromPartition('claude-ram').cookies.get({});
  return cs.map((c) => ({ url: 'https://' + String(c.domain || '').replace(/^\./, '') + (c.path || '/'), name: c.name, value: c.value,
    domain: c.hostOnly ? undefined : c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly, expirationDate: c.expirationDate, sameSite: c.sameSite }));
});
ipcMain.handle('boveda:claudeMeter', async (e, cs) => {
  if (!BOVEDA_ON || !esCapri(e) || !Array.isArray(cs)) return 0;
  const ses = session.fromPartition('claude-ram'), ahora = Date.now() / 1000; let n = 0;
  for (const c of cs.slice(0, 400)) {
    if (!c || typeof c.url !== 'string' || !/^https:\/\/([\w-]+\.)*[\w-]+\//.test(c.url) || (c.expirationDate && c.expirationDate < ahora)) continue;
    try { await ses.cookies.set(c); n++; } catch {}
  }
  setTimeout(() => { claudeCambio = false; }, 500);
  return n;
});
// «Recordarme en esta PC»: la llave maestra se guarda protegida por Windows (DPAPI, solo tu usuario de esta PC la abre)
// en la carpeta de Capri de ESTA PC, nunca en la USB. En otra PC, o con otro usuario, te vuelve a pedir la llave.
const RECUERDA = path.join(DATA_PC, 'Recordar');
// (CAPRI_PRUEBA_RECORDAR=1 solo para las pruebas en Linux sin llavero: ahí la protección sería texto plano)
const PRUEBA_REC = process.env.CAPRI_PRUEBA_RECORDAR === '1' && process.platform === 'linux';
const protegeOk = () => PRUEBA_REC || (safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text'));
function archivoRecuerda() {
  try { const m = JSON.parse(fs.readFileSync(META, 'utf8')); return path.join(RECUERDA, crypto.createHash('sha256').update(m.salt + ':' + m.creado).digest('hex').slice(0, 20) + '.llave'); } catch { return null; }
}
ipcMain.handle('boveda:recordar', async (e, raw) => {
  const f = archivoRecuerda(); if (!BOVEDA_ON || !esCapri(e) || !f || typeof raw !== 'string' || !protegeOk()) return false;
  await fs.promises.mkdir(RECUERDA, { recursive: true }); await escribeAtomico(f, safeStorage.encryptString(raw)); return true;
});
ipcMain.handle('boveda:recordada', async (e) => {
  const f = archivoRecuerda(); if (!BOVEDA_ON || !esCapri(e) || !f || !protegeOk()) return null;
  try { return safeStorage.decryptString(await fs.promises.readFile(f)); } catch { return null; }
});
ipcMain.handle('boveda:recordando', () => { const f = archivoRecuerda(); return { puede: protegeOk(), si: !!f && fs.existsSync(f) }; });
ipcMain.handle('boveda:olvidar', () => { const f = archivoRecuerda(); if (f) fs.rmSync(f, { force: true }); return true; });
ipcMain.on('boveda:reiniciar', () => { app.relaunch({ execPath: EXE }); app.quit(); });
ipcMain.on('boveda:salir', () => app.quit());
app.on('before-quit', (e) => {
  if (cerrando || !BOVEDA_ON) return;
  e.preventDefault(); cerrando = true;
  vaciarBoveda().then(() => app.quit());
});
const sesionCapri = () => BOVEDA_ON ? session.fromPartition('capri-ram') : session.defaultSession;
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
      autoplayPolicy: 'no-user-gesture-required', // la voz de Gemini suena aunque no le hayas dado clic
      ...(BOVEDA_ON ? { partition: 'capri-ram' } : {}), // con bóveda: nada de la página se escribe al disco
    },
  });
  setMode('desk');
  // con bóveda, primero la pantalla de la llave; ella abre a Capri ya descifrada
  win.loadURL(BOVEDA_ON ? CAPRI_URL + 'boveda.html?next=' + encodeURIComponent(deskURL()) : deskURL());
  win.webContents.on('did-navigate', () => { escucha = false; });
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
    // con bóveda la sesión de claude.ai vive en la RAM y se guarda cifrada en la bóveda (claude.enc)
    webPreferences: { partition: BOVEDA_ON ? 'claude-ram' : 'persist:claude', contextIsolation: true, nodeIntegration: false, sandbox: true },
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
    { label: PORTATIL ? '💾 Datos en la USB: abrir carpeta' : '💾 Llevar mis datos junto al .exe (USB)', click: llevarAUsb },
    ...(BOVEDA_ON ? [{ label: '🔐 Bloquear Capri (guarda y pide la llave)', click: () => run('window.Boveda&&Boveda.bloquear()') }] : []),
    { label: 'Iniciar con Windows', enabled: !PORTATIL, type: 'checkbox', checked: app.getLoginItemSettings({ path: EXE }).openAtLogin,
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
// igual que ps() pero devuelve el código de salida y lo que imprimió
function psx(script, env = {}) {
  return new Promise((res) => {
    if (process.platform !== 'win32') return res({ code: -1, out: '' });
    let out = '';
    const c = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, env: { ...process.env, ...env } });
    c.stdout.on('data', (d) => { out += d; });
    c.on('exit', (code) => res({ code, out: out.trim() })); c.on('error', () => res({ code: -1, out: '' }));
  });
}
// ventanas abiertas (programa y título) para que Capri sepa qué puede guardar o cerrar; nunca las de Capri
const SELF = () => app.getAppMetrics().map((m) => m.pid).join(',');
const LIST_WINS = `$self = $env:CAPRI_SELF -split ','
Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -and ($self -notcontains [string]$_.Id) -and $_.ProcessName -notmatch '^(explorer|TextInputHost|ShellExperienceHost|SearchHost|StartMenuExperienceHost|LockApp)$' } |
  ForEach-Object { $_.ProcessName + [char]9 + $_.MainWindowTitle }`;
// guardar = trae la ventana al frente y manda Ctrl+S; cerrar = guarda y luego le pide a la ventana que se cierre
// (como darle a la X: si el programa pregunta algo, te lo pregunta a ti). Nunca mata procesos.
const WIN_ACT = `Add-Type @"
using System; using System.Runtime.InteropServices;
public class CapriW {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, uint f, UIntPtr e);
}
"@
$n = $env:CAPRI_ARG; $mode = $env:CAPRI_MODE; $self = $env:CAPRI_SELF -split ','
$p = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($self -notcontains [string]$_.Id) -and $_.ProcessName -notmatch '^(explorer|TextInputHost|ShellExperienceHost|SearchHost|StartMenuExperienceHost|LockApp|dwm|winlogon|csrss)$' -and ($_.MainWindowTitle -like "*$n*" -or $_.ProcessName -like "*$n*") } | Select-Object -First 1
if (-not $p) { exit 2 }
$h = $p.MainWindowHandle
[CapriW]::ShowWindow($h, 9) | Out-Null
[CapriW]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [CapriW]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[CapriW]::SetForegroundWindow($h) | Out-Null; Start-Sleep -Milliseconds 350
if ([CapriW]::GetForegroundWindow() -ne $h) { exit 3 }
$browser = $p.ProcessName -match '^(chrome|msedge|firefox|opera|brave|vivaldi)$'
if ($mode -ne 'cerrar-sin' -and -not $browser) { Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^s'); Start-Sleep -Milliseconds 1300 }
if ($mode -like 'cerrar*') { $p.CloseMainWindow() | Out-Null }
Write-Output ($p.ProcessName + [char]9 + $p.MainWindowTitle)`;
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
  if (a.type === 'windows') {
    const r = await psx(LIST_WINS, { CAPRI_SELF: SELF() });
    return r.out ? r.out.split(/\r?\n/).map((l) => { const [name, ...t] = l.split('\t'); return { name, title: t.join(' ') }; }).slice(0, 40) : [];
  }
  if (a.type === 'guardar' || a.type === 'cerrar') {
    const t = String(a.target || '').trim(); if (!t || /[*?[\]`$]/.test(t)) return { ok: false, why: 'nombre' };
    const r = await psx(WIN_ACT, { CAPRI_ARG: t, CAPRI_SELF: SELF(), CAPRI_MODE: a.type === 'cerrar' ? (a.save === false ? 'cerrar-sin' : 'cerrar') : 'guardar' });
    return { ok: r.code === 0, why: { 2: 'no-encontre', 3: 'no-pude-enfocar' }[r.code] || (r.code ? 'error' : ''), win: r.out };
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
// ---------- Taller técnico: diagnosticar y reparar memorias USB (solo Windows) ----------
// La página propone; aquí se vuelve a comprobar todo: que el disco sea USB/SD, que no sea el de Windows,
// que la letra sea suya y que no lo hayan cambiado por otro desde que lo viste. Lo que borra o repara
// corre con permiso de administrador, así que Windows también te pregunta (UAC).
const USB_LIST = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$wp = (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\StorageDevicePolicies' -Name WriteProtect).WriteProtect
$sysL = $env:SystemDrive.Substring(0,1)
$disks = @(Get-Disk | Where-Object { $_.BusType -match '^(USB|SD|MMC)$' })
$out = @(foreach ($d in $disks) {
  $parts = @(Get-Partition -DiskNumber $d.Number)
  $vols = @(foreach ($p in $parts) { if ($p.DriveLetter) { $v = Get-Volume -DriveLetter $p.DriveLetter
    [pscustomobject]@{ letra = [string]$p.DriveLetter; fs = [string]$v.FileSystem; etiqueta = [string]$v.FileSystemLabel; salud = [string]$v.HealthStatus; estado = [string]$v.OperationalStatus; tam = $v.Size; libre = $v.SizeRemaining; soloLectura = [bool]$p.IsReadOnly } } })
  $sinLetra = @($parts | Where-Object { -not $_.DriveLetter -and $_.Type -notmatch 'Reserved|System' }).Count
  [pscustomobject]@{ num = $d.Number; nombre = [string]$d.FriendlyName; tam = $d.Size; bus = [string]$d.BusType; estilo = [string]$d.PartitionStyle; soloLectura = [bool]$d.IsReadOnly; offline = [bool]$d.IsOffline; salud = [string]$d.HealthStatus; estado = [string]$d.OperationalStatus; sistema = [bool]($d.IsSystem -or $d.IsBoot -or ($vols | Where-Object { $_.letra -eq $sysL })); particiones = $parts.Count; sinLetra = $sinLetra; volumenes = $vols }
})
$idx = @($disks | ForEach-Object { [int]$_.Number })
$sinMedio = @(Get-CimInstance Win32_DiskDrive | Where-Object { $_.InterfaceType -eq 'USB' -and ($idx -notcontains [int]$_.Index) } | ForEach-Object { [pscustomobject]@{ nombre = [string]$_.Model; medio = [bool]$_.MediaLoaded; estado = [string]$_.Status } })
$prob = @(Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like 'USB*' -and $_.Status -ne 'OK' -and $_.Status -ne 'Unknown' } | Select-Object -First 8 | ForEach-Object { [pscustomobject]@{ nombre = [string]$_.FriendlyName; estado = [string]$_.Status; clase = [string]$_.Class } })
[pscustomobject]@{ politicaWP = [int]$wp; discos = $out; sinMedio = $sinMedio; problemas = $prob } | ConvertTo-Json -Depth 5 -Compress`;
// prueba de lectura/escritura: escribe 8 MB (sin caché), los vuelve a leer, compara y los borra
const USB_TEST = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$r = $env:CAPRI_L + ':\\'
$res = [ordered]@{ lee = $false; archivos = 0; escribe = $false; verifica = $false; mbps = 0; error = '' }
try { $res.archivos = @(Get-ChildItem -LiteralPath $r -Force -ErrorAction Stop).Count; $res.lee = $true } catch { $res.error = 'leer: ' + $_.Exception.Message }
if ($res.lee) {
  $f = Join-Path $r ('.capri-prueba-' + [guid]::NewGuid().ToString('N').Substring(0,6) + '.bin')
  try {
    $b = New-Object byte[] (8MB); (New-Object Random).NextBytes($b)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $s = New-Object IO.FileStream($f, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None, 65536, [IO.FileOptions]::WriteThrough)
    $s.Write($b, 0, $b.Length); $s.Close(); $sw.Stop()
    $res.escribe = $true; $res.mbps = [math]::Round(8 / [math]::Max($sw.Elapsed.TotalSeconds, 0.001), 1)
    $h = New-Object Security.Cryptography.SHA256Managed
    $res.verifica = [BitConverter]::ToString($h.ComputeHash($b)) -eq [BitConverter]::ToString($h.ComputeHash([IO.File]::ReadAllBytes($f)))
  } catch { $res.error = 'escribir: ' + $_.Exception.Message } finally { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue }
}
$res | ConvertTo-Json -Compress`;
// rescatar: copia todo lo legible a la PC; robocopy reintenta poco y sigue con lo demás si un archivo está dañado
const USB_RESCUE = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
New-Item -ItemType Directory -Force -Path $env:CAPRI_DST | Out-Null
robocopy ($env:CAPRI_L + ':\\') $env:CAPRI_DST /E /R:1 /W:1 /XJ /NP /NFL /NDL /COPY:DT /DCOPY:T /XD 'System Volume Information' '$RECYCLE.BIN' | Out-String
exit $LASTEXITCODE`;
const USB_EJECT = `$d = (New-Object -ComObject Shell.Application).Namespace(17).ParseName($env:CAPRI_L + ':'); if (-not $d) { exit 2 }
$d.InvokeVerb('Eject'); Start-Sleep -Seconds 2; if (Test-Path ($env:CAPRI_L + ':\\')) { exit 3 }`;
// lo que necesita administrador, ya con valores comprobados (número de disco, letra, sistema de archivos y nombre limpios)
const FMT_OUT = `Format-List DriveLetter, FileSystem, FileSystemLabel, Size, SizeRemaining, HealthStatus | Out-String`;
const ADMIN = {
  revisar: ({ L }) => `chkdsk ${L}: | Out-String\n$global:capriCode = $LASTEXITCODE`,
  reparar: ({ L }) => `chkdsk ${L}: /f /x | Out-String\n$global:capriCode = $LASTEXITCODE`,
  desproteger: ({ N }) => `$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\StorageDevicePolicies'
if ((Get-ItemProperty -Path $k -Name WriteProtect -ErrorAction SilentlyContinue).WriteProtect -eq 1) { Set-ItemProperty -Path $k -Name WriteProtect -Value 0 -ErrorAction Stop; 'Política WriteProtect de Windows: 1 -> 0' }
$d = Get-Disk -Number ${N} -ErrorAction Stop
if ($d.IsOffline) { Set-Disk -Number ${N} -IsOffline $false -ErrorAction Stop; 'Disco puesto en línea' }
if ($d.IsReadOnly) { Set-Disk -Number ${N} -IsReadOnly $false -ErrorAction Stop; 'Atributo de solo lectura del disco quitado' }
Get-Partition -DiskNumber ${N} -ErrorAction SilentlyContinue | Where-Object { $_.IsReadOnly } | ForEach-Object { Set-Partition -DiskNumber ${N} -PartitionNumber $_.PartitionNumber -IsReadOnly $false -ErrorAction Stop; 'Solo lectura quitado de la partición ' + $_.PartitionNumber }
Start-Sleep -Seconds 1
if ((Get-Disk -Number ${N}).IsReadOnly) { 'SIGUE EN SOLO LECTURA'; $global:capriCode = 4 } else { 'El disco ya no está en solo lectura' }`,
  letra: ({ N }) => `if ((Get-Disk -Number ${N} -ErrorAction Stop).IsOffline) { Set-Disk -Number ${N} -IsOffline $false -ErrorAction Stop; 'Disco puesto en línea' }
$p = Get-Partition -DiskNumber ${N} -ErrorAction Stop | Where-Object { -not $_.DriveLetter -and $_.Type -notmatch 'Reserved|System' } | Select-Object -First 1
if (-not $p) { 'No hay partición sin letra'; $global:capriCode = 2 } else {
  Add-PartitionAccessPath -DiskNumber ${N} -PartitionNumber $p.PartitionNumber -AssignDriveLetter -ErrorAction Stop
  'Letra asignada: ' + (Get-Partition -DiskNumber ${N} -PartitionNumber $p.PartitionNumber).DriveLetter }`,
  formatear: ({ L, FS, LBL }) => `Format-Volume -DriveLetter ${L} -FileSystem ${FS} -NewFileSystemLabel '${LBL}' -Confirm:$false -Force -ErrorAction Stop | ${FMT_OUT}`,
  reconstruir: ({ N, FS, LBL }) => `$d = Get-Disk -Number ${N} -ErrorAction Stop
if ($d.IsOffline) { Set-Disk -Number ${N} -IsOffline $false -ErrorAction Stop }
if ($d.IsReadOnly) { Set-Disk -Number ${N} -IsReadOnly $false -ErrorAction Stop }
if ($d.PartitionStyle -ne 'RAW') { Clear-Disk -Number ${N} -RemoveData -RemoveOEM -Confirm:$false -ErrorAction Stop; 'Disco limpiado' }
Initialize-Disk -Number ${N} -PartitionStyle MBR -ErrorAction Stop; 'Tabla de particiones MBR nueva'
$p = New-Partition -DiskNumber ${N} -UseMaximumSize -AssignDriveLetter -ErrorAction Stop
Start-Sleep -Seconds 2
Format-Volume -Partition $p -FileSystem ${FS} -NewFileSystemLabel '${LBL}' -Confirm:$false -Force -ErrorAction Stop | ${FMT_OUT}`,
};
const psq = (s) => String(s).replace(/'/g, "''");
async function psAdmin(body) {
  if (process.platform !== 'win32') return { code: -1, out: '', why: 'no-windows' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-tec-'));
  const f = path.join(dir, 'tarea.ps1'), log = path.join(dir, 'salida.txt'), rc = path.join(dir, 'codigo.txt');
  fs.writeFileSync(f, '﻿' + `$ErrorActionPreference = 'Continue'
$global:capriCode = 0
try { & {
${body}
} *>&1 | Out-File -Encoding utf8 -FilePath '${psq(log)}' } catch { $_ | Out-String | Out-File -Append -Encoding utf8 -FilePath '${psq(log)}'; $global:capriCode = 1 }
Set-Content -Path '${psq(rc)}' -Value $global:capriCode`, 'utf8');
  const r = await psx(`try { Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $env:CAPRI_F + '"') -ErrorAction Stop } catch { exit 5 }`, { CAPRI_F: f });
  const read = (p) => { try { return fs.readFileSync(p, 'utf8').replace(/^﻿/, '').trim(); } catch { return ''; } };
  const out = read(log), code = r.code === 5 ? -2 : parseInt(read(rc), 10);
  fs.rm(dir, { recursive: true, force: true }, () => {});
  return { code: Number.isNaN(code) ? -1 : code, out, why: r.code === 5 ? 'uac' : '' };
}
async function usbList() { const r = await psx(USB_LIST); try { return JSON.parse(r.out); } catch { return null; } }
// ¿ese disco es de verdad una USB/SD tuya, y no el disco de Windows?
async function usbTarget(a) {
  const L = await usbList(); if (!L) return { why: 'no-lista' };
  const d = (L.discos || []).find((x) => x && x.num === Number(a.disco));
  if (!d) return { why: 'no-encontre' };
  if (!/^(USB|SD|MMC)$/.test(d.bus) || d.sistema) return { why: 'no-usb' };
  if (a.tam != null && Number(a.tam) !== Number(d.tam)) return { why: 'cambio' };
  let letra = '';
  if (a.letra) {
    letra = String(a.letra).toUpperCase();
    if (!/^[D-Z]$/.test(letra) || !(d.volumenes || []).some((v) => v && v.letra === letra)) return { why: 'letra' };
  }
  return { d, letra };
}
const tail = (s, n = 3500) => (s.length > n ? '…' + s.slice(-n) : s);
ipcMain.handle('tec', async (_e, a) => {
  if (!a || typeof a !== 'object') return { ok: false, why: 'nada' };
  if (process.platform !== 'win32') return { ok: false, why: 'no-windows' };
  if (a.type === 'usb') { const L = await usbList(); return L ? { ok: true, data: L } : { ok: false, why: 'no-lista' }; }
  const t = await usbTarget(a); if (t.why) return { ok: false, why: t.why };
  const { d, letra } = t, N = d.num;
  const needL = ['probar', 'revisar', 'reparar', 'rescatar', 'formatear', 'expulsar'];
  if (needL.includes(a.type) && !letra) return { ok: false, why: 'sin-letra' };
  if (a.type === 'probar') { const r = await psx(USB_TEST, { CAPRI_L: letra }); try { return { ok: true, data: JSON.parse(r.out) }; } catch { return { ok: false, why: 'error', out: r.out }; } }
  if (a.type === 'expulsar') { const r = await psx(USB_EJECT, { CAPRI_L: letra }); return { ok: r.code === 0, why: { 2: 'no-encontre', 3: 'ocupada' }[r.code] || (r.code ? 'error' : '') }; }
  if (a.type === 'rescatar') {
    const v = d.volumenes.find((x) => x.letra === letra), stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const nombre = (String(v?.etiqueta || '').replace(/[^\w -]/g, '').trim() || 'USB-' + letra) + '-' + stamp;
    const dst = PORTATIL ? carpetaDatos('Rescate', nombre) : path.join(app.getPath('documents'), 'Capri-rescate', nombre);
    const r = await psx(USB_RESCUE, { CAPRI_L: letra, CAPRI_DST: dst });
    if (r.code >= 0 && fs.existsSync(dst)) shell.openPath(dst);
    return { ok: r.code >= 0 && r.code < 8, code: r.code, out: tail(r.out, 1500), dest: dst, why: r.code >= 8 ? 'parcial' : r.code < 0 ? 'error' : '' };
  }
  if (!ADMIN[a.type]) return { ok: false, why: 'nada' };
  const FS = { exfat: 'exFAT', fat32: 'FAT32', ntfs: 'NTFS' }[String(a.fs || 'exfat').toLowerCase()];
  if (!FS) return { ok: false, why: 'fs' };
  if (FS === 'FAT32' && (a.type === 'formatear' || a.type === 'reconstruir') && d.tam > 32 * 1024 ** 3) return { ok: false, why: 'fat32-grande' };
  const LBL = String(a.etiqueta || 'CAPRI').replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 11) || 'CAPRI';
  const r = await psAdmin(ADMIN[a.type]({ N, L: letra, FS, LBL }));
  return { ok: r.code === 0 || (/revisar|reparar/.test(a.type) && r.code >= 0 && r.code < 3), code: r.code, out: tail(r.out), why: r.why || (r.code ? 'error' : '') };
});

ipcMain.handle('cursor', () => {
  if (!win) return null;
  const p = screen.getCursorScreenPoint(), b = win.getBounds();
  return { x: p.x - b.x, y: p.y - b.y };
});
// qué tarjeta usa Capri para dibujar (para la prueba de velocidad)
ipcMain.handle('gpu:info', async () => {
  try {
    const i = await app.getGPUInfo('basic');
    return { devs: (i.gpuDevice || []).map((d) => ({ active: !!d.active, vendor: d.vendorId, device: d.deviceId })), st: app.getGPUFeatureStatus() };
  } catch { return null; }
});
// Turbo de Ollama (solo con tu permiso, desde Ajustes): flash attention y caché de contexto a 8 bits ocupan la mitad de
// memoria de video, así el modelo cabe entero en tu GTX 1650 y no se pasa al procesador. Se guarda para tu usuario y reinicia Ollama.
const run1 = (cmd, args) => new Promise((r) => execFile(cmd, args, { windowsHide: true }, (e) => r(!e)));
ipcMain.handle('ollama:turbo', async () => {
  if (process.platform !== 'win32') return { ok: false, why: 'no-windows' };
  const env = { OLLAMA_FLASH_ATTENTION: '1', OLLAMA_KV_CACHE_TYPE: 'q8_0' };
  let ok = true;
  for (const [k, v] of Object.entries(env)) ok = (await run1('setx', [k, v])) && ok;
  await run1('taskkill', ['/IM', 'ollama app.exe', '/F']);
  await run1('taskkill', ['/IM', 'ollama.exe', '/F']);
  const appExe = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama app.exe');
  const opts = { detached: true, stdio: 'ignore', windowsHide: true, env: { ...process.env, ...env } };
  try {
    if (fs.existsSync(appExe)) spawn(appExe, [], opts).unref();
    else spawn('ollama', ['serve'], opts).unref();
  } catch (e) { return { ok: false, why: 'no-ollama', msg: e.message }; }
  return { ok };
});
// R.I.P: bajar una fuente oficial o consultar una etiqueta de medicamento sin el bloqueo CORS del navegador.
// Solo sitios de gobierno de México (*.gob.mx), openFDA, MedlinePlus y PubMed; nada más.
const RIP_OK = /(^|\.)gob\.mx$|^api\.fda\.gov$|^medlineplus\.gov$|^(eutils\.)?ncbi\.nlm\.nih\.gov$|^wsearch\.nlm\.nih\.gov$/i;
ipcMain.handle('rip:bajar', async (_e, url) => {
  let u; try { u = new URL(String(url)); } catch { return { ok: false, why: 'url' }; }
  if (!/^https?:$/.test(u.protocol) || !RIP_OK.test(u.hostname)) return { ok: false, why: 'sitio' };
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(60000), redirect: 'follow' });
    if (!RIP_OK.test(new URL(r.url).hostname)) return { ok: false, why: 'sitio' };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 80 * 1024 * 1024) return { ok: false, why: 'grande' };
    return { ok: r.ok, status: r.status, type: r.headers.get('content-type') || '', data: buf };
  } catch (e) { return { ok: false, why: 'red', msg: e.message }; }
});
// respaldo automático del expediente (ya viene cifrado): Documentos\Capri\Respaldos, se quedan los 30 más nuevos
ipcMain.handle('respaldo:guardar', async (_e, nombre, texto) => {
  try {
    const dir = carpetaDatos('Respaldos');
    fs.mkdirSync(dir, { recursive: true });
    const n = String(nombre || 'expediente.capriexp').replace(/[^\w.-]/g, '_');
    if (!/\.capriexp$/.test(n)) return { ok: false, why: 'nombre' };
    fs.writeFileSync(path.join(dir, n), String(texto));
    const viejos = fs.readdirSync(dir).filter((f) => f.endsWith('.capriexp')).sort().reverse().slice(30);
    for (const f of viejos) fs.unlinkSync(path.join(dir, f));
    return { ok: true, dir };
  } catch (e) { return { ok: false, why: 'error', msg: e.message }; }
});
ipcMain.handle('respaldo:abrir', () => { const dir = carpetaDatos('Respaldos'); fs.mkdirSync(dir, { recursive: true }); shell.openPath(dir); return true; });
ipcMain.on('claude:open', openClaude);
ipcMain.handle('capri:portatil', () => ({ portatil: PORTATIL, dir: PORTATIL ? DATA_USB : DATA_PC }));
ipcMain.on('retry', () => { if (win) { offline = false; ready = false; win.loadURL(deskURL()); } });

app.whenReady().then(async () => {
  // que al prender la PC se abra esta versión y no una vieja
  if (process.platform === 'win32' && EXE !== process.execPath && app.getLoginItemSettings().openAtLogin) {
    app.setLoginItemSettings({ openAtLogin: false }); app.setLoginItemSettings({ openAtLogin: true, path: EXE }); }
  if (PRUEBA_REC) safeStorage.setUsePlainTextEncryption?.(true);
  const ses = sesionCapri();
  // micrófono, notificaciones, pantalla completa y ubicación (módulo Mundo) sí; lo demás no
  const ok = ['media', 'notifications', 'fullscreen', 'clipboard-sanitized-write', 'display-capture', 'geolocation'];
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(ok.includes(perm)));
  ses.setPermissionCheckHandler((wc, perm) => ok.includes(perm));
  // botón MIRAR: comparte la pantalla principal
  ses.setDisplayMediaRequestHandler((req, cb) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((s) => cb(s[0] ? { video: s[0] } : {})).catch(() => cb({}));
  });
  // la ventana de claude.ai: puede pedir notificaciones y portapapeles, nada más
  const cses = session.fromPartition(BOVEDA_ON ? 'claude-ram' : 'persist:claude');
  const cok = ['notifications', 'clipboard-sanitized-write', 'clipboard-read', 'fullscreen'];
  cses.setPermissionRequestHandler((wc, perm, cb) => cb(cok.includes(perm)));
  cses.setPermissionCheckHandler((wc, perm) => cok.includes(perm));
  if (BOVEDA_ON) cses.cookies.on('changed', () => { claudeCambio = true; });
  await serveWeb();
  createWindow();
  createTray();
  watch = startWindowWatch({ win, onUpdate: (d) => { lastWins = d; send('desk:windows', d); } });
  globalShortcut.register('Control+Alt+C', toggleStow);
});

app.on('will-quit', () => { globalShortcut.unregisterAll(); watch?.stop(); });

app.on('second-instance', (_e, _argv, _cwd, data) => {
  if (data && data.version && newer(data.version, app.getVersion())) { vaciarBoveda().then(() => { cerrando = true; app.relaunch({ execPath: data.exe, args: [] }); app.exit(0); }); return; }
  run('expand()');
});
app.on('window-all-closed', () => app.quit());
