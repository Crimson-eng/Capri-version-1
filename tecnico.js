// ================= TALLER TÉCNICO (daemon de informática) =================
// Capri aprende informática a su manera: cada vez que resuelve algo, o Kiga le enseña un truco, lo guarda como
// «habilidad» con sus propias palabras (pasos cortos) y le va sumando lecciones de cada caso. Sube de nivel con el uso.
// Etiquetas ocultas: <<habilidad: nombre | área | paso; paso; paso>>, <<leccion: habilidad | qué pasó y qué funcionó>>.
// En Capri de escritorio (.exe, Windows) también tiene herramientas para memorias USB: escanear, probar, revisar y reparar
// con chkdsk, quitar protección contra escritura, ponerles letra, rescatar archivos, formatear, reconstruir y expulsar.
// Las pide con <<tec: acción | letra o disco | …>>; cada una te pide permiso, las que borran piden escribir la letra,
// y lo que repara o borra lo vuelve a comprobar la app y pasa por el aviso de administrador de Windows.
(()=>{
const D=window.capriDesk,PC=!!D?.tec;
const AREAS={usb:'USB y memorias',windows:'Windows',hardware:'Hardware',redes:'Redes',linux:'Linux',seguridad:'Seguridad',programas:'Programas',otra:'Otra'};
const BASE=[
 ['USB que no aparece o no se lee','usb',['Probar otro puerto (los de atrás de la PC, directo, sin hub) y otra computadora','Escanear en el taller: si sale «sin medio», el adaptador vive pero la memoria no responde (lector sin tarjeta o chip muerto)','Si aparece como dispositivo USB con error: desconectar, reiniciar y reinstalarlo desde el Administrador de dispositivos','Si el disco aparece pero sin letra: ponerle letra','Si tiene letra pero pide formatear o sale RAW: NO formatear todavía, primero rescatar']],
 ['USB protegida contra escritura','usb',['Revisar si tiene seguro físico (adaptador SD/microSD con pestañita Lock)','Hacer la prueba de escritura para confirmarlo','Quitar la protección por software: política WriteProtect de Windows y atributo de solo lectura del disco y la partición (pide administrador)','Si sigue en solo lectura: casi siempre es el chip gastado que se bloqueó solo para cuidar los datos; rescatar y reemplazarla, no tiene arreglo por software']],
 ['Sistema de archivos dañado (RAW o pide formatear)','usb',['Rescatar primero todo lo que se pueda leer','Revisar con chkdsk de solo lectura para medir el daño','Reparar con chkdsk /f /x (los pedazos rotos quedan en carpetas FOUND.000)','Si es RAW y chkdsk no puede: recuperar con PhotoRec o TestDisk y después formatear o reconstruir']],
 ['Recuperar archivos de una USB','usb',['Dejar de escribir en la USB: cada archivo nuevo puede pisar lo borrado','Si se lee: rescatar (copia todo a Documentos\\Capri-rescate; si un archivo está dañado lo salta y sigue)','Borrados o USB en RAW: PhotoRec (gratis, cgsecurity.org) busca fotos, documentos y videos por su firma; guardar lo recuperado en la PC, nunca en la misma USB','TestDisk puede devolver una partición perdida entera']],
 ['Formatear una USB de forma segura','usb',['Confirmar que es la correcta (nombre, tamaño y letra) y rescatar antes','exFAT: Windows, Mac, Linux y teles nuevas; archivos de más de 4 GB','FAT32: lo más compatible (consolas, estéreos de carro, teles viejas), hasta 32 GB en Windows y archivos de máximo 4 GB','NTFS: solo Windows o USB de instalación de Windows','Si el formateo falla o la tabla de particiones está rota: reconstruir (borra todo y crea una partición nueva)']],
 ['USB pirata con capacidad falsa','usb',['Sospechar si fue muy barata y lo que copias sale corrupto o desaparece','Probarla con H2testw (Windows) o f3 (Linux/Mac): llenan la memoria y verifican','Si es falsa: f3fix deja usable la capacidad real, pero no confiarle nada importante']],
];
const tec=Object.assign({on:false,skills:null,bita:[]},store.get('tec',{}));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
if(!tec.skills)tec.skills=BASE.map(([n,area,pasos])=>({id:uid(),n,area,pasos,notas:[],usos:0,de:'base',ts:Date.now()}));
const save=()=>store.set('tec',tec);save();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=t=>String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const gb=b=>b?(b/1024**3).toFixed(b<10*1024**3?1:0)+' GB':'0 GB';
const nivel=s=>{const u=s.usos+s.notas.length;return u>=8?'experta':u>=4?'hábil':u>=1?'practicando':'aprendiz';};
const say=(t,ms=2600)=>{if(document.body.classList.contains('desk')&&window.deskSay)deskSay(t,ms);};

// ---------- qué habilidades vienen al caso ----------
const palabras=t=>new Set(norm(t).match(/[a-zñ0-9]{4,}/g)||[]);
const usbRe=/\b(usb|pendrive|memoria|micro ?sd|tarjeta sd|\bsd\b|formatea|solo lectura|protegida|chkdsk|diskpart)/i;
function relevantes(q){if(!q)return [];const W=palabras(q),usb=usbRe.test(q);
  return tec.skills.map(s=>{const P=palabras(s.n+' '+s.pasos.join(' '));let n=0;for(const w of W)if(P.has(w))n++;if(usb&&s.area==='usb')n+=2;if(palabras(s.n).size&&[...palabras(s.n)].every(w=>W.has(w)))n+=3;return [n,s];})
    .filter(x=>x[0]>=2).sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]);}
let lastQ='';
const _respond=respond;
respond=(u,e,m)=>{if(m==='user'||m==='voice')lastQ=String(u||'').slice(0,600);return _respond(u,e,m);};

// ---------- lo que se le manda a Capri ----------
let ultimoScan=null;
function tallerBlock(n){
  const rel=relevantes(lastQ);
  let s=`\n\nTALLER TÉCNICO (aprendes informática a tu manera)
Cuando resuelvas algo técnico, ${n} te enseñe un truco o descubras qué funcionó, guárdalo como habilidad con tus palabras, en pasos cortos, al final en su propia línea: <<habilidad: nombre | área | paso; paso; paso>> (área: ${Object.keys(AREAS).join(', ')}). Si ya existe con ese nombre, la reescribes mejorada. Después de cada arreglo anota lo que aprendiste del caso: <<leccion: nombre de la habilidad | qué pasó y qué funcionó>>. Solo cosas que de verdad sirvan; nunca inventes.`;
  if(tec.on)s+=`\nTus habilidades: ${tec.skills.map(x=>x.n+' ('+nivel(x)+')').join(', ')}.`;
  if(rel.length)s+=`\nLas que vienen al caso (úsalas, a tu estilo):\n`+rel.map(x=>`- ${x.n} [${nivel(x)}]: ${x.pasos.join('; ')}`+(x.notas.length?`\n  Lecciones tuyas: ${x.notas.slice(-4).map(l=>l.t).join(' / ')}`:'')).join('\n');
  if(!tec.on)return s+`\nTu taller está apagado: si te pide arreglar algo de su PC, guíalo paso a paso y dile que si activa CIBERWARE → Taller técnico lo puedes hacer tú.`;
  if(!PC)return s+`\nTALLER ACTIVO, pero estás en el navegador: no tienes herramientas. Guía a ${n} paso a paso (Administración de discos, Explorador, etc.) y dile que en Capri de escritorio (Windows) lo haces tú.`;
  return s+`

TUS HERRAMIENTAS DEL TALLER (activas, en su PC con Windows; solo para sus propios equipos)
Al final de tu respuesta, en su propia línea, UNA a la vez:
<<tec: usb-ver>>  escanea las USB conectadas (letra, sistema de archivos, solo lectura, salud, errores). Úsala primero siempre que te hable de una USB o memoria.
<<tec: probar | E>>  prueba de lectura y escritura (escribe y borra un archivito)
<<tec: revisar | E>>  chkdsk de solo lectura
<<tec: reparar | E>>  chkdsk /f /x: repara el sistema de archivos
<<tec: desproteger | E>>  quita la protección contra escritura por software
<<tec: letra | disco 2>>  le pone letra a una USB que se ve pero no tiene letra
<<tec: rescatar | E>>  copia todo lo legible a Documentos\\Capri-rescate
<<tec: formatear | E | exFAT, FAT32 o NTFS | NOMBRE>>  BORRA TODO
<<tec: reconstruir | disco 2 | exFAT | NOMBRE>>  BORRA TODO y rehace la partición (USB en RAW, sin particiones o que no deja formatear)
<<tec: expulsar | E>>
Reglas: diagnostica antes de reparar; ofrece rescatar antes de cualquier cosa que borre; nunca el disco de Windows. ${n} aprueba cada acción con un botón (las que borran, escribiendo la letra) y Windows le pide permiso de administrador. Los resultados te llegan solos como «(Resultado del taller…)»: explícalos claro y corto, di qué significa y el siguiente paso.`+(ultimoScan?`\nÚltimo escaneo (${new Date(ultimoScan.ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}):\n${describe(ultimoScan.data)}`:'');}
const _personality=personality;
personality=(name,study)=>_personality(name,study)+tallerBlock(name);

// ---------- aprender ----------
function habilidad(arg){const [n,area,...r]=arg.split('|').map(x=>x.trim());const pasos=r.join(' | ').split(/\s*;\s*/).filter(Boolean).map(p=>p.slice(0,240)).slice(0,12);
  if(!n||!pasos.length)return;const a=AREAS[norm(area)]?norm(area):'otra';
  const old=tec.skills.find(s=>norm(s.n)===norm(n));
  if(old){Object.assign(old,{area:a,pasos,ts:Date.now()});if(old.de==='base')old.de='capri';}
  else tec.skills.push({id:uid(),n:n.slice(0,80),area:a,pasos,notas:[],usos:0,de:'capri',ts:Date.now()});
  tec.skills=tec.skills.slice(-150);save();log('taller: '+(old?'mejoró':'aprendió')+' «'+n.slice(0,40)+'»','y');line('s','🔧 Capri '+(old?'mejoró':'aprendió')+' la habilidad: '+n);render();}
function leccion(arg){const [n,...r]=arg.split('|').map(x=>x.trim());const t=r.join(' | ');if(!n||!t)return;
  let s=tec.skills.find(x=>norm(x.n)===norm(n))||relevantes(n)[0];
  if(!s){s={id:uid(),n:n.slice(0,80),area:'otra',pasos:[],notas:[],usos:0,de:'capri',ts:Date.now()};tec.skills.push(s);}
  const antes=nivel(s);s.notas.push({t:t.slice(0,300),ts:Date.now()});s.notas=s.notas.slice(-20);s.usos++;save();
  log('taller: lección en «'+s.n.slice(0,40)+'»','y');line('s','🔧 Capri anotó una lección en «'+s.n+'»'+(nivel(s)!==antes?' · ahora es '+nivel(s):''));render();}

// ---------- herramientas ----------
const ACC={
  'usb-ver':{t:'escanear las USB conectadas',lee:1},
  probar:{t:'hacer una prueba de lectura y escritura en',lee:1},
  revisar:{t:'revisar con chkdsk (solo lectura)',admin:1,lee:1},
  reparar:{t:'reparar el sistema de archivos (chkdsk /f) de',admin:1},
  desproteger:{t:'quitar la protección contra escritura de',admin:1},
  letra:{t:'ponerle letra a',admin:1,disco:1},
  rescatar:{t:'copiar todo lo legible a Documentos\\Capri-rescate desde'},
  formatear:{t:'FORMATEAR (borra todo lo que tiene)',admin:1,borra:1},
  reconstruir:{t:'RECONSTRUIR (borra todo y rehace la partición)',admin:1,borra:1,disco:1},
  expulsar:{t:'expulsar'},
};
const WHY={'no-encontre':'no encuentro esa USB (¿la desconectaste?)','no-usb':'ese disco no es una USB o es el de Windows: no lo toco','cambio':'la USB cambió desde el último escaneo; vuelve a escanear',
  letra:'esa letra no es de esa USB','sin-letra':'esa USB no tiene letra; primero hay que ponérsela',uac:'cancelaste el permiso de administrador de Windows','fat32-grande':'FAT32 no sirve para memorias de más de 32 GB en Windows; usa exFAT',
  fs:'ese sistema de archivos no lo conozco (exFAT, FAT32 o NTFS)',ocupada:'Windows no la dejó expulsar: hay algo abierto en ella','no-lista':'no pude leer la lista de discos','no-windows':'esto solo funciona en Windows',parcial:'algunos archivos no se pudieron copiar'};
async function escanear(){const r=await D.tec({type:'usb'});if(r?.ok){ultimoScan={ts:Date.now(),data:r.data};pintaUsb();}return r;}
function describe(L){if(!L)return '(sin datos)';const out=[];
  if(L.politicaWP===1)out.push('⚠ La política WriteProtect de Windows está ACTIVADA: todas las USB quedan en solo lectura.');
  for(const d of (L.discos||[]).filter(Boolean)){const v=(d.volumenes||[]).filter(Boolean);
    out.push(`Disco ${d.num} · ${d.nombre} · ${gb(d.tam)} · ${d.bus} · tabla ${d.estilo||'?'} · salud ${d.salud||'?'} / ${d.estado||'?'}`+(d.soloLectura?' · SOLO LECTURA':'')+(d.offline?' · FUERA DE LÍNEA':'')+(d.sistema?' · (disco del sistema)':'')+
      (v.length?'\n   '+v.map(x=>`${x.letra}: ${x.fs||'RAW/sin formato'} «${x.etiqueta||''}» ${gb(x.libre)} libres de ${gb(x.tam)} · ${x.salud}`+(x.soloLectura?' · partición solo lectura':'')).join('\n   '):'\n   sin letra'+(d.particiones?` (${d.particiones} partición(es), ${d.sinLetra} sin letra)`:' y sin particiones')));}
  if(!(L.discos||[]).filter(Boolean).length)out.push('Ninguna USB con memoria detectada.');
  for(const s of (L.sinMedio||[]).filter(Boolean))out.push(`Detectada pero sin memoria utilizable: ${s.nombre} (medio cargado: ${s.medio?'sí':'no'}, estado ${s.estado})`);
  for(const p of (L.problemas||[]).filter(Boolean))out.push(`Dispositivo USB con problema: ${p.nombre||'(sin nombre)'} · ${p.estado} · ${p.clase||''}`);
  return out.join('\n');}
// «E», «E:», «disco 2» o «2» → el disco y la letra del último escaneo
function blanco(arg){const L=ultimoScan?.data,ds=(L?.discos||[]).filter(Boolean);arg=String(arg||'').trim();
  const m=arg.match(/^([a-z])\s*:?\\?$/i);if(m){const l=m[1].toUpperCase();const d=ds.find(x=>(x.volumenes||[]).some(v=>v&&v.letra===l));return d?{d,letra:l}:null;}
  const n=arg.match(/(\d+)/);if(n){const d=ds.find(x=>x.num===+n[1]);return d?{d,letra:(d.volumenes||[]).find(Boolean)?.letra||''}:null;}
  return ds.length===1?{d:ds[0],letra:(ds[0].volumenes||[]).find(Boolean)?.letra||''}:null;}
async function ejecutar(acc,arg,extra={}){const A=ACC[acc];
  if(acc==='usb-ver'){const r=await escanear();bita(acc,'',r?.ok,r?.ok?'ok':WHY[r?.why]);return r?.ok?'Escaneo de USB:\n'+describe(r.data):'No pude escanear: '+(WHY[r?.why]||r?.why);}
  await escanear();const b=blanco(arg);
  if(!b)return 'No encontré «'+arg+'» entre las USB conectadas. Escanea de nuevo y dime la letra o el número de disco.';
  const {d,letra}=b,quien=letra?letra+': ('+d.nombre+', '+gb(d.tam)+')':'disco '+d.num+' ('+d.nombre+', '+gb(d.tam)+')';
  if(d.sistema)return 'Ese es el disco de Windows: no lo toco.';
  const ok=await pedir(acc,quien,d,letra,extra);if(!ok){bita(acc,quien,false,'no lo permitió');return 'Kiga no dio permiso para '+A.t+' '+quien+'.';}
  line('s','🔧 trabajando: '+A.t+' '+quien+(A.admin?' · acepta el aviso de Windows':'')+'…');setState('pensando');say('trabajando en la USB…',3000);
  const r=await D.tec({type:acc,disco:d.num,tam:d.tam,letra,fs:ok.fs,etiqueta:ok.etiqueta});
  const res=resumen(acc,r);bita(acc,quien,r?.ok,res.split('\n')[0].slice(0,140));
  line('s',(r?.ok?'🔧 listo: ':'🔧 no se pudo: ')+A.t+' '+quien);
  if(acc!=='expulsar')escanear();
  return `${A.t} ${quien} → ${r?.ok?'OK':'FALLÓ'}\n${res}`;}
function resumen(acc,r){if(!r)return 'Sin respuesta de la app de escritorio.';
  if(!r.ok&&r.why&&r.why!=='error'&&r.why!=='parcial')return WHY[r.why]||r.why;
  if(acc==='probar'){const x=r.data||{};return `lee: ${x.lee?'sí':'NO'} (${x.archivos} elementos en la raíz) · escribe: ${x.escribe?'sí':'NO'} · lo escrito se lee igual: ${x.verifica?'sí':'NO'}`+(x.escribe?` · escritura ~${x.mbps} MB/s`:'')+(x.error?`\nerror: ${x.error}`:'');}
  if(acc==='rescatar')return `copiado a ${r.dest} (código robocopy ${r.code}: ${r.code===0?'no había nada que copiar':r.code<8?'todo lo legible se copió':'algunos archivos fallaron'})\n${r.out||''}`;
  if(acc==='revisar'||acc==='reparar')return `código chkdsk ${r.code} (${{0:'sin errores',1:acc==='reparar'?'encontró errores y los reparó':'encontró errores',2:'hizo limpieza menor',3:'no pudo revisar/reparar'}[r.code]||'?'})\n${r.out||''}`;
  if(acc==='desproteger'&&r.code===4)return 'SIGUE EN SOLO LECTURA después de quitar todo por software.\n'+(r.out||'');
  return (r.out||'(sin salida)')+(r.why==='error'&&!r.out?'\nfalló sin decir por qué':'');}
function bita(acc,quien,ok,txt){tec.bita.push({ts:Date.now(),acc,quien,ok:!!ok,txt:txt||''});tec.bita=tec.bita.slice(-60);save();if(modal.classList.contains('show'))pintaBita();}

// ---------- pedir permiso (las que borran: escribir la letra o el número de disco) ----------
function pedir(acc,quien,d,letra,extra){const A=ACC[acc];
  if(document.body.classList.contains('desk'))expand();
  return new Promise(res=>{const clave=A.borra?(A.disco?String(d.num):letra):'';
    $('tcAskT').textContent=A.borra?'⚠ Esto borra todo':'🔧 Capri quiere usar el taller';
    $('tcAskX').innerHTML=`Capri quiere <b>${esc(A.t)}</b> ${esc(quien)}.`+(A.admin?'<br><small>Windows te va a pedir permiso de administrador.</small>':'')+
      (A.borra?`<br><br>Se pierde TODO lo que tiene esa memoria. Si tiene algo que te importe, primero «Rescatar».<br>Escribe <b>${esc(clave)}</b> para confirmar.`:'');
    for(const id of ['tcAskK','tcAskFsW','tcAskL'])$(id).style.display=A.borra?'':'none';$('tcAskK').value='';$('tcAskK').style.borderColor='';
    if(A.borra){const fs=String(extra.fs||'').toLowerCase();$('tcAskFs').value=['exfat','fat32','ntfs'].includes(fs)?fs:'exfat';$('tcAskL').value=String(extra.etiqueta||'').slice(0,11);}
    ask.classList.add('show');setTimeout(()=>(A.borra?$('tcAskK'):$('tcAskOk')).focus(),50);
    const fin=v=>{ask.classList.remove('show');$('tcAskOk').onclick=$('tcAskNo').onclick=null;res(v);};
    $('tcAskNo').onclick=()=>fin(null);
    $('tcAskOk').onclick=()=>{if(A.borra&&$('tcAskK').value.trim().replace(/:$/,'').toUpperCase()!==clave.toUpperCase()){$('tcAskK').focus();$('tcAskK').style.borderColor='#ff4d5e';return;}
      fin({fs:$('tcAskFs').value,etiqueta:$('tcAskL').value.trim()});};});}

// ---------- leer lo que Capri escribió ----------
const TAG=/<<\s*(habilidad|lecci[oó]n|tec)\s*:([^>]*)>>/gi;
let cola=Promise.resolve(),cadena=0;
const libre=async()=>{for(let i=0;i<400&&busy;i++)await sleep(300);};
function tallerAbsorb(full){let m;TAG.lastIndex=0;const acts=[];
  while((m=TAG.exec(full))){const k=norm(m[1]),a=m[2].trim();
    if(k==='habilidad')habilidad(a);else if(k==='leccion')leccion(a);else if(tec.on)acts.push(a);}
  if(!acts.length)return;
  if(!PC){line('s','(🔧 Las herramientas del taller solo funcionan en Capri de escritorio, en Windows.)');return;}
  const [acc,...r]=acts[0].split('|').map(x=>x.trim());const k=norm(acc).replace(/\s+/g,'-');
  if(!ACC[k])return;
  cola=cola.then(async()=>{const out=await ejecutar(k,r[0]||'',{fs:r[1],etiqueta:r[2]});
    if(++cadena>4)return line('s','(🔧 '+out.split('\n')[0]+')');
    await libre();respond(`(Resultado del taller · ${out})`,null,'user');}).catch(e=>line('s','(🔧 El taller falló: '+(e?.message||e)+')'));}
const _absorb=absorbMem;absorbMem=full=>{_absorb(full);tallerAbsorb(full);};

// ---------- ventana del taller ----------
const css=document.createElement('style');css.textContent=`#tcModal h2,#tcAsk h2{color:#5ef6ff;text-shadow:0 0 12px rgba(94,246,255,.4)}
#tcModal .mini,#tcAsk .mini{font:12px var(--mono);color:var(--ink);background:#000;border:1px solid #2a2733;padding:6px 9px;cursor:pointer}
#tcModal .mini:hover{border-color:#5ef6ff;color:#5ef6ff}#tcModal .mini.r:hover{border-color:#ff4d5e;color:#ff4d5e}#tcModal .mini:disabled{opacity:.35;cursor:default}
#tcModal .stat{font:12px var(--mono);color:var(--grn)}#tcModal .warn{font:12px var(--mono);color:var(--yel)}
#tcModal .card{border:1px solid #2a2733;padding:10px;display:flex;flex-direction:column;gap:6px;font:12px/1.45 var(--mono)}
#tcModal .card b{color:#5ef6ff}#tcModal .card .bad{color:#ff4d5e}#tcModal .acts{display:flex;flex-wrap:wrap;gap:5px}
#tcModal .list{max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
#tcModal .sk{border:1px solid #2a2733;padding:7px 10px;font:12px/1.45 var(--mono)}#tcModal .sk .h{display:flex;gap:8px;align-items:center;cursor:pointer}
#tcModal .sk .h .nm{flex:1;color:var(--ink)}#tcModal .sk .lv{color:#5ef6ff;font-size:11px}#tcModal .sk .ar{color:var(--mut);font-size:11px}
#tcModal .sk .h button{background:none;border:0;color:var(--mut);cursor:pointer;font:13px var(--mono)}#tcModal .sk .bd{display:none;color:var(--mut);margin-top:6px;white-space:pre-wrap}#tcModal .sk.op .bd{display:block}
#tcModal .bt{font:11px/1.5 var(--mono);color:var(--mut)}#tcModal .bt .ok{color:var(--grn)}#tcModal .bt .no{color:#ff4d5e}
#tcModal textarea{border:1px solid #2a2733;padding:10px 12px;background:#000;color:var(--grn);font:13px/1.45 var(--mono);min-height:70px;resize:vertical}
#tcAsk .panel{max-width:440px}#tcAsk .panel>div{border-color:#ff4d5e66}#tcAsk p{margin:0;font:13px/1.5 var(--sans);color:var(--ink)}#tcAsk b{color:#ff4d5e}`;document.head.appendChild(css);
const modal=document.createElement('div');modal.className='modal';modal.id='tcModal';modal.innerHTML=`<div class="panel"><div>
  <h2>🔧 Taller técnico</h2>
  <small>El daemon de informática de Capri. Aprende a su manera: guarda lo que resuelve como habilidades con sus propias palabras y les suma lecciones de cada caso. En Capri de escritorio puede revisar y reparar tus memorias USB, siempre pidiéndote permiso.</small>
  <label class="ck"><input type="checkbox" id="tcOn"> Activar el taller (Capri puede usar sus herramientas; te pide permiso antes de cada acción)</label>
  <div class="stat" id="tcStat"></div>
  <h3>Memorias USB conectadas</h3>
  <div class="row" style="justify-content:flex-start"><button class="mini" id="tcScan">⟳ Escanear</button><button class="mini" id="tcAsk2">🧠 Que Capri las diagnostique</button></div>
  <div class="list" id="tcUsb" style="max-height:none"></div>
  <h3>Habilidades de Capri</h3>
  <label>Ver<select id="tcArea"><option value="">Todas</option>${Object.entries(AREAS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
  <div class="list" id="tcSkills"></div>
  <h3>Enseñarle algo</h3>
  <div class="row" style="justify-content:flex-start"><input id="tcNn" placeholder="Nombre (ej. «Arreglar el wifi de mi lap»)" style="flex:1;min-width:160px"><select id="tcNa" style="flex:0 0 auto">${Object.entries(AREAS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
  <textarea id="tcNp" placeholder="Un paso por línea"></textarea>
  <div class="row" style="justify-content:flex-start"><span style="flex:1"></span><button class="mini" id="tcNs">+ Enseñar</button></div>
  <h3>Bitácora</h3>
  <div class="list bt" id="tcBita"></div>
  <div class="row" style="justify-content:flex-start"><button class="mini" id="tcExp">⬇ Exportar habilidades</button><button class="mini" id="tcImp">⬆ Importar</button><input type="file" id="tcFile" accept=".json,application/json" style="display:none"></div>
  <div class="row"><button class="btn" id="tcClose">Listo</button></div>
</div></div>`;document.body.appendChild(modal);
const ask=document.createElement('div');ask.className='modal';ask.id='tcAsk';ask.style.zIndex=90;ask.innerHTML=`<div class="panel"><div>
  <h2 id="tcAskT"></h2><p id="tcAskX"></p>
  <input id="tcAskK" placeholder="Escribe aquí para confirmar" autocomplete="off">
  <label id="tcAskFsW">Sistema de archivos<select id="tcAskFs"><option value="exfat">exFAT (recomendado)</option><option value="fat32">FAT32 (hasta 32 GB)</option><option value="ntfs">NTFS (solo Windows)</option></select></label>
  <input id="tcAskL" placeholder="Nombre de la USB (opcional)" maxlength="11">
  <div class="row"><button class="mini" id="tcAskNo">No</button><button class="btn" id="tcAskOk">Permitir</button></div>
</div></div>`;document.body.appendChild(ask);
ask.addEventListener('click',e=>{if(e.target===ask)$('tcAskNo').click();});
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});

function pintaUsb(){if(!modal.classList.contains('show'))return;const el=$('tcUsb');
  if(!PC){el.innerHTML='<small>Las herramientas funcionan en Capri de escritorio (.exe) en Windows. Aquí Capri te guía paso a paso.</small>';return;}
  const L=ultimoScan?.data;if(!L){el.innerHTML='<small>Conecta tu USB y dale a «Escanear».</small>';return;}
  const ds=(L.discos||[]).filter(Boolean);
  el.innerHTML=(L.politicaWP===1?'<div class="warn">⚠ La política WriteProtect de Windows está activada: todas las USB salen en solo lectura. «Quitar protección» la apaga.</div>':'')+
    ds.map(d=>{const v=(d.volumenes||[]).filter(Boolean),l=v[0]?.letra||'',raw=v.some(x=>!x.fs||/raw/i.test(x.fs));
      const B=(acc,t,cls,dis)=>`<button class="mini${cls?' '+cls:''}" data-acc="${acc}" data-d="${d.num}" data-l="${l}"${dis?' disabled':''}>${t}</button>`;
      return `<div class="card"><div><b>${esc(d.nombre)}</b> · ${gb(d.tam)} · disco ${d.num}${d.sistema?' · <span class="bad">disco del sistema</span>':''}</div>
        <div>${v.length?v.map(x=>`${x.letra}: ${esc(x.fs||'RAW')} «${esc(x.etiqueta)}» · ${gb(x.libre)} libres`).join(' · '):'<span class="bad">sin letra</span>'}
        ${d.soloLectura||v.some(x=>x.soloLectura)?' · <span class="bad">solo lectura</span>':''}${d.offline?' · <span class="bad">fuera de línea</span>':''}${raw?' · <span class="bad">sistema de archivos dañado o sin formato</span>':''}${d.salud&&d.salud!=='Healthy'?' · <span class="bad">salud: '+esc(d.salud)+'</span>':''}</div>
        <div class="acts">${d.sistema?'':[B('probar','Probar','',!l),B('revisar','Revisar','',!l),B('reparar','Reparar','',!l),B('desproteger','Quitar protección'),d.sinLetra||!v.length?B('letra','Ponerle letra'):'',B('rescatar','Rescatar archivos','',!l),B('formatear','Formatear','r',!l),B('reconstruir','Reconstruir','r'),B('expulsar','Expulsar','',!l)].join('')}</div></div>`;}).join('')+
    (!ds.length?'<small>No veo ninguna USB con memoria.</small>':'')+
    (L.sinMedio||[]).filter(Boolean).map(s=>`<div class="warn">Detectada sin memoria utilizable: ${esc(s.nombre)} (¿lector sin tarjeta o chip dañado?)</div>`).join('')+
    (L.problemas||[]).filter(Boolean).map(p=>`<div class="warn">Dispositivo USB con problema: ${esc(p.nombre||'sin nombre')} · ${esc(p.estado)}</div>`).join('');}
function render(){if(!modal.classList.contains('show'))return;$('tcOn').checked=tec.on;
  const cap=tec.skills.filter(s=>s.de!=='base').length;
  $('tcStat').textContent=`${tec.skills.length} habilidad(es) · ${cap} aprendidas o mejoradas por ella · ${tec.skills.reduce((n,s)=>n+s.notas.length,0)} lección(es)`+(PC?' · herramientas de Windows listas':' · en el navegador: solo guía');
  const ar=$('tcArea').value;
  $('tcSkills').innerHTML=tec.skills.map((s,i)=>[s,i]).filter(([s])=>!ar||s.area===ar).reverse().map(([s,i])=>`<div class="sk" data-i="${i}"><div class="h"><span class="nm">${esc(s.n)}</span><span class="ar">${esc(AREAS[s.area]||s.area)}</span><span class="lv">${nivel(s)}</span><button data-del="${i}" title="Olvidar">✕</button></div>
    <div class="bd">${s.pasos.map((p,j)=>(j+1)+'. '+esc(p)).join('\n')}${s.notas.length?'\n\nLecciones:\n'+s.notas.slice().reverse().map(l=>'· '+new Date(l.ts).toLocaleDateString('es-MX',{day:'numeric',month:'short'})+': '+esc(l.t)).join('\n'):''}\n\n<small>${s.de==='base'?'De fábrica':s.de==='kiga'?'Se la enseñaste tú':'La aprendió ella'}</small></div></div>`).join('')||'<small>Nada en esta área todavía.</small>';
  pintaUsb();pintaBita();}
function pintaBita(){$('tcBita').innerHTML=tec.bita.slice(-20).reverse().map(b=>`<div><span class="${b.ok?'ok':'no'}">${b.ok?'✔':'✖'}</span> ${new Date(b.ts).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · ${esc(b.acc)} ${esc(b.quien)} ${b.txt?'· '+esc(b.txt):''}</div>`).join('')||'<small>Vacía.</small>';}
modal.addEventListener('click',async e=>{const b=e.target.closest('button');
  if(!b){const h=e.target.closest('.sk .h');if(h)h.parentElement.classList.toggle('op');return;}
  if(b.dataset.del!==undefined){const s=tec.skills[+b.dataset.del];if(s&&confirm('¿Que Capri olvide «'+s.n+'»?')){tec.skills.splice(+b.dataset.del,1);save();render();}return;}
  if(b.dataset.acc){const acc=b.dataset.acc;b.disabled=true;
    cola=cola.then(async()=>{const out=await ejecutar(acc,b.dataset.l||'disco '+b.dataset.d);line('s','🔧 '+out.split('\n').slice(0,4).join('\n'));render();}).catch(()=>{});}});
$('tcOn').onchange=()=>{tec.on=$('tcOn').checked;save();pinta();render();
  line('s',tec.on?'(🔧 Taller técnico activo: Capri puede revisar y reparar tus USB'+(PC?'':' (en el navegador solo te guía)')+'. Te pide permiso antes de cada acción.)':'(🔧 Taller técnico apagado. Capri sigue aprendiendo y guiándote, pero ya no toca nada.)');};
$('tcScan').onclick=async()=>{if(!PC)return;$('tcUsb').innerHTML='<small>Escaneando…</small>';const r=await escanear();if(!r?.ok)$('tcUsb').innerHTML='<small>No pude escanear: '+esc(WHY[r?.why]||r?.why||'?')+'</small>';};
$('tcAsk2').onclick=async()=>{if(busy)return;if(!cfg.key||!cfg.model){openCfg();return;}modal.classList.remove('show');cadena=0;
  if(PC){const r=await escanear();line('u','🔧 diagnostica mis USB');respond(`(Resultado del taller · ${r?.ok?'Escaneo de USB:\n'+describe(r.data):'No pude escanear'}\nDiagnostica qué tiene cada una, en corto, y propón el siguiente paso.)`,null,'user');}
  else{line('u','🔧 ayúdame con mi USB');respond('(Kiga quiere ayuda con una memoria USB. Pregúntale qué le pasa y guíalo paso a paso.)',null,'user');}};
$('tcArea').onchange=render;
$('tcNs').onclick=()=>{const n=$('tcNn').value.trim(),pasos=$('tcNp').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!n||!pasos.length)return;
  const old=tec.skills.find(s=>norm(s.n)===norm(n));if(old)Object.assign(old,{area:$('tcNa').value,pasos,de:'kiga',ts:Date.now()});
  else tec.skills.push({id:uid(),n:n.slice(0,80),area:$('tcNa').value,pasos,notas:[],usos:0,de:'kiga',ts:Date.now()});
  $('tcNn').value=$('tcNp').value='';save();render();line('s','🔧 Le enseñaste a Capri: '+n);};
// mismo formato que podrá leer el cerebro de Python cuando exista
$('tcExp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({tipo:'capri-habilidades',version:1,fecha:new Date().toISOString(),habilidades:tec.skills},null,1)],{type:'application/json'}));
  a.download='capri-habilidades-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);};
$('tcImp').onclick=()=>$('tcFile').click();
$('tcFile').onchange=async()=>{const f=$('tcFile').files[0];$('tcFile').value='';if(!f)return;
  try{const d=JSON.parse(await f.text());if(d.tipo!=='capri-habilidades')throw 0;let n=0;
    for(const s of d.habilidades||[]){if(!s?.n||!Array.isArray(s.pasos))continue;const old=tec.skills.find(x=>norm(x.n)===norm(s.n));
      if(old){const ya=new Set(old.notas.map(l=>l.t));old.notas.push(...(s.notas||[]).filter(l=>!ya.has(l.t)));}else{tec.skills.push({notas:[],usos:0,de:'capri',...s,id:uid()});n++;}}
    save();render();line('s','(🔧 Habilidades importadas: '+n+' nuevas.)');}catch(e){line('s','(Ese archivo no son habilidades de Capri.)');}};
$('tcClose').onclick=()=>modal.classList.remove('show');
function openTaller(){modal.classList.add('show');render();if(PC&&!ultimoScan)escanear();}
window.openTaller=openTaller;
window.tallerInfo=()=>({on:tec.on,pc:PC,skills:tec.skills.length,propias:tec.skills.filter(s=>s.de!=='base').length,lecciones:tec.skills.reduce((n,s)=>n+s.notas.length,0)});

// ---------- comandos en el chat ----------
const _send=send;
send=async v=>{const t=(v||'').trim(),k=t.toLowerCase();cadena=0;
  if(/^taller$/.test(k)&&!busy){line('u',t);openTaller();return;}
  await _send(v);
  if(k==='help')line('t','  taller — Taller técnico: habilidades de informática de Capri y reparar USB');};

// botón oculto para CIBERWARE (se marca «act» con el taller activo)
const btn=document.createElement('button');btn.id='bTecnico';btn.className='btn';btn.style.display='none';btn.title='Taller técnico';btn.onclick=openTaller;
document.querySelector('.dock .tools')?.appendChild(btn);
function pinta(){btn.classList.toggle('act',tec.on);}
pinta();
})();
