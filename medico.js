// ================= RESERVORIO MÉDICO =================
// Tus libros y guías médicas se guardan solo en este navegador (IndexedDB «capri-medico»), partidos en trozos.
// Antes de cada respuesta Capri busca los trozos que tienen que ver con la pregunta (BM25) y solo esos se le mandan
// a Gemini, con libro y página para que los cite. Si está activado, también consulta MedlinePlus y PubMed en línea.
// Nada de esto se sube al repo: el repo es público y los libros tienen derechos de autor.
(()=>{
const MED_DB='capri-medico',CHUNK=1100,OVER=180,TOPK=6,ONLINE_MS=2500;
const SALUD=/salud|m[eé]dic|enferm|s[ií]ntom|dolor|duele|fiebre|tos\b|gripa|gripe|infecci|presi[oó]n|az[uú]car|diabet|coraz[oó]n|pulm[oó]n|est[oó]mago|h[ií]gado|ri[ñn][oó]n|cerebr|nervi|hueso|m[uú]scul|piel|sangr|herida|quemad|alergi|medicament|pastilla|dosis|tratamiento|diagn[oó]st|v[oó]mit|diarrea|mareo|embaraz|vacun|virus|bacteri|c[aá]ncer|tumor|ansiedad|depresi|sue[ñn]o|insomnio|nutrici|dieta|anatom|fisiolog|patolog|farmac|cl[ií]nic|hospital|urgenci|sistema|[oó]rgano|c[eé]lula|hormona|tiroides|sindrome|síndrome/i;
let mdb=null,libros=[],trozos=[],idx=null,ctx=null,fuentes=[];
const med=Object.assign({on:false,online:true},store.get('med',{}));
const saveMed=()=>store.set('med',med);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- base de datos ----------
function mOpen(){return new Promise(res=>{try{const r=indexedDB.open(MED_DB,1);
  r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('libros',{keyPath:'id'});d.createObjectStore('trozos',{keyPath:'id'}).createIndex('libro','libro');};
  r.onsuccess=()=>{mdb=r.result;res();};r.onerror=()=>res();}catch(e){res();}});}
const mAll=s=>new Promise(res=>{if(!mdb)return res([]);const t=mdb.transaction(s).objectStore(s).getAll();t.onsuccess=()=>res(t.result||[]);t.onerror=()=>res([]);});
const mTx=(fn)=>new Promise(res=>{if(!mdb)return res();const t=mdb.transaction(['libros','trozos'],'readwrite');fn(t.objectStore('libros'),t.objectStore('trozos'));t.oncomplete=res;t.onerror=res;});
async function mLoad(){libros=(await mAll('libros')).sort((a,b)=>a.added-b.added);trozos=await mAll('trozos');idx=null;dispatchEvent(new Event('med:libros'));}
// para el holograma del HUD: el texto de cada material, para saber de qué parte del cuerpo habla
window.medTextos=()=>libros.map(l=>({id:l.id,name:l.name,active:l.active,text:trozos.filter(t=>t.libro===l.id).map(t=>t.text).join(' ')}));
async function mDel(id){await mTx((L,T)=>{L.delete(id);const r=T.index('libro').openKeyCursor(IDBKeyRange.only(id));r.onsuccess=()=>{const c=r.result;if(c){T.delete(c.primaryKey);c.continue();}};});await mLoad();}

// ---------- texto → palabras ----------
const STOP=new Set(('de la que el en los del se las por un para con una su al lo como mas pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mi antes algunos que unos yo otro otras otra el tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mis tu te ti tus ellas es son fue ser ha han era puede pueden tiene tienen hacer the of and to in is are for with on by as at from or an be this that which it its was were not no can may into than also has have been se le lo da dar dame dime explica explicame quiero saber sabes cual cuales como que es son porque sirve tengo tiene siento capri trata tratan hace hacen pasa significa quiere dice dicen bueno malo cosa cosas').split(' '));
function words(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').match(/[a-zñ0-9]{3,}/g)?.filter(w=>!STOP.has(w)).map(stem)||[];}
function stem(w){if(/^\d+$/.test(w))return w;if(w.length>5&&w.endsWith('es'))w=w.slice(0,-2);else if(w.length>4&&w.endsWith('s'))w=w.slice(0,-1);return w.length>6?w.slice(0,6):w;}

// ---------- índice BM25 (se arma al primer uso y cuando cambian los libros) ----------
function buildIdx(){const act=new Set(libros.filter(l=>l.active).map(l=>l.id));const docs=[],df=new Map();let tot=0;
  for(const t of trozos){if(!act.has(t.libro))continue;const tf=new Map();const ws=words(t.text);for(const w of ws)tf.set(w,(tf.get(w)||0)+1);
    for(const w of tf.keys())df.set(w,(df.get(w)||0)+1);docs.push({t,tf,len:ws.length});tot+=ws.length;}
  idx={docs,df,avg:tot/Math.max(1,docs.length),n:docs.length};}
function search(q,k=TOPK){if(!idx)buildIdx();const qs=[...new Set(words(q))];if(!qs.length||!idx.n)return [];const K1=1.4,B=.75;
  const out=[];for(const d of idx.docs){let s=0,hit=0;for(const w of qs){const f=d.tf.get(w);if(!f)continue;hit++;const n=idx.df.get(w);
      const idf=Math.log(1+(idx.n-n+.5)/(n+.5));s+=idf*f*(K1+1)/(f+K1*(1-B+B*d.len/idx.avg));}
    if(s>0)out.push({t:d.t,s:s*(.6+.4*hit/qs.length)});}
  out.sort((a,b)=>b.s-a.s);const seen=new Set(),res=[];
  for(const o of out){if(o.s<out[0].s*.35)break;const key=o.t.libro+'|'+o.t.pag;if(seen.has(key))continue;seen.add(key);res.push(o);if(res.length>=k)break;}return res;}

// ---------- cargar libros ----------
function partir(text){const out=[];const pages=text.split(/\n?\[Página (\d+)\]\n/);
  const push=(txt,pag)=>{txt=txt.replace(/\s+/g,' ').trim();for(let i=0;i<txt.length;i+=CHUNK-OVER){const c=txt.slice(i,i+CHUNK);if(c.length>30)out.push({pag,text:c});if(i+CHUNK>=txt.length)break;}};
  if(pages.length>1){for(let i=1;i<pages.length;i+=2)push(pages[i+1]||'',+pages[i]);}else push(text,null);return out;}
const IMG=/^(jpe?g|png|webp|heic|heif)$/,MIME={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',pdf:'application/pdf'};
// Apuntes a mano, fotos o PDF escaneado: Gemini los pasa a texto una sola vez y desde ahí se buscan sin gastar nada.
async function transcribir(buf,mime,varias){if(!cfg.key||!cfg.model)throw new Error('para leer fotos o escaneos primero conecta tu API key en ⚙.');
  const r=await fetch(API+'models/'+encodeURIComponent(cfg.model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cfg.key},
    body:JSON.stringify({contents:[{role:'user',parts:[{inlineData:{mimeType:mime,data:b64(buf)}},{text:'Transcribe fielmente el texto de estos apuntes o páginas (pueden ser a mano). No resumas ni corrijas el contenido; respeta términos médicos, dosis y abreviaturas. Describe en una línea entre corchetes los esquemas o dibujos. '+(varias?'Antes de cada página escribe [Página N] en su propia línea. ':'')+'Devuelve solo el texto.'}]}],generationConfig:{temperature:0,maxOutputTokens:32768}})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error?.message||('Error '+r.status));
  return (j.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&p.text).map(p=>p.text).join('').trim();}
async function guardar(nombre,file,text){const id='m'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  const ps=partir(text);if(ps.reduce((s,p)=>s+p.text.length,0)<80)throw new Error('no trae texto que pueda leer.');
  await mTx((L,T)=>{L.put({id,name:nombre,file,active:true,trozos:ps.length,pags:ps.length&&ps[ps.length-1].pag,chars:text.length,added:Date.now()});
    ps.forEach((p,i)=>T.put({id:id+'_'+i,libro:id,nombre,pag:p.pag,text:p.text}));});
  log('reservorio médico: '+nombre+' ('+ps.length+' trozos)','y');}
async function addLibros(files){const box=$('medDocs');const ext=f=>f.name.split('.').pop().toLowerCase();
  const fotos=files.filter(f=>IMG.test(ext(f)));files=files.filter(f=>!IMG.test(ext(f)));
  for(const f of files){const row=document.createElement('small');row.textContent='Leyendo '+f.name+'… (los libros grandes tardan un poco)';box.appendChild(row);
    try{const buf=await f.arrayBuffer(),e=ext(f);let text='';
      if(e==='pdf'){text=await pdfText(buf.slice(0));
        if(text.replace(/\[Página \d+\]/g,'').trim().length<200){if(f.size>18e6)throw new Error('es un PDF escaneado de más de 18 MB; pártelo en pedazos más chicos.');
          row.textContent='Pasando a texto '+f.name+' (escaneado)…';text=await transcribir(buf,MIME.pdf,true);}}
      else if(e==='docx')text=await docxText(buf);else text=new TextDecoder().decode(buf);
      await guardar(f.name.replace(/\.[^.]+$/,''),f.name,text);}
    catch(e){alert('No pude leer '+f.name+': '+e.message);}row.remove();}
  if(fotos.length){ // varias fotos juntas = un cuaderno, cada foto es una página
    fotos.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));const row=document.createElement('small');box.appendChild(row);let text='';
    try{for(let i=0;i<fotos.length;i++){row.textContent=`Pasando tus apuntes a texto… foto ${i+1} de ${fotos.length}`;
        text+=`\n[Página ${i+1}]\n`+await transcribir(await fotos[i].arrayBuffer(),MIME[ext(fotos[i])],false);}
      const nombre=fotos.length>1?'Apuntes '+new Date().toLocaleDateString('es-MX',{day:'numeric',month:'short'}):fotos[0].name.replace(/\.[^.]+$/,'');
      await guardar(nombre,fotos.map(f=>f.name).join(', '),text);}
    catch(e){alert('No pude leer tus fotos: '+e.message);}row.remove();}
  await mLoad();render();}

// ---------- fuentes en línea (solo verificadas) ----------
function withTimeout(p,ms){return Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);}
async function medlineplus(q){ // MedlinePlus en español (Biblioteca Nacional de Medicina de EE. UU.)
  const r=await fetch('https://wsearch.nlm.nih.gov/ws/query?db=healthTopicsSpanish&retmax=2&term='+encodeURIComponent(q));if(!r.ok)return [];
  const x=new DOMParser().parseFromString(await r.text(),'text/xml');
  return [...x.querySelectorAll('document')].map(d=>{const g=n=>[...d.querySelectorAll(`content[name="${n}"]`)].map(c=>c.textContent).join(' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
    return {nombre:'MedlinePlus: '+g('title'),url:d.getAttribute('url'),text:(g('FullSummary')||g('snippet')).slice(0,1600)};}).filter(d=>d.text);}
async function pubmed(q){ // PubMed (resúmenes de artículos revisados por pares; casi todos en inglés)
  const E='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const s=await (await fetch(E+'esearch.fcgi?db=pubmed&retmode=json&retmax=2&sort=relevance&term='+encodeURIComponent(q+' AND (review[pt] OR guideline[pt])'))).json();
  const ids=s.esearchresult?.idlist||[];if(!ids.length)return [];
  const t=await (await fetch(E+'efetch.fcgi?db=pubmed&rettype=abstract&retmode=text&id='+ids.join(','))).text();
  return t.split(/\n\n\n+/).map((a,i)=>({nombre:'PubMed PMID '+ids[i],url:'https://pubmed.ncbi.nlm.nih.gov/'+ids[i]+'/',text:a.replace(/\s+/g,' ').trim().slice(0,1600)})).filter(d=>d.text);}
async function enLinea(q){const got=await Promise.allSettled([withTimeout(medlineplus(q),ONLINE_MS),withTimeout(pubmed(q),ONLINE_MS)]);
  const out=[];got.forEach((g,i)=>{if(g.status==='fulfilled')out.push(...g.value);else log((i?'PubMed':'MedlinePlus')+' no respondió','w');});return out;}

// ---------- lo que se le manda a Capri ----------
window.medPrepare=async(q)=>{ctx=null;fuentes=[];if(!med.on||!q||q.length<4)return;const t0=performance.now();
  if(SALUD.test(q))dispatchEvent(new CustomEvent('med:pregunta',{detail:q}));
  const loc=search(q);const fuerte=loc.length&&loc[0].s>4;
  // solo busca en línea si la pregunta suena a salud: así un "hola" no espera a MedlinePlus/PubMed
  const onl=med.online&&!fuerte&&SALUD.test(q)?await enLinea(q).catch(()=>[]):[];
  fuentes=[...loc.map(o=>({nombre:o.t.nombre,pag:o.t.pag,text:o.t.text})),...onl];
  if(fuentes.length)log('reservorio: '+fuentes.length+' fuente(s) en '+Math.round(performance.now()-t0)+' ms','g');
  ctx=fuentes.map((f,i)=>`[F${i+1}] ${f.nombre}${f.pag?', p. '+f.pag:''}${f.url?' ('+f.url+')':''}\n${f.text}`).join('\n\n');};
window.medPrompt=()=>{if(!med.on)return '';return `

RESERVORIO MÉDICO ACTIVO
Cuando la plática sea de salud o medicina, apóyate primero en las fuentes de abajo (los libros de ${cfg.name||'Kiga'} y fuentes verificadas). Reglas:
- Cita en el texto, sin markdown, así: (Harrison, p. 245) o (MedlinePlus). Solo cita lo que sí viene en las fuentes.
- Si las fuentes no lo cubren, dilo en corto y contesta con lo que sabes marcándolo como conocimiento general, sin inventar dosis, cifras ni referencias.
- No das diagnósticos ni recetas para una persona en concreto; explicas, orientas y dices qué especialista o estudio conviene.
- Si te describen algo que suena a urgencia (dolor de pecho, falta de aire, desmayo, sangrado fuerte, signos de infarto o derrame, ideas de hacerse daño), lo primero es decirle que vaya a urgencias o llame al 911.
- Sigues siendo tú: mismo tono y personalidad. No sermonees ni repitas advertencias; con una frase al final basta cuando hablen de su propia salud.
${ctx?'\n=== FUENTES PARA ESTA PREGUNTA ===\n'+ctx:''}`;};
// para el núcleo de certeza: buscar fuentes para verificar o para que Capri estudie sola (tus apuntes primero, luego en línea)
window.medBuscar=async(q)=>{if(!mdb)await mOpen();if(!trozos.length)await mLoad();const loc=search(q,3).map(o=>({nombre:o.t.nombre,pag:o.t.pag,text:o.t.text}));
  const onl=navigator.onLine?await enLinea(q).catch(()=>[]):[];return [...loc,...onl];};
window.medAfter=()=>{if(!med.on||!fuentes.length)return;
  const ls=fuentes.map(f=>f.nombre+(f.pag?' p. '+f.pag:'')).filter((v,i,a)=>a.indexOf(v)===i);
  line('s med','⚕ fuentes consultadas: '+ls.join(' · ')+'  —  info educativa, no sustituye la consulta con tu médico.');};

// ---------- ventana ----------
const css=document.createElement('style');css.textContent=`#medModal .src{display:flex;flex-wrap:wrap;gap:6px}#medModal .src a{font:12px var(--mono);color:var(--grn);border:1px solid #2a2733;padding:4px 8px;text-decoration:none}
#medModal .src a:hover{border-color:var(--grn)}div.s.med{color:var(--grn);opacity:.85}`;document.head.appendChild(css);
const modal=document.createElement('div');modal.className='modal';modal.id='medModal';modal.innerHTML=`<div class="panel"><div>
  <h2>⚕ Reservorio médico</h2>
  <small>Sube tus apuntes, guías y libros de medicina: PDF, Word, TXT o fotos de tus apuntes a mano (Capri las pasa a texto una vez con tu key de Google; varias fotos juntas quedan como un cuaderno). Se quedan <b>solo en este navegador</b>. Capri busca en ellos los pedazos que tienen que ver con lo que preguntas y te cita libro y página.</small>
  <div class="drop" id="medDrop">Arrastra apuntes o libros aquí, o haz clic para elegir<br><small>PDF · DOCX · TXT · MD · fotos de tus apuntes (JPG/PNG)</small></div>
  <input type="file" id="medFile" multiple accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*" style="display:none">
  <div id="medDocs"></div><small id="medTotal"></small>
  <label class="ck"><input type="checkbox" id="medOn"> Reservorio activo (Capri lo consulta en temas de salud)</label>
  <label class="ck"><input type="checkbox" id="medOnline"> Si no viene en mis libros, buscar en MedlinePlus y PubMed</label>
  <h3>Fuentes abiertas y verificadas para descargar</h3>
  <div class="src">
   <a href="https://medlineplus.gov/spanish/" target="_blank" rel="noopener">MedlinePlus español</a>
   <a href="https://www.cenetec-difusion.com/gpc-sns/" target="_blank" rel="noopener">Guías de Práctica Clínica (CENETEC)</a>
   <a href="https://www.imss.gob.mx/guias_practicaclinica" target="_blank" rel="noopener">GPC IMSS</a>
   <a href="https://www.who.int/es/publications" target="_blank" rel="noopener">OMS publicaciones</a>
   <a href="https://www.paho.org/es/documentos" target="_blank" rel="noopener">OPS documentos</a>
   <a href="https://www.cdc.gov/spanish/" target="_blank" rel="noopener">CDC en español</a>
   <a href="https://www.ncbi.nlm.nih.gov/books/" target="_blank" rel="noopener">NCBI Bookshelf (StatPearls)</a>
  </div>
  <small>Ideas: «según mis apuntes, ¿cómo se maneja la cetoacidosis?», «hazme un quiz de mis apuntes de tiroides», «tengo gripa desde hace 3 días, ¿qué me conviene?». Capri explica y te ayuda a estudiar; no sustituye a tu médico.</small>
  <div class="row"><button class="btn" id="medClose">Listo</button></div>
</div></div>`;document.body.appendChild(modal);
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});
function render(){const box=$('medDocs');
  box.innerHTML=libros.map(l=>`<div class="doc"><input type="checkbox" data-id="${l.id}" ${l.active?'checked':''}><span class="nm" title="${esc(l.file)}">${esc(l.name)}</span><span class="sz">${l.pags?l.pags+' pág':l.trozos+' trozos'}</span><button data-del="${l.id}" title="Quitar">✕</button></div>`).join('')||'<small>Aún no hay libros en el reservorio.</small>';
  const act=libros.filter(l=>l.active);$('medTotal').textContent=act.length?`Activos: ${act.length} · ${act.reduce((s,l)=>s+l.trozos,0)} trozos buscables · a Capri solo le llegan ~${TOPK} por pregunta`:'';
  box.querySelectorAll('input[data-id]').forEach(c=>c.onchange=async()=>{const l=libros.find(x=>x.id===c.dataset.id);l.active=c.checked;await mTx(L=>L.put(l));idx=null;render();});
  box.querySelectorAll('button[data-del]').forEach(b=>b.onclick=async()=>{const l=libros.find(x=>x.id===b.dataset.del);if(confirm('¿Quitar «'+l.name+'» del reservorio?')){await mDel(l.id);render();}});
  $('medOn').checked=med.on;$('medOnline').checked=med.online;$('bMed')?.classList.toggle('act',med.on);}
window.openMed=async()=>{await mLoad();render();modal.classList.add('show');};
$('medDrop').onclick=()=>$('medFile').click();$('medFile').onchange=e=>{addLibros([...e.target.files]);e.target.value='';};
$('medDrop').ondragover=e=>{e.preventDefault();$('medDrop').classList.add('over');};$('medDrop').ondragleave=()=>$('medDrop').classList.remove('over');
$('medDrop').ondrop=e=>{e.preventDefault();$('medDrop').classList.remove('over');addLibros([...e.dataTransfer.files]);};
$('medOn').onchange=()=>{med.on=$('medOn').checked;saveMed();render();};$('medOnline').onchange=()=>{med.online=$('medOnline').checked;saveMed();};
$('medClose').onclick=()=>{modal.classList.remove('show');if(med.on){line('s','(⚕ Reservorio médico activo: '+libros.filter(l=>l.active).length+' libro(s)'+(med.online?' + MedlinePlus/PubMed':'')+'.)');setState('emocionada');}};

// botón en el dock, junto a ESTUDIO
const b=document.createElement('button');b.className='btn';b.id='bMed';b.title='Reservorio médico';b.innerHTML='<span class="gl">'+(typeof ico==='function'?ico('medico'):'⚕')+'</span><span class="tx">MÉDICO</span>';
$('bStudy').after(b);b.onclick=openMed;b.classList.toggle('act',med.on);
mOpen().then(mLoad);
})();
