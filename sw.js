// Guarda la app en el dispositivo para que abra rápido y funcione sin internet (menos el cerebro).
// Sube VERSION cada vez que cambies archivos para que los celulares descarguen lo nuevo.
const VERSION='capri-v2';
const SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  "./assets/emocionada.webp",
  "./assets/enojada.webp",
  "./assets/escuchando.webp",
  "./assets/glitch_entrada.webp",
  "./assets/glitch_fuerte.webp",
  "./assets/hipnosis.webp",
  "./assets/mirada_intensa.webp",
  "./assets/observando.webp",
  "./assets/pensando.webp",
  "./assets/presumida.webp",
  "./assets/risa_malvada.webp",
  "./assets/sonrisa_traviesa.webp",
  "./assets/sorpresa.webp",
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return; // Gemini, fuentes y librerías van directo a internet
  if(e.request.mode==='navigate'){ // la página: primero internet (para tener lo último), si no hay, la guardada
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put('./index.html',c));return r;}).catch(()=>caches.match('./index.html')));return;}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>cs.length?cs[0].focus():self.clients.openWindow('./')));});
