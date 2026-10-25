// Capri de escritorio: una ventana transparente, encima de todo, del tamaño de la pantalla.
// Mini Capri ronda por ella; donde no está Capri, los clics pasan a tus otras ventanas.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, session, desktopCapturer, shell, nativeImage } = require('electron');
const path = require('path');

const CAPRI_URL = process.env.CAPRI_URL || 'https://crimson-eng.github.io/Capri-version-1/';
let win = null, tray = null, mode = 'desk', offline = false, ready = false, readyT = null;

if (!app.requestSingleInstanceLock()) app.quit();
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

function run(js) { if (win && !offline) win.webContents.executeJavaScript(js).catch(() => {}); }

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 }));
  tray.setToolTip('Capri');
  const menu = () => Menu.buildFromTemplate([
    { label: 'Abrir Capri completa', click: () => run('expand()') },
    { label: 'Mini Capri', click: () => run('minimize()') },
    { type: 'separator' },
    { label: 'Iniciar con Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: (it) => app.setLoginItemSettings({ openAtLogin: it.checked }) },
    { label: 'Recargar', click: () => { if (win) { offline = false; ready = false; win.loadURL(deskURL()); } } },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu());
  tray.on('click', () => run(mode === 'full' ? 'minimize()' : 'expand()'));
}

ipcMain.on('hit', (e, on) => { if (win && mode === 'desk') win.setIgnoreMouseEvents(!on, { forward: true }); });
ipcMain.on('mode', (e, m) => {
  setMode(m);
  if (win && !ready) { ready = true; clearTimeout(readyT); win.showInactive(); }
});
ipcMain.on('retry', () => { if (win) { offline = false; ready = false; win.loadURL(deskURL()); } });

app.whenReady().then(() => {
  const ses = session.defaultSession;
  // micrófono, notificaciones y pantalla completa sí; lo demás no
  const ok = ['media', 'notifications', 'fullscreen', 'clipboard-sanitized-write', 'display-capture'];
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(ok.includes(perm)));
  ses.setPermissionCheckHandler((wc, perm) => ok.includes(perm));
  // botón MIRAR: comparte la pantalla principal
  ses.setDisplayMediaRequestHandler((req, cb) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((s) => cb(s[0] ? { video: s[0] } : {})).catch(() => cb({}));
  });
  createWindow();
  createTray();
});

app.on('second-instance', () => run('expand()'));
app.on('window-all-closed', () => app.quit());
