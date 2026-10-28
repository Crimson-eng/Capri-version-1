// Lo único que la página de Capri puede pedirle a la app de escritorio.
const { contextBridge, ipcRenderer } = require('electron');
const on = (ch) => (fn) => { const l = (e, d) => fn(d); ipcRenderer.on(ch, l); return () => ipcRenderer.removeListener(ch, l); };
contextBridge.exposeInMainWorld('capriDesk', {
  hit: (on) => ipcRenderer.send('hit', !!on),        // ¿el ratón está encima de Capri?
  mode: (m) => ipcRenderer.send('mode', m === 'full' ? 'full' : 'desk'),
  retry: () => ipcRenderer.send('retry'),
  openClaude: () => ipcRenderer.send('claude:open'),  // tu cuenta de claude.ai en una ventana de Capri
  portatil: () => ipcRenderer.invoke('capri:portatil'),  // ¿los datos están en la USB (CapriData junto al .exe)?
  // bóveda: la página cifra; aquí solo se leen y escriben sus archivos ya cifrados (carpeta Boveda)
  boveda: {
    activa: ipcRenderer.sendSync('boveda:activa'),
    info: () => ipcRenderer.invoke('boveda:info'),
    lista: () => ipcRenderer.invoke('boveda:lista'),
    leer: (n) => ipcRenderer.invoke('boveda:leer', n),
    escribir: (n, bytes) => ipcRenderer.invoke('boveda:escribir', n, bytes),
    borrar: (n) => ipcRenderer.invoke('boveda:borrar', n),
    crearMeta: (meta, op) => ipcRenderer.invoke('boveda:meta', meta, op),
    reiniciar: () => ipcRenderer.send('boveda:reiniciar'),
    salir: () => ipcRenderer.send('boveda:salir'),
    alCerrar: (fn) => { ipcRenderer.removeAllListeners('boveda:flush'); ipcRenderer.on('boveda:flush', () => fn()); ipcRenderer.send('boveda:escucha'); },
    listo: () => ipcRenderer.send('boveda:listo'),
  },
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
