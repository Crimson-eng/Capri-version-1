// Lo único que la página de Capri puede pedirle a la app de escritorio.
const { contextBridge, ipcRenderer } = require('electron');
const on = (ch) => (fn) => { const l = (e, d) => fn(d); ipcRenderer.on(ch, l); return () => ipcRenderer.removeListener(ch, l); };
contextBridge.exposeInMainWorld('capriDesk', {
  hit: (on) => ipcRenderer.send('hit', !!on),        // ¿el ratón está encima de Capri?
  mode: (m) => ipcRenderer.send('mode', m === 'full' ? 'full' : 'desk'),
  retry: () => ipcRenderer.send('retry'),
  // Capri rondando por el escritorio
  menu: () => ipcRenderer.send('menu'),               // clic derecho sobre ella
  getCfg: () => ipcRenderer.invoke('cfg:get'),
  setCfg: (patch) => ipcRenderer.invoke('cfg:set', patch),
  cursor: () => ipcRenderer.invoke('cursor'),
  windowsNow: () => ipcRenderer.invoke('windows:get'),
  onWindows: on('desk:windows'),                      // tus ventanas (solo Windows): dónde sentarse
  onCfg: on('desk:cfg'),
  onCmd: on('desk:cmd'),                              // teletransporte, truco, etc. desde el menú
});
