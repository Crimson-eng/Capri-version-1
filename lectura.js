// ================= LECTURA COMPLETA (2.8) =================
// Dos cosas:
// 1) La ventana «Lectura del documento»: enseña el texto que Capri sacó de cada página, cuántas páginas leyó de cuántas
//    tiene el archivo y cuáles quedaron vacías o se leyeron con OCR, para que Kiga vea si el documento quedó completo.
// 2) Preguntas sobre el documento ENTERO («resúmelo», «¿qué es lo más importante según el documento?»): antes solo le
//    llegaban a Capri 5 o 6 trozos sueltos y contestaba con un pedazo como si fuera todo. Ahora:
//    - si el documento cabe, le pasa el texto completo, página por página;
//    - si no cabe, lo resume por secciones (map-reduce: cada sección → notas con página; luego Capri junta todas)
//      y guarda esas notas en este dispositivo (IndexedDB «capri-lectura») para que la segunda vez sea instantánea;
//    - le dice cuánto se leyó de verdad, para que no presente una lectura parcial como completa.
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const rangos=ns=>window.rangosPag?window.rangosPag(ns):ns.join(', ');

// ---------- ventana ----------
const css=document.createElement('style');css.textContent=`
#lecModal .panel{max-width:1000px;height:90vh}#lecModal .panel>div{height:100%;box-sizing:border-box;gap:10px}
#lecModal .lc-h{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
#lecModal .lc-x{background:none;border:1px solid #3b1418;color:#ffd9dc;font:14px var(--mono);width:34px;height:34px;cursor:pointer;flex:none}#lecModal .lc-x:hover{border-color:var(--hr,#ff4d5e);color:var(--hr,#ff4d5e)}
#lecModal .lc-sub{font:10px var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--hc,#5ef6ff)}
#lecModal .lc-bar{height:8px;background:#1a0a0d;border:1px solid #3b1418;position:relative;overflow:hidden}
#lecModal .lc-bar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--hr,#ff4d5e),var(--hc,#5ef6ff))}
#lecModal .lc-st{font:13px var(--mono);color:#ffe3e6}#lecModal .lc-st b{color:var(--hc,#5ef6ff)}#lecModal .lc-st .mal{color:var(--hr,#ff4d5e)}
#lecModal .lc-chips{display:flex;flex-wrap:wrap;gap:5px}#lecModal .lc-chips button{font:11px var(--mono);background:none;border:1px solid #3b1418;color:#ffd9dc;padding:3px 7px;cursor:pointer}
#lecModal .lc-chips button.v{border-color:var(--hr,#ff4d5e);color:var(--hr,#ff4d5e)}#lecModal .lc-chips button.o{border-color:var(--hc,#5ef6ff);color:var(--hc,#5ef6ff)}
#lecModal .lc-av{font:12px/1.5 var(--mono);color:#ffb3ba;border-left:2px solid var(--hr,#ff4d5e);padding:6px 10px;background:rgba(255,77,94,.06)}
#lecModal .lc-av.ok{color:#bff;border-color:var(--hc,#5ef6ff);background:rgba(94,246,255,.05)}
#lecModal .lc-tl{display:flex;gap:6px;flex-wrap:wrap;align-items:center}#lecModal .lc-tl input{padding:6px 9px;font:12px var(--mono);min-width:0}
#lecModal .lc-tl .q{flex:1 1 200px}#lecModal .lc-tl .pg{width:90px}
#lecModal .lc-tl button{font:11px var(--mono);background:none;border:1px solid #3b1418;color:#ffd9dc;padding:6px 10px;cursor:pointer}
#lecModal .lc-tl button:hover,#lecModal .lc-chips button:hover{border-color:var(--hc,#5ef6ff);color:var(--hc,#5ef6ff)}
#lecModal .lc-body{flex:1;min-height:0;overflow:auto;border-top:1px solid #2a0d11;padding-right:6px}
#lecModal .lc-p{content-visibility:auto;contain-intrinsic-size:auto 300px;border-bottom:1px dashed #2a0d11;padding:10px 0}
#lecModal .lc-p h4{margin:0 0 6px;font:600 11px var(--mono);letter-spacing:.18em;color:var(--hc,#5ef6ff);display:flex;gap:10px;align-items:center}
#lecModal .lc-p h4 em{font-style:normal;color:#a0565e;letter-spacing:.04em}#lecModal .lc-p h4 .t{border:1px solid currentColor;padding:1px 5px;font-size:9px}
#lecModal .lc-p pre{margin:0;white-space:pre-wrap;word-break:break-word;font:12.5px/1.55 var(--mono);color:#ecd2d5}
#lecModal .lc-p.vac h4{color:var(--hr,#ff4d5e)}#lecModal .lc-p.vac pre{color:var(--hr,#ff4d5e);opacity:.85}
#lecModal mark{background:rgba(94,246,255,.3);color:inherit}#lecModal .lc-msg{font:12px var(--mono);color:var(--hc,#5ef6ff)}
#mdMats{max-height:34vh;overflow:auto}
@media (max-width:640px){#lecModal .panel{height:94vh}#lecModal .panel>div{padding:14px}}`;document.head.appendChild(css);
const modal=document.createElement('div');modal.className='modal';modal.id='lecModal';modal.innerHTML='<div class="panel"><div id="lecIn"></div></div>';document.body.appendChild(modal);
modal.addEventListener('click',e=>{if(e.target===modal)cerrar();});
const fi=document.createElement('input');fi.type='file';fi.style.display='none';document.body.appendChild(fi);
let cur=null,q='',msg='';
const cerrar=()=>{modal.classList.remove('show');cur=null;};
addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('show')){e.stopPropagation();cerrar();}},true);

// qué páginas hay y cuáles faltan (los documentos leídos antes de 2.8 no traen informe: se deduce de los trozos)
function estado(d){const inf=d.lectura,pg=d.paginas.filter(p=>p.n),have=new Set(pg.map(p=>p.n));
  if(inf?.total)return {total:inf.total,con:inf.conTexto,vac:inf.vacias||[],ocr:inf.ocr||[],conf:inf.conf,err:inf.err,rec:inf.recortado,viejo:false};
  if(inf&&!pg.length)return {total:null,vac:[],ocr:[],rec:inf.recortado,viejo:false};
  if(!pg.length)return {total:null,vac:[],ocr:[],viejo:false};
  const max=Math.max(...pg.map(p=>p.n)),vac=[];for(let n=1;n<=max;n++)if(!have.has(n))vac.push(n);
  return {total:max,con:max-vac.length,vac,ocr:[],viejo:!inf,aprox:true};}
function pinta(){if(!cur)return;const d=cur.d,e=estado(d),byN=new Map(d.paginas.map(p=>[p.n,p]));
  const pct=e.total?Math.round(100*e.con/e.total):100,qq=N(q.trim());
  const re=qq.length>2?new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'):null;
  const lista=[];if(byN.has(0))lista.push(byN.get(0));
  if(e.total)for(let n=1;n<=e.total;n++)lista.push(byN.get(n)||{n,text:'',falta:true});else lista.push(...d.paginas.filter(p=>p.n));
  let hits=0,pHits=[];
  const cuerpo=lista.map(p=>{const vac=p.falta||p.text.replace(/\s/g,'').length<25,ocr=e.ocr.includes(p.n);
    let t=esc(p.text);if(re&&!vac){let k=0;t=t.replace(re,m=>{k++;return '<mark>'+m+'</mark>';});if(k){hits+=k;pHits.push(p.n);}}
    return `<div class="lc-p${vac?' vac':''}" id="lecP${p.n}"><h4>${p.n?'PÁGINA '+p.n+(e.total?' / '+e.total:''):e.total?'ANTES DE LA PÁGINA 1':'TEXTO COMPLETO'}<em>${vac?'':p.text.length.toLocaleString('es-MX')+' caracteres'}</em>${ocr?'<span class="t">OCR</span>':''}</h4>
      <pre>${vac?'⚠ Esta página no trajo texto. Puede ser una imagen, una foto o un escaneo que no se pudo leer'+(e.viejo?' (se leyó con una versión anterior de Capri, que no pasaba estas páginas por OCR)':'')+'. Capri no sabe lo que dice.':t}</pre></div>`;}).join('');
  const av=e.viejo?`<div class="lc-av">Este documento se leyó con una versión anterior de Capri, que no guardaba cuántas páginas tenía el archivo${e.total?' ni pasaba por OCR las páginas escaneadas':''}. ${e.total?`Se ven ${e.con} página(s) con texto hasta la ${e.total}${e.vac.length?'; huecos: p. '+rangos(e.vac):''}. Si el archivo tiene más páginas al final, tampoco se leyeron.`:''} Toca <b>↻ Volver a leer</b> y elige el mismo archivo para leerlo completo.</div>`
    :e.vac?.length?`<div class="lc-av">${e.vac.length} página(s) quedaron sin texto: ${rangos(e.vac)}. ${e.err?'El lector de escaneos se detuvo ('+esc(e.err)+'). ':''}Capri no las puede citar. Si traen texto, vuelve a leerlo con ↻ (en R.I.P puedes elegir Gemini, que lee mejor la letra a mano).</div>`
    :e.total?`<div class="lc-av ok">Lectura completa: las ${e.total} páginas traen texto${e.ocr.length?' ('+e.ocr.length+' leídas como escaneo'+(e.conf!=null?', confianza '+e.conf+'%':'')+': revisa cifras y dosis)':''}.</div>`:'';
  $('lecIn').innerHTML=`<div class="lc-h"><div style="min-width:0"><div class="lc-sub">Lectura del documento · ${esc(d.donde)}</div><h2 style="margin:4px 0 2px;overflow-wrap:anywhere">${esc(d.name)}</h2><small>${esc(d.file||'')} · ${d.chars?(d.chars<10000?d.chars.toLocaleString('es-MX'):Math.round(d.chars/1000).toLocaleString('es-MX')+'k')+' caracteres · ':''}${d.trozos} trozos buscables</small></div><button class="lc-x" data-l="x" title="Cerrar (Esc)">✕</button></div>
   ${e.total?`<div class="lc-st">Páginas con texto: <b>${e.con}</b> de <b>${e.total}</b>${e.aprox?' (o más)':''} · <span class="${pct<100?'mal':''}">${pct}%</span>${e.ocr.length?' · '+e.ocr.length+' con OCR':''}</div><div class="lc-bar"><i style="width:${pct}%"></i></div>`:`<div class="lc-st">Documento sin páginas (Word, texto…): se muestra entero.</div>`}
   ${e.vac?.length||e.ocr.length?`<div class="lc-chips">${e.vac.slice(0,60).map(n=>`<button class="v" data-go="${n}" title="ir a la página">p. ${n} vacía</button>`).join('')}${e.vac.length>60?'<small>…</small>':''}${e.ocr.slice(0,30).map(n=>`<button class="o" data-go="${n}" title="leída como escaneo">p. ${n} OCR</button>`).join('')}</div>`:''}
   ${av}${e.rec?`<div class="lc-av">Ojo: ${esc(e.rec)}.</div>`:''}
   <div class="lc-tl"><input class="q" id="lecQ" placeholder="Buscar en el texto leído…" value="${esc(q)}"><input class="pg" id="lecG" type="number" min="1" placeholder="ir a pág."><button data-l="re">↻ Volver a leer</button><button data-l="txt">⬇ Texto</button></div>
   ${re?`<div class="lc-msg">${hits?hits+' coincidencia(s) en '+pHits.length+' página(s): '+pHits.slice(0,20).map(n=>`<a href="#" data-go="${n}" style="color:inherit">${n||'inicio'}</a>`).join(', '):'Sin coincidencias en el texto leído.'}</div>`:''}
   <div class="lc-msg" id="lecMsg">${esc(msg)}</div>
   <div class="lc-body" id="lecB">${cuerpo||'<small>No hay texto guardado.</small>'}</div>`;}
const ir=n=>{const el=document.getElementById('lecP'+n);if(el)el.scrollIntoView({block:'start'});};
modal.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){e.preventDefault();return ir(g.dataset.go);}
  const b=e.target.closest('[data-l]');if(!b||!cur)return;const a=b.dataset.l;
  if(a==='x')return cerrar();
  if(a==='txt'){const t=cur.d.paginas.map(p=>(p.n?`[Página ${p.n}]\n`:'')+p.text).join('\n\n'),u=URL.createObjectURL(new Blob([t],{type:'text/plain'})),l=document.createElement('a');l.href=u;l.download=cur.d.name+' (lectura).txt';l.click();setTimeout(()=>URL.revokeObjectURL(u),2000);return;}
  if(a==='re'){fi.accept=cur.src==='med'?'.pdf,.docx,.txt,.md':'';fi.click();}});
fi.onchange=async()=>{const f=fi.files[0];fi.value='';if(!f||!cur)return;const {src,id}=cur;
  try{msg='Leyendo '+f.name+'…';pinta();const fn=src==='med'?window.medReleer:window.bibReleer;
    const inf=await fn(id,f,m=>{msg=m;const el=$('lecMsg');if(el)el.textContent=m;});
    msg='✓ Leído otra vez'+(inf?.total?': '+inf.conTexto+' de '+inf.total+' páginas con texto':'')+'.';borraMapas(src,id);
    if(cur?.id===id){cur.d=await (src==='med'?window.medLectura:window.bibLectura)(id);pinta();}}
  catch(e){msg='✖ No pude: '+e.message;pinta();}};
modal.addEventListener('input',e=>{if(e.target.id!=='lecQ')return;q=e.target.value;clearTimeout(pinta.t);pinta.t=setTimeout(()=>{const y=$('lecB')?.scrollTop;pinta();const i=$('lecQ');i.focus();i.setSelectionRange(q.length,q.length);if(y!=null)$('lecB').scrollTop=y;},220);});
modal.addEventListener('keydown',e=>{if(e.target.id==='lecG'&&e.key==='Enter')ir(+e.target.value);});
window.verLectura=async(src,id,pag)=>{const d=await (src==='med'?window.medLectura:window.bibLectura)?.(id);if(!d)return;cur={src,id,d};q='';msg='';pinta();modal.classList.add('show');$('lecB').scrollTop=0;if(pag)ir(pag);};

// ---------- notas por secciones guardadas (para no volver a resumir) ----------
let ldb=null;
const lopen=()=>ldb?Promise.resolve(ldb):new Promise(res=>{try{const r=indexedDB.open('capri-lectura',1);r.onupgradeneeded=()=>r.result.createObjectStore('mapas');
  r.onsuccess=()=>res(ldb=r.result);r.onerror=()=>res(null);}catch(e){res(null);}});
const lget=k=>lopen().then(d=>d&&new Promise(res=>{const t=d.transaction('mapas').objectStore('mapas').get(k);t.onsuccess=()=>res(t.result||null);t.onerror=()=>res(null);}));
const lput=(k,v)=>lopen().then(d=>d&&new Promise(res=>{const t=d.transaction('mapas','readwrite');t.objectStore('mapas').put(v,k);t.oncomplete=res;t.onerror=res;}));
function borraMapas(src,id){lopen().then(d=>{if(!d)return;const t=d.transaction('mapas','readwrite'),s=t.objectStore('mapas'),r=s.openCursor();
  r.onsuccess=()=>{const c=r.result;if(!c)return;if(String(c.key).startsWith(src+':'+id+':'))c.delete();c.continue();};});}

// ---------- ¿la pregunta es sobre el documento entero? ----------
const GLOBAL=/\b(todo el|toda la|todos los|todas las|completo|completa|entero|entera|resum\w*|sintetiza\w*|lo mas importante|lo importante|lo principal|lo esencial|lo relevante|puntos? (clave|principales|importantes)|ideas? (clave|principales|importantes)|temas? (principales|importantes)|de que (trata|habla)|que (dice|contiene|trae|viene en) (el|la|los|las|mis|este|esta|ese|esa)|panorama|en general|esquema|indice|temario|repaso general|repasa todo|guia de estudio|mapa mental)\b/;
const DOCW=/\b(documentos?|doc|archivos?|libros?|apuntes|pdf|guias?|reservorio|biblioteca|materiales?|texto|capitulos?|presentacion|diapositivas|nom|gpc|norma)\b/;
const GEN=new Set('guia guias apuntes documento libro manual tema temas capitulo version final copia para sobre practica clinica clinicas pdf docx del los las una con por medicina resumen notas clase'.split(' '));
function nombra(qn,name){const nm=N(name).replace(/[_\-.]+/g,' ').trim();if(nm.length>=5&&qn.includes(nm))return true;
  const ws=[...new Set(nm.match(/[a-z0-9ñ]{4,}/g)||[])].filter(w=>!GEN.has(w));if(!ws.length)return false;
  const k=ws.filter(w=>new RegExp('\\b'+w.slice(0,Math.max(4,w.length-2))).test(qn)).length;return k>=Math.min(2,ws.length);}
function objetivos(q){const qn=N(q),med=(window.medActivos?.()||[]).map(d=>({...d,src:'med'})),bib=(window.bibActivos?.()||[]).map(d=>({...d,src:'bib'}));
  const foco=window.bibFocoActual?.();
  const dedup=a=>{const s=new Set();return a.filter(d=>{const k=N(d.name);if(s.has(k))return false;s.add(k);return true;});};
  const nom=dedup([...med,...bib].filter(d=>nombra(qn,d.name)));
  const pideDoc=DOCW.test(qn)||nom.length||foco;if(!GLOBAL.test(qn)||!pideDoc)return null;
  if(nom.length)return nom;
  if(foco){const d=bib.find(x=>x.id===foco.id);if(d)return [d];}
  const bibN=bib.filter(d=>!d.oficial);
  if(/reservorio|medic/.test(qn)&&med.length)return med;
  if(/biblioteca/.test(qn)&&bibN.length)return bibN;
  const todos=dedup([...med,...bibN]);if(!todos.length)return null;
  if(todos.length===1||/\b(el|este|ese|mi) (documento|archivo|libro|pdf)\b/.test(qn))return [todos.sort((a,b)=>(b.added||0)-(a.added||0))[0]];   // «el documento» = el último que subiste
  return med.length?med:bibN;}

// ---------- leer entero o resumir por secciones ----------
const MAXDOCS=12;
const nube=()=>!!(cfg.key&&cfg.model)&&window.cerebroInfo?.().modo!=='local';
const gpu=()=>!!window.cerebroInfo?.().ok&&!!window.cerebroInfo().modelo;
// un .txt o .md (un constructo, por ejemplo) no tiene páginas: antes salía UNA sección con todo el archivo y se mandaba
// entera al cerebro, que se quedaba pensando. Ahora lo que no quepa en una sección se parte en pedazos (por párrafos).
function partirTexto(t,S){const out=[];let i=0;while(i<t.length){let j=Math.min(t.length,i+S);
    if(j<t.length){const k=Math.max(t.lastIndexOf('\n\n',j),t.lastIndexOf('\n',j));if(k>i+S*.5)j=k;else{const e=t.lastIndexOf('. ',j);if(e>i+S*.5)j=e+1;}}
    out.push(t.slice(i,j));i=j;}return out;}
function secciones(pags,S){const out=[];let c=null;
  pags=pags.flatMap(p=>p.text.length>S?partirTexto(p.text,S-20).map(text=>({n:p.n,text})):[p]);
  for(const p of pags){if(!p.text.trim())continue;const bloque=(p.n?`[p. ${p.n}]\n`:'')+p.text;
    if(c&&c.text.length+bloque.length>S){out.push(c);c=null;}
    if(!c)c={a:p.n||1,b:p.n||1,text:'',sinPag:!p.n};c.text+=(c.text?'\n':'')+bloque;c.b=p.n||c.b;}
  if(c)out.push(c);out.forEach((s,i)=>{s.i=i+1;s.de=out.length;});return out;}
const PROMPT_SEC=(nom,a,b)=>`Eres el lector de Capri. Esta es ${typeof a==='string'?a:'la sección de las páginas '+a+' a '+b} del documento «${nom}». Si no es material de estudio (un perfil, un relato, el constructo de otra IA), saca lo esencial: quién es, cómo habla, rasgos, historia, gustos, reglas y datos clave. Si es de estudio, saca TODO lo importante para estudiar y consultar: conceptos y definiciones, criterios diagnósticos, clasificaciones, tratamientos (fármaco, dosis, vía, duración), cifras y valores de corte, complicaciones y señales de alarma. Viñetas cortas que empiecen con guion y terminen con su página así: (p. N). Si hay varios temas, ponles un título en MAYÚSCULAS. Nada que no diga el texto; no repitas. Máximo unas 25 viñetas.`;
async function resumeSec(nom,s,local){const A=s.sinPag?'la parte '+s.i+' de '+s.de:s.a;
  if(!local){const r=await gemUna([{text:PROMPT_SEC(nom,A,s.b)+'\n\n=== TEXTO ===\n'+s.text}],{temperature:.2,maxOutputTokens:2048});if(!r.text)throw new Error('respuesta vacía');return r.text;}
  const j=await window.cerebroJSON(PROMPT_SEC(nom,A,s.b)+' Responde SOLO JSON: {"puntos":[{"t":"punto corto","p":numero_de_pagina}]}',s.text);
  const ps=(j?.puntos||[]).filter(x=>x&&x.t);if(!ps.length)throw new Error('la GPU no sacó puntos');return ps.map(x=>'- '+x.t+(x.p?' (p. '+x.p+')':'')).join('\n');}
async function mapa(d,lec,S,local,av){const key=d.src+':'+d.id+':'+lec.chars+':'+S+(local?':gpu':'');
  const secs=secciones(lec.paginas,S),prev=await lget(key).catch(()=>null);
  if(prev?.secs?.length===secs.length)secs.forEach((s,i)=>s.notas=prev.secs[i].notas);
  const falta=secs.filter(s=>!s.notas);let hechas=secs.length-falta.length,cola=[...falta];
  const guarda=()=>lput(key,{secs:secs.map(s=>({a:s.a,b:s.b,notas:s.notas||null})),fecha:Date.now()}).catch(()=>{});
  const sg=window.capriSenal?.();
  // tope de tiempo por pregunta: lo que no alcance se queda para la siguiente (lo leído ya está guardado)
  const hasta=Date.now()+(local?240e3:180e3),barra=()=>{const k=Math.round(10*hechas/secs.length);return '▰'.repeat(k)+'▱'.repeat(10-k)+' '+Math.round(100*hechas/secs.length)+'%';};
  const trabajador=async()=>{while(cola.length){if(sg?.aborted||Date.now()>hasta){for(const s of cola.splice(0))s.err='no alcanzó el tiempo; pregúntame otra vez y la leo';avance.pend=true;break;}
      const s=cola.shift();av(`📖 leyendo «${d.name}» completo ${barra()} · sección ${hechas+1} de ${secs.length}${s.a?' (págs. '+s.a+'–'+s.b+')':''}… (✕ CANCELAR para parar)`);
      try{s.notas=await resumeSec(d.name,s,local);hechas++;await guarda();}catch(e){s.err=e.name==='AbortError'?'cancelado':e.name==='TimeoutError'?'tardó demasiado':e.status===429?'sin cupo de Google':String(e.message).slice(0,60);hechas++;}}};
  await Promise.all(Array.from({length:local?1:2},trabajador));return secs;}
const avance={pend:false};window.lecturaAvance=()=>avance.pend;
let ctx='',cob=[],prog=null;
window.lecturaPesada=()=>ctx.length;
async function prepara(q){const ds=objetivos(q);if(!ds)return false;
  const local=!nube();if(local&&!gpu())return false;
  const DIRECTO=local?7000:90000,S=local?6500:60000,TOPE=local?7000:70000;
  const docs=ds.slice(0,MAXDOCS),lecs=[];for(const d of docs){const l=await (d.src==='med'?window.medLectura:window.bibLectura)?.(d.id);if(l)lecs.push([d,l]);}
  if(!lecs.length)return false;
  const tot=lecs.reduce((s,[,l])=>s+l.paginas.reduce((t,p)=>t+p.text.length,0),0);
  const av=m=>{window.capriLatido?.();if(!prog)prog=line('s med',m);else prog.textContent=m;};avance.pend=false;
  const partes=[];cob=[];
  for(const [d,l] of lecs){const e=estadoCorto(l);
    if(tot<=DIRECTO){partes.push(`### «${d.name}» (texto completo${e.total?', '+e.total+' páginas':''})\n`+l.paginas.filter(p=>p.text.trim()).map(p=>(p.n?`[p. ${p.n}] `:'')+p.text).join('\n'));cob.push({...e,name:d.name,modo:'texto completo'});continue;}
    const secs=await mapa(d,l,S,local,av),ok=secs.filter(s=>s.notas);
    partes.push(`### «${d.name}» (notas de ${ok.length} de ${secs.length} secciones${e.total?', '+e.total+' páginas':''})\n`+secs.map(s=>(s.sinPag?`[parte ${s.i} de ${s.de}]\n`:`[págs. ${s.a}–${s.b}]\n`)+(s.notas||'(esta sección no se pudo leer: '+(s.err||'error')+')')).join('\n\n'));
    cob.push({...e,name:d.name,modo:'resumen por secciones',secs:secs.length,ok:ok.length,faltan:secs.filter(s=>!s.notas).map(s=>s.sinPag?'parte '+s.i:s.a+'–'+s.b)});}
  let txt=partes.join('\n\n');
  if(txt.length>TOPE){const cada=Math.floor(TOPE/partes.length);txt=partes.map(p=>p.length>cada?p.slice(0,cada)+'\n(…recortado para que quepa)':p).join('\n\n');cob.forEach(c=>c.recorte=true);}
  ctx=txt;const n=ds.length>MAXDOCS?ds.length-MAXDOCS:0;if(n)cob.push({name:'',extra:n});
  if(prog){prog.remove();prog=null;}
  log('lectura completa: '+lecs.length+' documento(s), '+Math.round(ctx.length/1000)+'k caracteres al cerebro','g');return true;}
function estadoCorto(l){const pg=l.paginas.filter(p=>p.n),inf=l.lectura;
  if(inf?.total)return {total:inf.total,con:inf.conTexto,vac:inf.vacias||[],viejo:false};
  if(!pg.length)return {total:null};const max=Math.max(...pg.map(p=>p.n)),have=new Set(pg.map(p=>p.n)),vac=[];for(let k=1;k<=max;k++)if(!have.has(k))vac.push(k);
  return {total:max,con:max-vac.length,vac,viejo:true};}
const cobTxt=c=>c.extra?`y ${c.extra} documento(s) más que no entraron (máximo ${MAXDOCS} a la vez)`:
  `«${c.name}»: ${c.total?c.con+' de '+c.total+' páginas con texto'+(c.vac.length?' (sin texto: p. '+rangos(c.vac)+')':''):'documento sin páginas'}${c.viejo?' (leído con una versión vieja: pudo quedar incompleto)':''} · ${c.modo}${c.secs?' ('+c.ok+' de '+c.secs+' secciones'+(c.faltan.length?'; faltaron: '+c.faltan.join(', '):'')+')':''}${c.recorte?' · recortado para caber':''}`;

const _prep=window.medPrepare;
window.medPrepare=async q=>{ctx='';cob=[];
  let g=false;try{g=!!q&&q.length>=8&&await prepara(q);}catch(e){if(e?.name==='AbortError'){if(prog){prog.remove();prog=null;}throw e;}log('lectura completa: '+String(e.message).slice(0,60),'w');if(prog){prog.remove();prog=null;}ctx='';cob=[];}
  // con lectura completa no hacen falta los trozos sueltos (y se limpian los de la pregunta anterior)
  return _prep?_prep(g?'':q):undefined;};
const _prompt=window.medPrompt;
window.medPrompt=()=>(_prompt?_prompt():'')+(ctx?`

LECTURA COMPLETA DE LOS DOCUMENTOS DE ${(cfg.name||'Kiga').toUpperCase()} (te preguntó por el documento entero, no por un dato suelto)
Lo que se leyó: ${cob.map(cobTxt).join(' | ')}
Cómo contestar:
- Usa TODO el material de abajo, no solo el primer tema: recórrelo en el orden del documento y agrupa por temas.
- Prioriza lo de verdad importante (lo central del documento, criterios, tratamientos con dosis, cifras clave, complicaciones y alarmas) y pon la página en cada punto así, sin markdown: (nombre del documento, p. N).
- Para esto sí puedes extenderte (hasta unas 350 palabras), en viñetas cortas con guion.
- Si hubo páginas sin texto, secciones que no se pudieron leer o recortes, dilo en una línea al final. Nunca digas que cubriste todo si la lectura no fue completa.
=== MATERIAL ===
${ctx}`:'');
const _after=window.medAfter;
window.medAfter=()=>{_after?.();if(!cob.length)return;
  const el=line('s med','📖 lectura completa: '+cob.map(cobTxt).join(' · ')+'  —  toca aquí para ver el texto leído');
  const m=(window.medActivos?.()||[]).find(x=>x.name===cob[0].name),b=!m&&(window.bibActivos?.()||[]).find(x=>x.name===cob[0].name),d=m||b;
  if(d){el.style.cursor='pointer';el.onclick=()=>window.verLectura(m?'med':'bib',d.id);}
  ctx='';cob=[];};
window.__lecTest={objetivos,secciones,nombra,estado};
})();
