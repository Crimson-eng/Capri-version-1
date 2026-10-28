// ================= BÓVEDA (cifrado de todos los datos, app de escritorio) =================
// Con la bóveda activa, Capri corre en una sesión que vive SOLO en la memoria RAM: sus bases (pláticas, hilos, apuntes,
// biblioteca, lecciones, expediente…) y sus ajustes (keys de Gemini y Claude) nunca se escriben en claro al disco.
// Al abrir, boveda.html te pide la llave, descifra los archivos de la carpeta Boveda (junto al .exe en modo USB) y los
// carga en la memoria; mientras usas a Capri, lo que cambie se vuelve a guardar cifrado cada minuto y al cerrar.
// Cifrado: AES-256-GCM con una llave maestra al azar; esa llave se guarda envuelta dos veces: con tu llave (PBKDF2-SHA256,
// 310 000 vueltas) y con tu código de recuperación. Cada archivo va comprimido y cifrado por separado.
// Este archivo carga antes que todo lo demás para notar cada cambio. En el navegador (PWA) no hace nada.
(()=>{
const D=window.capriDesk?.boveda;if(!D)return;
const te=new TextEncoder(),td=new TextDecoder(),ITER=310000,PARTE=24e6;
const b64=u=>{u=u instanceof Uint8Array?u:new Uint8Array(u);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);};
const deb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
// ---------- llaves ----------
async function derivar(pass,salt){const k=await crypto.subtle.importKey('raw',te.encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function sellar(key,bytes){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes));
  const out=new Uint8Array(12+ct.length);out.set(iv);out.set(ct,12);return out;}
async function abrir(key,buf){buf=new Uint8Array(buf);return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:buf.slice(0,12)},key,buf.slice(12)));}
const maestra=raw=>crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
const normCodigo=c=>String(c||'').toUpperCase().replace(/[^A-Z2-9]/g,'');
function nuevoCodigo(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(24));return [...r].map(x=>A[x%32]).join('').match(/.{4}/g).join('-');}
async function crearMeta(llave,codigo,raw){const s1=crypto.getRandomValues(new Uint8Array(16)),s2=crypto.getRandomValues(new Uint8Array(16));
  return {v:1,iter:ITER,salt:b64(s1),salt2:b64(s2),wrapL:b64(await sellar(await derivar(llave,s1),raw)),wrapR:b64(await sellar(await derivar(normCodigo(codigo),s2),raw)),creado:Date.now()};}
// devuelve la llave maestra (32 bytes); si la llave o el código no son, WebCrypto truena (OperationError)
const desbloquear=async(meta,llave,esCodigo)=>esCodigo?abrir(await derivar(normCodigo(llave),deb64(meta.salt2)),deb64(meta.wrapR)):abrir(await derivar(llave,deb64(meta.salt)),deb64(meta.wrapL));
// ---------- empacar valores (lo que guarda IndexedDB no siempre es JSON: audios en Blob, Float32Array, fechas) ----------
async function empaca(v){if(v===null||typeof v!=='object')return v;if(v instanceof Date)return {__b:'d',v:v.getTime()};
  if(v instanceof Blob)return {__b:'b',type:v.type,name:v instanceof File?v.name:null,lm:v.lastModified||0,d:b64(await v.arrayBuffer())};
  if(ArrayBuffer.isView(v))return {__b:'t',c:v.constructor.name,d:b64(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))};
  if(v instanceof ArrayBuffer)return {__b:'a',d:b64(v)};if(Array.isArray(v))return Promise.all(v.map(empaca));
  const o={};for(const k of Object.keys(v))o[k]=await empaca(v[k]);return o;}
function desempaca(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(desempaca);
  if(v.__b==='d')return new Date(v.v);if(v.__b==='a')return deb64(v.d).buffer;
  if(v.__b==='b'){const u=deb64(v.d);return v.name!=null?new File([u],v.name,{type:v.type,lastModified:v.lm}):new Blob([u],{type:v.type});}
  if(v.__b==='t'){const u=deb64(v.d),C=self[v.c]||Uint8Array;return new C(u.buffer,0,u.byteLength/(C.BYTES_PER_ELEMENT||1));}
  const o={};for(const k of Object.keys(v))o[k]=desempaca(v[k]);return o;}
async function gz(bytes,des){const s=new Blob([bytes]).stream().pipeThrough(des?new DecompressionStream('gzip'):new CompressionStream('gzip'));return new Uint8Array(await new Response(s).arrayBuffer());}
const cifraJSON=async(key,obj)=>sellar(key,await gz(te.encode(JSON.stringify(obj))));
const descifraJSON=async(key,buf)=>JSON.parse(td.decode(await gz(await abrir(key,buf),true)));
// ---------- leer y escribir IndexedDB completas ----------
let cargando=false;
const abrirDB=(n,v,up)=>new Promise((res,rej)=>{const r=v?indexedDB.open(n,v):indexedDB.open(n);if(up)r.onupgradeneeded=()=>up(r.result);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
async function volcarStore(db,s){const recs=[],st0=db.transaction(s,'readonly').objectStore(s);
  const meta={name:s,keyPath:st0.keyPath,autoIncrement:st0.autoIncrement,indexes:[...st0.indexNames].map(i=>{const x=st0.index(i);return {name:i,keyPath:x.keyPath,unique:x.unique,multiEntry:x.multiEntry};})};
  await new Promise((res,rej)=>{const c=st0.openCursor();c.onsuccess=()=>{const k=c.result;if(!k)return res();recs.push([k.primaryKey,k.value]);k.continue();};c.onerror=()=>rej(c.error);});
  for(const r of recs){r[0]=await empaca(r[0]);r[1]=await empaca(r[1]);}   // fuera de la transacción: leer un Blob es asíncrono
  return {meta,recs};}
async function cargarDB(name,version,stores){cargando=true;
  try{const db=await abrirDB(name,version,d=>{for(const {meta:m} of stores){if(d.objectStoreNames.contains(m.name))continue;
        const st=d.createObjectStore(m.name,{keyPath:m.keyPath??undefined,autoIncrement:!!m.autoIncrement});for(const i of m.indexes)st.createIndex(i.name,i.keyPath,{unique:i.unique,multiEntry:i.multiEntry});}});
    for(const {meta:m,recs} of stores){if(!recs.length||!db.objectStoreNames.contains(m.name))continue;await new Promise((res,rej)=>{const t=db.transaction(m.name,'readwrite'),st=t.objectStore(m.name);
        for(const [k,v] of recs){const val=desempaca(v);if(m.keyPath==null)st.put(val,desempaca(k));else st.put(val);}t.oncomplete=res;t.onerror=()=>rej(t.error);});}
    db.close();}
  finally{cargando=false;}}
// ---------- qué cambió desde el último guardado ----------
// se marca cuando la escritura YA terminó (complete): así un guardado a medio camino no se come un cambio
const sucio=new Set(),borradas=new Set();let lsSucio=false;
const _tx=IDBDatabase.prototype.transaction;
IDBDatabase.prototype.transaction=function(names,mode,...r){const t=_tx.call(this,names,mode,...r);
  if(mode==='readwrite'&&!cargando){const db=this.name,ns=typeof names==='string'?[names]:[...names];t.addEventListener('complete',()=>{for(const n of ns)sucio.add(db+'\u0000'+n);});}return t;};
const _open=IDBFactory.prototype.open;
IDBFactory.prototype.open=function(name,...r){const q=_open.call(this,name,...r);if(!cargando)q.addEventListener('upgradeneeded',()=>{borradas.delete(name);sucio.add(name+'\u0000');});return q;};
const _del=IDBFactory.prototype.deleteDatabase;
IDBFactory.prototype.deleteDatabase=function(name){borradas.add(name);return _del.call(this,name);};
for(const f of ['setItem','removeItem','clear']){const o=Storage.prototype[f];Storage.prototype[f]=function(...a){if(this===window.localStorage&&!cargando)lsSucio=true;return o.apply(this,a);};}
// nombres de archivo: idb~<base>.enc = qué stores tiene; idb~<base>~<store>.enc (+ #2, #3… si es muy grande) = sus datos
const enc=encodeURIComponent,archivo=(db,s,p)=>'idb~'+enc(db)+(s!=null?'~'+enc(s):'')+(p>1?'#'+p:'')+'.enc';
// guarda en la bóveda lo que cambió (o todo, si todo=true)
let guardando=null,key=null,ultimo=0;
async function escribeStore(name,db,s){const {meta,recs}=await volcarStore(db,s);const partes=[];let cur=[],tam=0;
  for(const r of recs){const n=JSON.stringify(r).length;if(cur.length&&tam+n>PARTE){partes.push(cur);cur=[];tam=0;}cur.push(r);tam+=n;}partes.push(cur);
  for(let i=0;i<partes.length;i++)await D.escribir(archivo(name,s,i+1),await cifraJSON(key,i?{parte:i+1,recs:partes[i]}:{meta,partes:partes.length,recs:partes[0]}));
  const pre=archivo(name,s).replace(/\.enc$/,'#');for(const f of await D.lista())if(f.startsWith(pre)&&+f.slice(pre.length,-4)>partes.length)await D.borrar(f);}
async function guardar(todo){if(!key)return 0;if(guardando)return guardando.then(()=>guardar(todo));
  return guardando=(async()=>{let n=0;
    try{const dbs=await indexedDB.databases(),porDB={};
      for(const name of [...borradas]){if(dbs.some(d=>d.name===name))continue;const pre='idb~'+enc(name);
        for(const f of await D.lista())if(f===pre+'.enc'||f.startsWith(pre+'~'))await D.borrar(f);borradas.delete(name);}
      const pend=[...sucio];sucio.clear();for(const x of pend){const [d,s]=x.split('\u0000');(porDB[d]=porDB[d]||new Set()).add(s);}
      if(todo)for(const {name} of dbs)porDB[name]=new Set(['']);
      for(const [name,ss] of Object.entries(porDB)){if(!dbs.some(d=>d.name===name))continue;const db=await abrirDB(name);
        try{const todas=[...db.objectStoreNames],cuales=ss.has('')?todas:[...ss].filter(s=>todas.includes(s));
          await D.escribir(archivo(name),await cifraJSON(key,{name,version:db.version,stores:todas}));
          for(const s of cuales){await escribeStore(name,db,s);n++;}}
        catch(e){for(const s of ss)sucio.add(name+'\u0000'+s);throw e;}   // se reintenta en el siguiente guardado
        finally{db.close();}}
      if(lsSucio||todo){lsSucio=false;const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k);}await D.escribir('ls.enc',await cifraJSON(key,o));n++;}
      ultimo=Date.now();}
    catch(e){console.error('bóveda: no pude guardar',e);window.log?.('🔐 bóveda: no pude guardar ('+String(e.message||e).slice(0,60)+')','w');}
    finally{guardando=null;}return n;})();}
// ---------- abrir la bóveda (lo usa boveda.html) ----------
// devuelve la lista de lo que no se pudo descifrar (archivo dañado o a medias); lo demás se carga igual
async function cargarTodo(k,av=()=>{}){const fs=(await D.lista()).filter(f=>f.endsWith('.enc'));let i=0;const malos=[];
  for(const f of fs.filter(f=>/^idb~[^~#]+\.enc$/.test(f))){let m;try{m=await descifraJSON(k,await D.leer(f));}catch(e){malos.push(f);continue;}const stores=[];
    for(const s of m.stores){av(`Descifrando ${m.name} · ${s} (${++i})…`);if(!fs.includes(archivo(m.name,s)))continue;
      try{const p1=await descifraJSON(k,await D.leer(archivo(m.name,s)));
        for(let p=2;p<=(p1.partes||1);p++)p1.recs.push(...(await descifraJSON(k,await D.leer(archivo(m.name,s,p)))).recs);
        stores.push(p1);}
      catch(e){malos.push(m.name+' · '+s);}}
    await cargarDB(m.name,m.version,stores);}
  if(fs.includes('ls.enc')){av('Descifrando tus ajustes…');
    try{const o=await descifraJSON(k,await D.leer('ls.enc'));cargando=true;try{for(const [a,b] of Object.entries(o))localStorage.setItem(a,b);}finally{cargando=false;}}
    catch(e){malos.push('ajustes');}}
  return malos;}
const envolver=async(meta,raw,llave)=>{const s1=crypto.getRandomValues(new Uint8Array(16));meta.salt=b64(s1);meta.wrapL=b64(await sellar(await derivar(llave,s1),raw));await D.crearMeta(meta);};
window.Boveda={nuevoCodigo,crearMeta,desbloquear,maestra,cargarTodo,b64,
  guardar:()=>guardar(false),guardarTodo:()=>guardar(true),
  info:()=>D.info(),activa:()=>!!key,ultimo:()=>ultimo,
  // primera vez: llave maestra nueva, se guarda TODO lo que hay ahora y Capri se reinicia ya cifrada
  async activar(llave,codigo,op={},av=()=>{}){const raw=crypto.getRandomValues(new Uint8Array(32));
    for(const f of await D.lista())await D.borrar(f);   // restos de una bóveda anterior (con otra llave) estorbarían
    key=await maestra(raw);av('Cifrando todo…');
    const n=await guardar(true);await D.crearMeta(await crearMeta(llave,codigo,raw),{borrarPC:!!op.borrarPC});av('Listo ('+n+' partes cifradas). Reiniciando…');
    setTimeout(()=>D.reiniciar(),900);return n;},
  async cambiarLlave(actual,nueva){const meta=(await D.info()).meta;await envolver(meta,await desbloquear(meta,actual,false),nueva);},
  // entraste con el código de recuperación: pones una llave nueva sin saber la vieja
  async ponerLlave(raw,nueva){const meta=(await D.info()).meta;await envolver(meta,raw,nueva);},
  async nuevoCodigoRec(actual){const meta=(await D.info()).meta;const raw=await desbloquear(meta,actual,false),c=nuevoCodigo(),s2=crypto.getRandomValues(new Uint8Array(16));
    meta.salt2=b64(s2);meta.wrapR=b64(await sellar(await derivar(normCodigo(c),s2),raw));await D.crearMeta(meta);return c;},
  // guarda y vuelve a la pantalla de la llave (la memoria se borra al reiniciar)
  async bloquear(){await guardar(false);D.reiniciar();}};
// la llave maestra viaja de boveda.html a Capri en sessionStorage, que en esta sesión vive solo en la RAM
const enBoveda=/boveda\.html$/.test(location.pathname),raw0=D.activa&&!enBoveda?sessionStorage.getItem('capri_boveda_k'):null;
if(D.activa&&!enBoveda&&!raw0){location.replace('boveda.html?next='+enc(location.href));document.write('<plaintext style="display:none">');}   // sin llave no corre nada más de Capri
window.Boveda.listo=(async()=>{if(!D.activa||enBoveda||!raw0)return false;const raw=raw0;
  key=await maestra(deb64(raw));
  setInterval(()=>guardar(false),60e3);
  D.alCerrar(async()=>{await guardar(false);D.listo();});
  addEventListener('pagehide',()=>{guardar(false);});
  return true;})();
// ---------- en Ajustes (solo en la app de escritorio) ----------
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hace=ts=>{if(!ts)return 'aún no';const m=Math.round((Date.now()-ts)/60e3);return m<1?'hace segundos':m<60?`hace ${m} min`:`hace ${Math.round(m/60)} h`;};
function ajustes(){const ref=document.getElementById('cClose')?.parentElement;if(!ref||enBoveda)return;
  const box=document.createElement('div');box.id='bvBox';ref.before(box);const $b=id=>document.getElementById(id);
  const inp=(id,ph)=>`<input id="${id}" type="password" autocomplete="new-password" placeholder="${ph}" style="width:100%;margin:4px 0">`;
  async function pinta(){const inf=await D.info().catch(()=>({}));
    if(!inf.activa){box.innerHTML=`<h3>🔐 Bóveda: cifrar mis datos</h3>
      <small>Cifra con tu llave TODO lo de Capri: pláticas e hilos, apuntes, biblioteca, reservorio médico, expediente, lecciones y tus keys. Al abrir Capri te pide la llave; mientras la usas todo vive en la memoria y se guarda cifrado (AES-256) cada minuto y al cerrarla, así que en el disco o la USB no queda nada legible.</small>
      ${inp('bvL1','Tu llave (mínimo 8 caracteres; mejor una frase)')}${inp('bvL2','Repite la llave')}
      ${inf.portatil?'<div style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="bvPC" checked style="width:auto;margin:0;flex:none"><small style="text-align:left;margin:0">Borrar también la copia sin cifrar que quedó en esta PC de antes de pasarte a la USB</small></div>':''}
      <div class="row" style="justify-content:flex-start"><button class="btn" id="bvOn" style="width:auto;flex:1;padding:8px 10px">🔐 Cifrar mis datos</button></div><small id="bvMsg"></small>`;
      $b('bvOn').onclick=empezar;return;}
    box.innerHTML=`<h3>🔐 Bóveda activa</h3><small>Tus datos están cifrados en <b>${esc(inf.dir)}</b>. Último guardado: ${hace(ultimo)}. Se guarda sola cada minuto y al cerrar.</small>
      <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="bvSave" style="width:auto;flex:1;padding:8px 10px">💾 Guardar ahora</button><button class="btn" id="bvLock" style="width:auto;flex:1;padding:8px 10px">🔒 Bloquear</button></div>
      <details style="margin-top:6px"><summary><small>Cambiar llave o código de recuperación</small></summary>${inp('bvA','Llave actual')}${inp('bvN1','Llave nueva')}${inp('bvN2','Repite la llave nueva')}
      <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="bvCh" style="width:auto;flex:1;padding:8px 10px">Cambiar llave</button><button class="btn" id="bvCod" style="width:auto;flex:1;padding:8px 10px">Nuevo código de recuperación</button></div></details><small id="bvMsg"></small>`;
    $b('bvSave').onclick=async()=>{$b('bvMsg').textContent='guardando…';const n=await guardar(false);$b('bvMsg').textContent=`✓ guardado (${n} parte(s) cambiaron)`;};
    $b('bvLock').onclick=()=>window.Boveda.bloquear();
    $b('bvCh').onclick=async()=>{const a=$b('bvA').value,n1=$b('bvN1').value;if(n1.length<8||n1!==$b('bvN2').value)return $b('bvMsg').textContent='La llave nueva debe tener 8+ caracteres y coincidir.';
      $b('bvMsg').textContent='cambiando…';try{await window.Boveda.cambiarLlave(a,n1);$b('bvMsg').textContent='✓ Listo: desde ahora entra con la llave nueva. Tu código de recuperación sigue igual.';}catch(e){$b('bvMsg').textContent='✗ La llave actual no es correcta.';}};
    $b('bvCod').onclick=async()=>{try{const c=await window.Boveda.nuevoCodigoRec($b('bvA').value);$b('bvMsg').innerHTML='Tu código nuevo (el anterior ya no sirve). Anótalo en papel:<br><b style="font:16px var(--mono);color:var(--yel);user-select:all">'+c+'</b>';}catch(e){$b('bvMsg').textContent='✗ Escribe arriba tu llave actual correcta.';}};}
  async function empezar(){const l1=$b('bvL1').value,msg=$b('bvMsg');
    if(l1.length<8)return msg.textContent='La llave necesita al menos 8 caracteres.';if(l1!==$b('bvL2').value)return msg.textContent='Las dos llaves no coinciden.';
    const c=nuevoCodigo();
    box.querySelector('.row').innerHTML=`<div style="border:1px solid var(--yel);padding:10px;width:100%"><small>Tu <b>código de recuperación</b>. Es la única forma de entrar si olvidas tu llave: anótalo en papel y guárdalo lejos de la USB. Si pierdes la llave y el código, nadie puede recuperar tus datos.</small>
      <div style="font:18px var(--mono);color:var(--yel);margin:8px 0;user-select:all">${c}</div><div style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="bvYa" style="width:auto;margin:0;flex:none"><small style="margin:0">Ya lo anoté</small></div>
      <button class="btn" id="bvGo" style="margin-top:6px" disabled>Cifrar todo y reiniciar Capri</button></div>`;
    $b('bvYa').onchange=e=>{$b('bvGo').disabled=!e.target.checked;};
    $b('bvGo').onclick=async()=>{$b('bvGo').disabled=true;try{await window.Boveda.activar(l1,c,{borrarPC:!!$b('bvPC')?.checked},t=>msg.textContent=t);}catch(e){msg.textContent='✗ No pude cifrar: '+(e.message||e);$b('bvGo').disabled=false;}};}
  document.getElementById('bCfg')?.addEventListener('click',()=>setTimeout(pinta,80));pinta();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ajustes);else ajustes();
})();
