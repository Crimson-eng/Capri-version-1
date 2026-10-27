// ================= MANOS DE CAPRI =================
// Capri puede actuar en tu computadora cuando se lo pides: abrir programas, páginas o carpetas, escribir donde
// tengas el cursor y, para jugar, atrapar tu puntero un momento. Lo pide con etiquetas ocultas al final de su
// respuesta (<<abrir: …>>, <<escribir: …>>, <<cursor: agarrar>>). Están apagadas hasta que las activas en
// CIBERWARE, y cada acción te pide permiso salvo que elijas «Siempre». Abrir y mover el puntero solo funcionan
// en el .exe (Windows); en el navegador abre páginas y copia el texto.
// También aprende en el camino: <<aprende: nombre | cómo>> guarda lo que le enseñas (una ruta, un programa,
// un paso) y se lo recuerda en cada plática.
(()=>{
const man=Object.assign({on:false,libre:false},store.get('manos',{}));
let aprendido=store.get('aprendido',[]),abiertos=store.get('manosOk',[]);
const save=()=>{store.set('manos',man);store.set('aprendido',aprendido);store.set('manosOk',abiertos);};
const D=window.capriDesk,PC=!!D?.act;
const TAG=/<<\s*(abrir|escribir|cursor|aprende)\s*:([^>]*)>>/gi;

window.manosPrompt=()=>{const name=cfg.name||'Kiga';
  const learned=aprendido.length?'\nLo que ya aprendiste (úsalo cuando venga al caso):\n'+aprendido.map(a=>'  - '+a.n+': '+a.how).join('\n'):'';
  const base=`

APRENDER EN EL CAMINO
Cuando ${name} te enseñe cómo hacer algo (dónde guarda sus cosas, qué programa usa para qué, pasos que repite), escribe al final en su propia línea: <<aprende: nombre corto | cómo se hace>>. Ej: <<aprende: apuntes de cirugía | carpeta C:\\Users\\${name}\\Documents\\Cirugia>>. Solo cosas nuevas.${learned}`;
  if(!man.on)return base+`\n\nTUS MANOS ESTÁN APAGADAS: no puedes abrir ni escribir nada en su compu. Si te lo pide, dile que las active en CIBERWARE → Manos de Capri.`;
  return base+`

TUS MANOS (activas${PC?'':', pero ahora estás en el navegador: solo puedes abrir páginas y dejar texto copiado'})
Puedes actuar en la computadora de ${name}, solo cuando te lo pida o cuando de verdad le ayude, no por llamar la atención. Al final de tu respuesta, en su propia línea:
<<abrir: programa, página https://… o ruta de carpeta/archivo>>  (ej. <<abrir: notepad>>, <<abrir: https://www.youtube.com>>, <<abrir: spotify>>)
<<escribir: texto>>  (se escribe donde ${name} haga clic; tiene 3 segundos para elegir la ventana)${PC?`
<<cursor: agarrar>>  (de juego: atrapas su puntero un momento; con medida)`:''}
${man.libre?'Lo haces sin preguntar.':name+' te da permiso con un botón antes de cada acción.'} No puedes hacer clic, borrar, ni abrir consolas, scripts o el registro.${abiertos.length?'\nProgramas que ya abriste bien: '+abiertos.join(', ')+'.':''}`;};

// ---------- ejecutar ----------
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const say=(t,ms=2600)=>{if(document.body.classList.contains('desk')&&window.deskSay)deskSay(t,ms);};
async function abrir(t){t=t.trim();if(!t)return;
  if(!PC){if(/^https?:\/\//i.test(t)){window.open(t,'_blank','noopener');return line('s','🖐 abrí '+t);}return line('s','(Abrir programas solo se puede en Capri de escritorio, el .exe.)');}
  const ok=await D.act({type:'open',target:t});
  if(ok){line('s','🖐 abrí '+t);log('manos: abrió '+t,'g');if(!/^https?:/i.test(t)&&!abiertos.includes(t)){abiertos.push(t);abiertos=abiertos.slice(-30);save();}}
  else line('s','(No encontré «'+t+'» o no tengo permiso de abrir eso. Dime cómo se llama o dónde está y lo aprendo.)');}
async function escribir(t){if(!t.trim())return;
  if(!PC){try{await navigator.clipboard.writeText(t);line('s','🖐 te dejé el texto copiado: pégalo con Ctrl+V.');}catch(e){line('s','(No pude copiar el texto.)');}return;}
  const full=!document.body.classList.contains('desk');if(full)minimize();
  for(const n of [3,2,1]){say('Haz clic donde quieres que escriba… '+n,1100);await sleep(1000);}
  const ok=await D.act({type:'type',text:t});say(ok?'listo~':'no pude escribir ahí',1800);
  if(full)setTimeout(expand,600);line('s',ok?'🖐 escribí '+t.length+' caracteres donde hiciste clic.':'(No pude escribir.)');}
async function agarrar(){if(!PC||!document.body.classList.contains('desk'))return;
  const c=await D.cursor(),h=window.deskPetHand?.();if(!c||!h)return;const path=[];
  const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  for(let i=1;i<=24;i++){const k=ease(i/24);path.push([c.x+(h.x-c.x)*k,c.y+(h.y-c.y)*k]);}          // te lo jala hacia ella
  for(let i=0;i<14;i++)path.push([h.x+Math.sin(i*1.3)*10,h.y+Math.cos(i*1.7)*7]);                      // lo sacude
  const to={x:h.x+(Math.random()<.5?-1:1)*(220+Math.random()*160),y:Math.max(60,h.y-120-Math.random()*200)};
  for(let i=1;i<=16;i++){const k=ease(i/16);path.push([h.x+(to.x-h.x)*k,h.y+(to.y-h.y)*k-Math.sin(k*Math.PI)*60]);} // y lo avienta
  say('¡te atrapé, choom!',2000);await D.act({type:'cursor',path:path.map(([x,y])=>[Math.round(x),Math.round(y)])});}
function aprende(arg){const [n,...r]=arg.split('|').map(x=>x.trim());const how=r.join(' | ');if(!n||!how)return;
  aprendido=aprendido.filter(a=>a.n.toLowerCase()!==n.toLowerCase());aprendido.push({n:n.slice(0,80),how:how.slice(0,300),ts:Date.now()});aprendido=aprendido.slice(-60);save();
  log('aprendió: '+n.slice(0,40),'y');line('s','✦ Capri aprendió: '+n);}
const RUN={abrir,escribir,cursor:agarrar};

// pedir permiso con botones dentro de la terminal
function permiso(kind,arg){return new Promise(res=>{if(man.libre)return res(true);
  const what=kind==='abrir'?'abrir «'+arg+'»':kind==='escribir'?'escribir: «'+arg.slice(0,80)+(arg.length>80?'…':'')+'»':'atrapar tu puntero un momento';
  // en modo escritorio la terminal no se ve: ahí pregunta con una ventanita
  if(document.body.classList.contains('desk')){say('¿me dejas? '+what,3000);return setTimeout(()=>res(confirm('Capri quiere '+what+'.\n¿La dejas?')),300);}
  const d=line('s man','🖐 Capri quiere '+what+'  ');
  const b=(t,v,cls)=>{const x=document.createElement('button');x.textContent=t;x.className='manb'+(cls?' '+cls:'');x.onclick=()=>{d.querySelectorAll('button').forEach(y=>y.remove());d.append(v?' ✔':' ✖');if(v==='siempre'){man.libre=true;save();}res(!!v);};d.appendChild(x);};
  b('Permitir',true,'ok');b('Siempre','siempre');b('No',false);
  say('¿me dejas? '+what,4000);});}
let cola=Promise.resolve();
function manosAbsorb(full){let m;TAG.lastIndex=0;const acts=[];while((m=TAG.exec(full))){const k=m[1].toLowerCase(),a=m[2].trim();
    if(k==='aprende')aprende(a);else if(man.on)acts.push([k,a]);}
  for(const [k,a] of acts)cola=cola.then(async()=>{if(await permiso(k,a))await RUN[k](a);}).catch(()=>{});}
const _absorb=absorbMem;absorbMem=full=>{_absorb(full);manosAbsorb(full);};

// botón (escondido) que usa CIBERWARE para prenderlas y apagarlas
const btn=document.createElement('button');btn.id='bManos';btn.className='btn';btn.style.display='none';btn.title='Manos de Capri';
const sync=()=>btn.classList.toggle('act',man.on);sync();
btn.onclick=()=>{man.on=!man.on;if(!man.on)man.libre=false;save();sync();
  line('s',man.on?'(🖐 Manos de Capri activas: te pedirá permiso antes de abrir o escribir algo.'+(PC?'':' En el navegador solo abre páginas y copia texto.')+')':'(Manos de Capri apagadas.)');};
document.querySelector('.dock .tools')?.appendChild(btn);
window.manosInfo=()=>({on:man.on,libre:man.libre,aprendido:aprendido.slice(),pc:PC});
const css=document.createElement('style');css.textContent=`.manb{margin-left:8px;background:none;border:1px solid var(--grn);color:var(--grn);font:11px var(--mono);padding:2px 8px;cursor:pointer}.manb.ok{background:var(--grn);color:#04140a}.manb:hover{filter:brightness(1.3)}div.s.man{color:#ffd0d4}`;document.head.appendChild(css);
})();
