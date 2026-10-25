// Lo único que la página de Capri puede pedirle a la app de escritorio.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('capriDesk', {
  hit: (on) => ipcRenderer.send('hit', !!on),        // ¿el ratón está encima de Capri?
  mode: (m) => ipcRenderer.send('mode', m === 'full' ? 'full' : 'desk'),
});
