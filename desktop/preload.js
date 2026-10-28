// Lo único que la página de Capri puede pedirle a la app de escritorio.
const { contextBridge, ipcRenderer } = require('electron');
const on = (ch) => (fn) => { const l = (e, d) => fn(d); ipcRenderer.on(ch, l); return () => ipcRenderer.removeListener(ch, l); };
contextBridge.exposeInMainWorld('capriDesk', {
  hit: (on) => ipcRenderer.send('hit', !!on),        // ¿el ratón está encima de Capri?
  mode: (m) => ipcRenderer.send('mode', m === 'full' ? 'full' : 'desk'),
  retry: () => ipcRenderer.send('retry'),
  openClaude: () => ipcRenderer.send('claude:open'),  // tu cuenta de claude.ai en una ventana de Capri
  portatil: () => ipcRenderer.invoke('capri:portatil'),  // ¿los datos están en la USB (CapriData junto al .exe)?
  // Capri rondando por el escritorio
  menu: () => ipcRenderer.send('menu'),               // clic derecho sobre ella
  getCfg: () => ipcRenderer.invoke('cfg:get'),
  setCfg: (patch) => ipcRenderer.invoke('cfg:set', patch),
  cursor: () => ipcRenderer.invoke('cursor'),
  act: (a) => ipcRenderer.invoke('act', a),              // manos de Capri: abrir, escribir, mover el puntero
  tec: (a) => ipcRenderer.invoke('tec', a),              // taller técnico: revisar y reparar memorias USB
  gpuInfo: () => ipcRenderer.invoke('gpu:info'),          // qué tarjeta de video usa para dibujar
  turboOllama: () => ipcRenderer.invoke('ollama:turbo'),  // flash attention + caché a 8 bits (con tu permiso)
  ripBajar: (url) => ipcRenderer.invoke('rip:bajar', url),          // R.I.P: fuente oficial o etiqueta (solo sitios permitidos)
  guardarRespaldo: (n, t) => ipcRenderer.invoke('respaldo:guardar', n, t), // respaldo cifrado del expediente
  abrirRespaldos: () => ipcRenderer.invoke('respaldo:abrir'),
  windowsNow: () => ipcRenderer.invoke('windows:get'),
  onWindows: on('desk:windows'),                      // tus ventanas (solo Windows): dónde sentarse
  onCfg: on('desk:cfg'),
  onCmd: on('desk:cmd'),                              // teletransporte, truco, etc. desde el menú
});
