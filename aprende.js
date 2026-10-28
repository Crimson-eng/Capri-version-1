// ================= ENTRENAMIENTO DE LOS CEREBROS (2.9) =================
// A Gemini no se le pueden cambiar los pesos desde tu cuenta y una GTX 1650 de 4 GB no alcanza para reentrenar un modelo,
// así que Capri «entrena» como sí se puede: guarda lecciones y las usa en cada respuesta parecida.
// - Tú le enseñas: 👍 / ✎ corregir / 👎 debajo de cada respuesta, o diciéndole «no, eso está mal…» / «perfecto».
// - Ella sola: cuando llevas 4 min sin usarla, revisa respuestas importantes contra tus apuntes con Gemini como maestro
//   (máx. 8 al día, nunca con Claude) y guarda lo que estuvo mal como regla para no repetirlo.
// - Cada lección es de un cerebro (gemini, gpu, claude) y solo se usa con los cerebros que tienes activados.
// - Importancia: cada plática y lección lleva una calificación 0–3 (0 = «hola», «jaja»… no se guarda); la memoria de
//   pláticas busca primero y borra al último lo importante (ver cerebro.js).
// - Si el expediente está abierto, avisa cuando lo que estudias se relaciona con alguno de tus pacientes (nada va a la IA).
// Todo vive en este dispositivo: IndexedDB «capri-entreno».
(()=>{
const A=Object.assign({auto:true,hoy:{d:'',n:0},pend:[],vistos:[]},store.get('aprende',{}));const save=()=>store.set('aprende',A);
const N=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const limpio=t=>String(t||'').replace(/^\[[a-z_]+\]\s*/i,'').replace(/<<[^>]*>>/g,'').trim();

// ---------- importancia 0–3 ----------
const MED=/salud|medic|enferm|sintom|dolor|fiebre|infecci|presion|diabet|corazon|pulmon|higado|ri[ñn]on|cerebr|sangr|alergi|farmac|pastilla|tratamiento|diagnost|paciente|clinic|anatom|fisiolog|patolog|sindrome|cirug|urgenci|guardia|laborator|biometr|signos vitales|medicamento|paracetamol|ibuprofeno|naproxeno|metamizol|insulina|metformina|cilina\b|micina\b|prazol\b|sartan\b|pril\b|olol\b|statina\b|floxacino\b|profeno\b/;
const DATO=/\d+(?:[.,]\d+)?\s*(mg|g|gramos|ml|kg|mmhg|lpm|rpm|%|mcg|ui|g\/dl|mg\/dl|meq|horas|dias|semanas)\b/;
const VITAL=/recuerda|no (se te )?olvide|importante|examen|parcial|final|guardia|cita|tarea|entrega|fecha|mañana tengo|criterio|clasificacion|definicion|fisiopato|complicac|dosis|contraindic|interaccion/;
function importancia(t){const n=N(t),letras=n.replace(/[^a-zñ]/g,'').length;if(letras<20)return 0;
  if(letras<70&&/^(\w+: )?(hola|holi|jaja|jeje|ok|va|sale|gracias|buenas|que onda|xd|si|no|bien|y tu|como estas)\b/.test(n.replace(/^kiga: /,'')))return 0;
  let s=1;if(MED.test(n))s++;if(DATO.test(n))s++;if(VITAL.test(n))s++;return Math.min(3,s);}
window.capriImportancia=importancia;

// ---------- lecciones ----------
let ls=[],dbp=null;
const idb=()=>dbp||(dbp=new Promise((res,rej)=>{const o=indexedDB.open('capri-entreno',1);o.onupgradeneeded=()=>o.result.createObjectStore('l',{keyPath:'id',autoIncrement:true});o.onsuccess=()=>res(o.result);o.onerror=()=>rej(o.error);}));
const tx=async(mode,fn)=>{const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('l',mode);const r=fn(t.objectStore('l'));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});};
tx('readonly',s=>s.getAll()).then(a=>{ls=a||[];pinta();}).catch(()=>{});
const quienDe=u=>/^GPU/.test(u||'')?'gpu':/^Claude/.test(u||'')?'claude':'gemini';
const NOMBRE={gemini:'Gemini',gpu:'tu GPU',claude:'Claude'};
function activos(){const ci=window.cerebroInfo?.()||{},a=[];if(cfg.key&&cfg.model&&ci.modo!=='local')a.push('gemini');
  if(ci.ok&&ci.modelo&&ci.modo!=='gemini')a.push('gpu');if(ci.claude&&ci.claude!=='off'&&ci.claudeKey)a.push('claude');return a;}
async function guarda(l){l={ts:Date.now(),imp:importancia(l.q+' '+(l.bien||l.a||'')),...l};
  // la misma pregunta con el mismo cerebro: la lección nueva reemplaza a la vieja
  const igual=ls.find(x=>x.cer===l.cer&&N(x.q)===N(l.q));if(igual){l.id=igual.id;ls=ls.filter(x=>x!==igual);}
  try{l.id=await tx('readwrite',s=>s.put(l));}catch(e){}ls.push(l);
  if(ls.length>600){const v=ls.slice().sort((a,b)=>(a.imp-b.imp)||(a.ts-b.ts))[0];ls=ls.filter(x=>x!==v);tx('readwrite',s=>s.delete(v.id)).catch(()=>{});}
  pinta();return l;}
const pal=t=>new Set((N(t).match(/[a-zñ0-9]{4,}/g)||[]).map(w=>w.slice(0,7)));
function parecidas(q,k=3){const W=pal(q);if(W.size<2)return [];const act=new Set(activos());
  return ls.filter(l=>act.has(l.cer)).map(l=>{const P=pal(l.q);let n=0;for(const w of W)if(P.has(w))n++;return [n/Math.sqrt(W.size*Math.max(1,P.size))*(l.voto<0?1.15:1)*(.85+.05*l.imp),l];})
    .filter(x=>x[0]>.3).sort((a,b)=>b[0]-a[0]).slice(0,k).map(x=>x[1]);}
let usadas=[];
const _prep=window.medPrepare;
window.medPrepare=async q=>{usadas=q&&q.length>=8?parecidas(q):[];if(usadas.length)log('🧠 '+usadas.length+' lección(es) de entrenamiento para esta respuesta','g');return _prep?_prep(q):undefined;};
const _prompt=window.medPrompt;
window.medPrompt=()=>(_prompt?_prompt():'')+(usadas.length?`

LO QUE ${(cfg.name||'Kiga').toUpperCase()} TE HA ENSEÑADO EN PREGUNTAS PARECIDAS (es tu entrenamiento: síguelo sin mencionarlo)
${usadas.map(l=>l.voto>0?`- Ante «${l.q.slice(0,160)}» le gustó esta respuesta${l.cer?' ('+NOMBRE[l.cer]+')':''}: «${limpio(l.a).slice(0,420)}». Contesta con ese estilo y nivel.`
  :`- Ante «${l.q.slice(0,160)}» ${l.origen==='auto'?'tu revisión encontró':'te corrigió'}: «${(l.nota||'no le gustó').slice(0,300)}».${l.bien?' Lo correcto: «'+l.bien.slice(0,420)+'».':''} No repitas ese error.`).join('\n')}`:'');

// ---------- 👍 ✎ 👎 debajo de cada respuesta ----------
const css=document.createElement('style');css.textContent=`.fbk{display:flex;gap:6px;margin:2px 0 8px;align-items:center}.fbk button{background:none;border:1px solid #2a2733;color:var(--mut);font:11px var(--mono);padding:2px 7px;cursor:pointer}
.fbk button:hover{border-color:var(--cyan);color:var(--cyan)}.fbk small{font:11px var(--mono);color:var(--grn)}
#apModal .l{border-left:2px solid #2a2733;padding:6px 10px;margin:4px 0;font:12px/1.5 var(--mono)}#apModal .l.m{border-color:var(--red)}#apModal .l.b{border-color:var(--grn)}#apModal .l button{float:right;background:none;border:0;color:var(--mut);cursor:pointer}`;document.head.appendChild(css);
function botones(q,a,cer){const row=document.createElement('div');row.className='fbk';row.innerHTML=`<button data-v="1" title="Así me gusta: aprende esta respuesta">👍</button><button data-v="e" title="Corrígela: escribe cómo debió contestar">✎ corregir</button><button data-v="-1" title="Estuvo mal">👎</button><small></small>`;
  const ok=t=>{row.querySelectorAll('button').forEach(b=>b.remove());row.querySelector('small').textContent='✓ '+t;};
  row.onclick=async e=>{const v=e.target.closest('button')?.dataset.v;if(!v)return;
    if(v==='1'){await guarda({q,a,cer,voto:1,origen:'tu'});ok('aprendido para '+NOMBRE[cer]);}
    if(v==='-1'){const nota=prompt('¿Qué estuvo mal? (opcional, así aprende mejor)')??null;if(nota===null)return;await guarda({q,a,cer,voto:-1,nota:nota.trim()||'no le gustó esta respuesta',origen:'tu'});ok('anotado: '+NOMBRE[cer]+' no lo vuelve a contestar así');}
    if(v==='e'){const bien=prompt('Escribe cómo debió contestar (o lo que corregirías):');if(!bien?.trim())return;await guarda({q,a,cer,voto:-1,nota:'lo corrigió '+(cfg.name||'Kiga'),bien:bien.trim(),origen:'tu'});ok('corrección guardada para '+NOMBRE[cer]);}};
  term.appendChild(row);term.scrollTop=1e9;}
const MAL=/^(no[,.!]|nel\b|eso (esta|no es|es) (mal|incorrecto|falso)|incorrect|falso\b|te equivocaste|estas mal|esta mal|equivocad|error:|corrijo)/;
const BIEN=/^(perfecto|exacto|correcto|muy bien|eso es|asi (esta|es) bien|excelente|gracias,? (esta|muy) bien)\b/;
const _respond=respond;
// la última pregunta tuya con su respuesta (se salta lo que Capri dijo sola o al mirar la pantalla)
function ultimoPar(){for(let i=history.length-1;i>0;i--){const a=history[i],q=history[i-1];if(a.role==='model'&&q.role==='user'&&!/^\(/.test(q.text))return [q,a];if(history.length-i>8)break;}return [];}
respond=async(userText,extra,mode)=>{const n0=history.length,[prevQ,prevA]=ultimoPar(),dicho=N(userText).trim();
  if(mode==='user'&&prevA){const cer=quienDe(window.cerebroInfo?.().ultimo);
    if(MAL.test(dicho))guarda({q:prevQ.text,a:prevA.text,cer,voto:-1,nota:userText.slice(0,300),origen:'tu'}).then(()=>log('🧠 anoté tu corrección para '+NOMBRE[cer],'y'));
    else if(BIEN.test(dicho)&&dicho.length<60)guarda({q:prevQ.text,a:prevA.text,cer,voto:1,origen:'tu'});}
  const r=await _respond(userText,extra,mode);
  if(mode==='user'&&history.length>n0&&history.at(-1)?.role==='model'){const q=history.at(-2).text,a=history.at(-1).text,cer=quienDe(window.cerebroInfo?.().ultimo);
    botones(q,a,cer);
    const imp=importancia(q+' '+a);if(imp>=2&&A.auto){A.pend=[...A.pend.filter(x=>x.q!==q),{q,a,cer,ts:Date.now(),imp}].slice(-30);save();}
    relaciona(q+' '+limpio(a));}
  return r;};

// ---------- autoentrenamiento: Gemini como maestro, tus apuntes como respuesta correcta ----------
async function fuentesDe(q){const out=[];for(const o of (window.bibBuscar?await window.bibBuscar(q,6).catch(()=>[]):[]))out.push(`${o.t.nombre}${o.t.pag?', p. '+o.t.pag:''}: ${o.t.text}`);
  for(const o of (window.medBuscarLocal?.(q,4)||[]))out.push(`${o.nombre}${o.pag?', p. '+o.pag:''}: ${o.text}`);return [...new Set(out)].slice(0,5);}
let revisando=false;
async function autoentrena(){if(revisando||!A.auto||typeof busy==='undefined'||busy||Date.now()-lastAct<4*60e3||!navigator.onLine)return;
  const hoy=new Date().toDateString();if(A.hoy.d!==hoy)A.hoy={d:hoy,n:0};if(A.hoy.n>=8)return;
  const act=activos();if(!act.includes('gemini'))return;   // el maestro es Gemini: sin key no hay quién revise
  const c=A.pend.filter(x=>act.includes(x.cer)).sort((a,b)=>b.imp-a.imp||b.ts-a.ts)[0];if(!c)return;
  revisando=true;A.pend=A.pend.filter(x=>x!==c);A.hoy.n++;save();
  try{const F=await fuentesDe(c.q);if(c.cer==='gemini'&&!F.length)return;   // Gemini no se revisa a sí misma sin tus apuntes de por medio
    const r=await gemUna([{text:`Eres el maestro que revisa a Capri, una asistente que ayuda a un estudiante de medicina. Revisa SOLO errores de contenido (datos falsos, cifras o dosis mal, conceptos confundidos, algo importante que contradiga las fuentes). No califiques el estilo ni la personalidad.
${F.length?'Las fuentes son los apuntes del estudiante y mandan sobre todo lo demás.':'No hay apuntes del tema: usa conocimiento médico establecido y marca error solo si estás seguro.'}
Responde SOLO JSON: {"correcta":true|false,"errores":["..."],"leccion":"regla corta y general para no repetir el error","mejor":"cómo debió decirse, breve"}

PREGUNTA: ${c.q.slice(0,800)}
RESPUESTA DE CAPRI (${NOMBRE[c.cer]}): ${limpio(c.a).slice(0,2500)}
${F.length?'\nFUENTES:\n'+F.map((f,i)=>`[${i+1}] ${f.slice(0,1100)}`).join('\n'):''}`}],{temperature:0,maxOutputTokens:1024,responseMimeType:'application/json'});
    let j=null;try{j=JSON.parse(r.text.replace(/^```(?:json)?|```$/g,''));}catch(e){}
    if(j&&j.correcta===false&&(j.leccion||j.errores?.length)){await guarda({q:c.q,a:c.a,cer:c.cer,voto:-1,nota:String(j.leccion||j.errores.join('; ')).slice(0,300),bien:String(j.mejor||'').slice(0,600)||undefined,origen:'auto'});
      log('🧠 autoentrenamiento: corregí una respuesta de '+NOMBRE[c.cer],'y');A.ult='corrigió: '+String(j.leccion||'').slice(0,80);}
    else{log('🧠 autoentrenamiento: la respuesta de '+NOMBRE[c.cer]+' estaba bien','g');A.ult='revisó una respuesta: estaba bien';}
    A.rev=(A.rev||0)+1;save();pinta();}
  catch(e){log('autoentrenamiento: '+String(e.message).slice(0,50),'w');}
  finally{revisando=false;}}
setInterval(autoentrena,60e3);

// ---------- apuntes ↔ pacientes (solo en pantalla) ----------
function relaciona(t){const r=window.expRelacionados?.(t);if(!r?.length)return;
  const el=line('s med','🩺 Esto se relaciona con '+r.length+' paciente(s) de tu expediente: '+r.map(x=>x.nexp+(x.dx?' ('+x.dx+')':'')).join(' · ')+' — toca para abrir el primero y relacionarlo con tus apuntes');
  el.style.cursor='pointer';el.onclick=()=>window.expAbrirPac?.(r[0].id);}

// ---------- en Ajustes ----------
const box=document.createElement('div');box.innerHTML=`<h3>Entrenamiento de tus cerebros</h3><small id="apSt"></small>
 <label>Que se entrene sola<select id="apAuto"><option value="1">Sí: cuando no la usas, Gemini revisa sus respuestas importantes contra tus apuntes (máx. 8 al día)</option><option value="0">No: solo aprende de lo que tú le marques</option></select></label>
 <small>Debajo de cada respuesta: 👍 = así me gusta · ✎ = corrígela · 👎 = estuvo mal. También aprende si le dices «no, eso está mal…» o «perfecto». Cada cerebro aprende lo suyo y solo se usan las lecciones de los cerebros que tienes activos.</small>
 <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="apVer" style="width:auto;flex:1;padding:8px 10px">Ver lecciones</button><button class="btn" id="apDel" style="width:auto;flex:1;padding:8px 10px">✖ Borrar lecciones</button></div>`;
$('cClose')?.parentElement?.before(box);
function pinta(){const st=$('apSt');if(!st)return;const c={gemini:0,gpu:0,claude:0};for(const l of ls)c[l.cer]=(c[l.cer]||0)+1;const act=activos();
  st.textContent=`Lecciones: Gemini ${c.gemini} · tu GPU ${c.gpu} · Claude ${c.claude} · activos ahora: ${act.map(x=>NOMBRE[x]).join(', ')||'ninguno'}`+(A.rev?` · revisó sola ${A.rev} respuesta(s)`+(A.ult?' (última: '+A.ult+')':''):'');
  $('apAuto').value=A.auto?'1':'0';}
$('apAuto').onchange=()=>{A.auto=$('apAuto').value==='1';save();};
$('apDel').onclick=async()=>{if(!confirm('¿Borrar todas las lecciones de entrenamiento?'))return;ls=[];await tx('readwrite',s=>s.clear()).catch(()=>{});pinta();};
const modal=document.createElement('div');modal.className='modal';modal.id='apModal';modal.innerHTML='<div class="panel" style="max-width:760px"><div><h2>🧠 Lecciones de entrenamiento</h2><small>Lo que cada cerebro aprendió. Bórrala si una lección no te sirve.</small><div id="apLs"></div><div class="row"><button class="btn" id="apCl">Listo</button></div></div></div>';
document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});
function lista(){$('apLs').innerHTML=ls.slice().sort((a,b)=>b.ts-a.ts).map(l=>`<div class="l ${l.voto<0?'m':'b'}"><button data-x="${l.id}" title="Borrar">✕</button><b>${NOMBRE[l.cer]||l.cer}</b> · ${l.voto<0?'corrección':'le gustó'} · ${l.origen==='auto'?'revisión sola':'tú'} · importancia ${l.imp}<br>«${esc(l.q.slice(0,140))}»${l.nota&&l.voto<0?'<br>→ '+esc(l.nota):''}${l.bien?'<br>✓ '+esc(l.bien.slice(0,240)):''}</div>`).join('')||'<small>Aún no hay lecciones.</small>';
  $('apLs').querySelectorAll('[data-x]').forEach(b=>b.onclick=async()=>{const id=+b.dataset.x;ls=ls.filter(x=>x.id!==id);await tx('readwrite',s=>s.delete(id)).catch(()=>{});lista();pinta();});}
$('apVer').onclick=()=>{lista();modal.classList.add('show');};$('apCl').onclick=()=>modal.classList.remove('show');
$('bCfg')?.addEventListener('click',()=>setTimeout(pinta,80));
window.aprendeInfo=()=>({lecciones:ls.length,activos:activos(),auto:A.auto});
window.__apTest={importancia,parecidas,activos,guarda,autoentrena,get ls(){return ls;},A};
})();
