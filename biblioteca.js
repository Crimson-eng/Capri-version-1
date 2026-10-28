// ================= BIBLIOTECA =================
// Pestaña BIBLIOTECA del HUD: le metes documentos de casi cualquier formato y Capri los lee una vez, los parte en trozos
// y los guarda en este dispositivo (IndexedDB «capri-biblioteca»). Cuando le preguntas algo, busca los trozos que vienen
// al caso (BM25, como el reservorio médico) y se los pasa al cerebro con nombre y página para que cite.
// Formatos: PDF (también escaneados), Word (.docx y .doc viejo), OpenDocument (.odt .ods .odp), PowerPoint (.pptx),
// Excel (.xlsx .xls .csv), RTF, EPUB, HTML, texto/Markdown/JSON/código e imágenes o fotos de apuntes (las lee Capri en tu PC, o Gemini si lo eliges).
// Los lectores viajan con Capri en vendor/lectores, así abren sin internet. Nada de esto se sube al repo.
(()=>{
const DB='capri-biblioteca',CHUNK=1100,OVER=160,TOPK=7;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bib=Object.assign({on:true,estante:'Todo'},store.get('bib',{}));const saveB=()=>store.set('bib',bib);
const ESTANTES=['Medicina','Estudio','Formatos','Inglés','Informática','General'];
const ext=n=>(String(n).match(/\.([^.]+)$/)?.[1]||'').toLowerCase();
const TIPOS={pdf:'PDF',docx:'Word',docm:'Word',dotx:'Word',doc:'Word 97-2003',odt:'OpenDocument',ott:'OpenDocument',odp:'Presentación',ods:'Hoja de cálculo',pptx:'PowerPoint',ppsx:'PowerPoint',
 xlsx:'Excel',xlsm:'Excel',xls:'Excel 97-2003',csv:'CSV',tsv:'TSV',rtf:'RTF',epub:'EPUB',html:'HTML',htm:'HTML',xml:'XML',txt:'Texto',md:'Markdown',json:'JSON',
 jpg:'Foto',jpeg:'Foto',png:'Imagen',webp:'Imagen',gif:'Imagen',bmp:'Imagen',heic:'Foto',heif:'Foto'};
const ACEPTA='.pdf,.docx,.docm,.dotx,.doc,.odt,.ott,.odp,.ods,.pptx,.ppsx,.xlsx,.xlsm,.xls,.csv,.tsv,.rtf,.epub,.html,.htm,.xml,.txt,.md,.json,.log,.js,.py,.c,.cpp,.java,.sql,.yaml,.yml,.ini,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';
const IMG=/^(jpe?g|png|webp|gif|bmp|heic|heif)$/;

// ---------- lectores ----------
async function cargaLib(f,cdn,g){if(window[g])return;try{await loadScript('vendor/lectores/'+f);}catch(e){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/'+cdn);}}
const zip=async buf=>{await cargaLib('jszip.min.js','jszip/3.10.1/jszip.min.js','JSZip');return JSZip.loadAsync(buf);};
const xmlTxt=x=>x.replace(/<\/(?:text:p|text:h|w:p|a:p|p|div|h\d|li|tr|br)>|<(?:text:line-break|br)\s*\/?>/g,'\n').replace(/<text:tab\/>|<\/td>/g,'\t').replace(/<[^>]+>/g,'')
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&amp;/g,'&');
function texto(buf){const u=new Uint8Array(buf);if(u[0]===0xFF&&u[1]===0xFE)return new TextDecoder('utf-16le').decode(u);if(u[0]===0xFE&&u[1]===0xFF)return new TextDecoder('utf-16be').decode(u);
  try{return new TextDecoder('utf-8',{fatal:true}).decode(u);}catch(e){return new TextDecoder('windows-1252').decode(u);}}
const LEER={
 pdf:(buf,f,av)=>pdfLeer(buf.slice(0),av),   // página por página: las que vienen escaneadas pasan solas por el lector (ver index.html)
 docx:buf=>docxText(buf),
 doc:async buf=>{ // Word 97-2003: el texto se saca de la tabla de piezas del archivo (con el lector CFB de SheetJS); si falla, se rescata lo legible
   try{const t=await docBinario(buf);if(t.replace(/\s/g,'').length>=20)return t;}catch(e){}
   const LAT=/[A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9.,;:¿?¡!()%\/\-'" ]{12,}/g,u=new Uint8Array(buf);
   const a=(new TextDecoder('utf-16le').decode(u).match(LAT)||[]).join('\n'),b=(new TextDecoder('windows-1252').decode(u).match(LAT)||[]).join('\n');
   const t=(a.length>b.length?a:b).replace(/[ \t]{2,}/g,' ').trim();if(t.length<80)throw new Error('no pude sacar texto de este .doc viejo; guárdalo como .docx o PDF.');return t;},
 odt:async buf=>{const z=await zip(buf);return xmlTxt(await z.file('content.xml').async('string'));},
 odp:async buf=>{const z=await zip(buf),x=await z.file('content.xml').async('string');return x.split(/<draw:page\b/).slice(1).map((p,i)=>`[Página ${i+1}]\n`+xmlTxt('<x '+p)).join('\n');},
 pptx:async buf=>{const z=await zip(buf),n=f=>+f.match(/(\d+)\.xml$/)[1];
   const sl=Object.keys(z.files).filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a,b)=>n(a)-n(b));let out='';
   for(const f of sl){const x=await z.file(f).async('string');const nt=z.file('ppt/notesSlides/notesSlide'+n(f)+'.xml');
     out+=`\n[Página ${n(f)}]\n`+(x.match(/<a:t>[^<]*<\/a:t>|<\/a:p>/g)||[]).map(t=>t==='</a:p>'?'\n':xmlTxt(t)).join('').trim();
     if(nt){const y=(await nt.async('string')).match(/<a:t>[^<]*<\/a:t>/g)||[];if(y.length)out+='\n(Notas: '+y.map(xmlTxt).join(' ')+')';}}
   return out.trim();},
 xlsx:async buf=>{await cargaLib('xlsx.full.min.js','xlsx/0.18.5/xlsx.full.min.js','XLSX');const wb=XLSX.read(buf,{type:'array'});
   const rec=[],text=wb.SheetNames.map((n,i)=>{const c=XLSX.utils.sheet_to_csv(wb.Sheets[n],{blankrows:false});if(c.length>2e6)rec.push(n);return `[Página ${i+1}]\nHoja «${n}»\n`+c.slice(0,2e6);}).join('\n');
   return {text,inf:informeTexto(text,rec.length?{recortado:'hojas muy grandes, solo los primeros 2 millones de caracteres: '+rec.join(', ')}:{})};},
 rtf:buf=>{let s=new TextDecoder('windows-1252').decode(new Uint8Array(buf));
   s=s.replace(/\{\\\*[^{}]*(\{[^{}]*\}[^{}]*)*\}/g,'').replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict)[\s\S]*?\}\s*\}/g,'')
    .replace(/\\'([0-9a-f]{2})/gi,(_,h)=>new TextDecoder('windows-1252').decode(new Uint8Array([parseInt(h,16)]))).replace(/\\u(-?\d+)\??/g,(_,n)=>String.fromCharCode(n<0?65536+ +n:+n))
    .replace(/\\(par|line)\b ?/g,'\n').replace(/\\tab\b ?/g,'\t').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'');return s.replace(/\n{3,}/g,'\n\n').trim();},
 epub:async buf=>{const z=await zip(buf),c=await z.file('META-INF/container.xml').async('string'),opf=c.match(/full-path="([^"]+)"/)[1],base=opf.replace(/[^/]*$/,'');
   const o=await z.file(opf).async('string'),man={};for(const m of o.matchAll(/<item\b[^>]*>/g)){const id=m[0].match(/id="([^"]+)"/)?.[1],h=m[0].match(/href="([^"]+)"/)?.[1];if(id&&h)man[id]=h;}
   const sp=[...o.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map(m=>man[m[1]]).filter(Boolean);let out='',i=0;
   for(const h of sp){const f=z.file(base+decodeURIComponent(h));if(!f)continue;const t=html(await f.async('string'));if(t.trim())out+=`\n[Página ${++i}]\n`+t;}return out.trim();},
 html:buf=>html(texto(buf)),
 json:buf=>{const t=texto(buf);try{return JSON.stringify(JSON.parse(t),null,1);}catch(e){return t;}},
 txt:buf=>texto(buf),
};
Object.assign(LEER,{docm:LEER.docx,dotx:LEER.docx,ott:LEER.odt,ods:LEER.xlsx,ppsx:LEER.pptx,xlsm:LEER.xlsx,xls:LEER.xlsx,csv:LEER.xlsx,tsv:LEER.txt,htm:LEER.html,xml:LEER.html});
async function docBinario(buf){await cargaLib('xlsx.full.min.js','xlsx/0.18.5/xlsx.full.min.js','XLSX');
  const cf=XLSX.CFB.read(new Uint8Array(buf),{type:'array'}),get=n=>{const e=XLSX.CFB.find(cf,n);return e&&new Uint8Array(e.content);};
  const W=get('WordDocument');if(!W)throw new Error('sin WordDocument');const dv=new DataView(W.buffer,W.byteOffset,W.byteLength);
  if(dv.getUint16(0,true)!==0xA5EC)throw new Error('no es Word 97');const T=get((dv.getUint16(0x0A,true)&0x0200)?'1Table':'0Table');
  const fc=dv.getUint32(0x01A2,true),lcb=dv.getUint32(0x01A6,true);if(!T||!lcb)throw new Error('sin tabla de piezas');
  const tv=new DataView(T.buffer,T.byteOffset,T.byteLength);let i=fc;
  while(T[i]===1)i+=3+tv.getUint16(i+1,true);   // se saltan los Prc
  if(T[i]!==2)throw new Error('Clx raro');const len=tv.getUint32(i+1,true),p0=i+5,n=(len-4)/12;let out='';
  const w1252=new TextDecoder('windows-1252'),u16=new TextDecoder('utf-16le');
  for(let k=0;k<n;k++){const a=tv.getUint32(p0+k*4,true),b=tv.getUint32(p0+(k+1)*4,true),pcd=p0+(n+1)*4+k*8;let f=tv.getUint32(pcd+2,true);
    const comp=!!(f&0x40000000);f&=0x3FFFFFFF;const cs=b-a;
    out+=comp?w1252.decode(W.subarray(f/2,f/2+cs)):u16.decode(W.subarray(f,f+cs*2));}
  return out.replace(/\r/g,'\n').replace(/\x07/g,'\t').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/\x13[^\x14\x15]*\x14?|\x15/g,'').replace(/\n{3,}/g,'\n\n').trim();}
function html(s){const d=new DOMParser().parseFromString(s,/^\s*<\?xml/.test(s)&&!/<html/i.test(s)?'text/xml':'text/html');d.querySelectorAll('script,style,noscript').forEach(e=>e.remove());
  d.querySelectorAll('p,div,br,li,h1,h2,h3,h4,h5,h6,tr,section,article').forEach(e=>e.append('\n'));return (d.body||d.documentElement).textContent.replace(/[ \t]+/g,' ').replace(/\n\s*\n\s*\n+/g,'\n\n').trim();}
// fotos y escaneos: se pasan a texto una sola vez y desde ahí se buscan sin gastar nada.
// De entrada con el lector de Capri (Tesseract, en tu PC, sin internet; ver rip.js); con Gemini si lo eliges en R.I.P (mejor con letra a mano).
async function ocrElige(buf,mime,av,f){const gem=store.get('ripOcr','local')==='gemini'&&cfg.key&&cfg.model;
  if(!gem&&window.ocrLocal){const r=await window.ocrLocal(buf,mime,av);return r.text;}
  if(f&&f.size>18e6)throw new Error('es un escaneo de más de 18 MB; pártelo en pedazos.');av('Leyendo con Gemini…');return ocr(buf,mime);}
async function ocr(buf,mime){if(!cfg.key||!cfg.model)throw new Error('para leer imágenes o escaneos conecta tu API key de Gemini en ⚙.');
  const r=await fetch(API+'models/'+encodeURIComponent(cfg.model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cfg.key},
    body:JSON.stringify({contents:[{role:'user',parts:[{inlineData:{mimeType:mime,data:b64(buf)}},{text:'Transcribe fielmente todo el texto de este documento o imagen (puede ser a mano). No resumas ni corrijas; respeta términos técnicos, cifras y abreviaturas. Si es un PDF de varias páginas, antes de cada página escribe [Página N]. Si hay tablas, escríbelas en filas. Si es una foto sin texto, descríbela en dos líneas.'}]}],generationConfig:{temperature:0}})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error?.message||('Error '+r.status));
  return (j.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&p.text).map(p=>p.text).join('').trim();}
const MIME={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',heic:'image/heic',heif:'image/heif'};
// devuelve {t: texto con [Página N], inf: informe de lectura (páginas totales, vacías, leídas con OCR)}
async function leerX(f,av=()=>{}){const e=ext(f.name),buf=await f.arrayBuffer();
  if(IMG.test(e)){av('Leyendo la imagen…');const t=String(await ocrElige(buf,MIME[e],av,f)||'').trim();if(t.length<20)throw new Error('no trae texto que pueda leer.');
    return {t,inf:{v:1,total:1,conTexto:1,vacias:[],ocr:[1],metodo:store.get('ripOcr','local')==='gemini'&&cfg.key?'gemini':'ocr',fecha:Date.now()}};}
  const fn=LEER[e]||(f.type.startsWith('text/')||!e||buf.byteLength<5e6&&!/[\x00-\x08]/.test(texto(buf.slice(0,4000)))?LEER.txt:null);
  if(!fn)throw new Error('ese formato ('+(e||'sin extensión')+') todavía no lo sé leer.');
  const r=await fn(buf,f,av),t=String((r&&typeof r==='object'?r.text:r)||'').replace(/\r/g,'').trim();
  if(t.replace(/\[Página \d+\]/g,'').trim().length<20)throw new Error(r?.inf?.total?'sus '+r.inf.total+' páginas no traen texto que pueda leer'+(r.inf.err?' ('+r.inf.err+')':'')+'.':'no trae texto que pueda leer.');
  return {t,inf:r&&typeof r==='object'&&r.inf||informeTexto(t)};}
const leer=async(f,av)=>(await leerX(f,av)).t;
window.bibLeer=f=>leer(f);

// ---------- base de datos ----------
let bdb=null,docs=[],trozos=[],idx=null,ctx='',fuentes=[];
const open=()=>bdb?Promise.resolve():new Promise(res=>{try{const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('docs',{keyPath:'id'});d.createObjectStore('trozos',{keyPath:'id'}).createIndex('doc','doc');};
  r.onsuccess=()=>{bdb=r.result;res();};r.onerror=()=>res();}catch(e){res();}});
const all=s=>new Promise(res=>{if(!bdb)return res([]);const t=bdb.transaction(s).objectStore(s).getAll();t.onsuccess=()=>res(t.result||[]);t.onerror=()=>res([]);});
const tx=fn=>new Promise((res,rej)=>{if(!bdb)return rej(new Error('no pude abrir la base de la biblioteca'));const t=bdb.transaction(['docs','trozos'],'readwrite');fn(t.objectStore('docs'),t.objectStore('trozos'));t.oncomplete=()=>res();
  t.onabort=t.onerror=()=>rej(new Error(/quota/i.test(t.error?.name||'')?'ya no cabe en el disco del navegador; quita documentos que no uses':'no se pudo guardar ('+(t.error?.name||'error')+')'));});   // antes un error aquí perdía el documento sin avisar
async function carga(){await open();docs=(await all('docs')).sort((a,b)=>b.added-a.added);trozos=await all('trozos');idx=null;}
async function borra(id){await tx((D,T)=>{D.delete(id);const r=T.index('doc').openKeyCursor(IDBKeyRange.only(id));r.onsuccess=()=>{const c=r.result;if(c){T.delete(c.primaryKey);c.continue();}};});await carga();}
const borraTrozos=id=>tx((D,T)=>{const r=T.index('doc').openKeyCursor(IDBKeyRange.only(id));r.onsuccess=()=>{const c=r.result;if(c){T.delete(c.primaryKey);c.continue();}};});
function partir(text){const out=[];const pages=text.split(/\n?\[Página (\d+)\]\n?/);
  const push=(t,pag)=>{t=t.replace(/[ \t]+/g,' ').replace(/\n{2,}/g,'\n').trim();for(let i=0;i<t.length;i+=CHUNK-OVER){const c=t.slice(i,i+CHUNK);if(c.trim().length>=10)out.push({pag,text:c});if(i+CHUNK>=t.length)break;}};
  if(pages.length>1){if(pages[0].trim())push(pages[0],null);for(let i=1;i<pages.length;i+=2)push(pages[i+1]||'',+pages[i]);}else push(text,null);return out;}
const ADIV={Medicina:/paciente|diagn[oó]st|cl[ií]nic|s[ií]ntoma|tratamiento|f[aá]rmaco|anatom|fisiolog|patolog|enfermedad|m[eé]dic/gi,Inglés:/\b(the|and|of|to|is|in|that|it|with|for)\b/gi,
 Informática:/c[oó]digo|programa|servidor|linux|windows|red\b|python|javascript|base de datos|algoritmo|archivo/gi,Formatos:/nombre del paciente|firma|c[eé]dula|expediente|folio|fecha de|_{5,}/gi};
function adivina(nombre,t){const s=(nombre+' '+t.slice(0,60000));let best='General',n=0;for(const [k,re] of Object.entries(ADIV)){const m=(s.match(re)||[]).length/(k==='Inglés'?6:1);if(m>n&&m>=8){n=m;best=k;}}return best;}
const avisoLectura=i=>!i?.total?'':i.vacias?.length?` · ⚠ ${i.conTexto} de ${i.total} páginas con texto (sin texto: ${rangos(i.vacias)})`:` · ${i.total} de ${i.total} páginas leídas`+(i.ocr?.length?` (${i.ocr.length} con OCR)`:'');
const rangos=window.rangosPag=ns=>{const o=[];for(let i=0;i<ns.length;i++){let j=i;while(j+1<ns.length&&ns[j+1]===ns[j]+1)j++;o.push(j>i?ns[i]+'–'+ns[j]:''+ns[i]);i=j;}return o.length>12?o.slice(0,12).join(', ')+'…':o.join(', ');};
// guarda (o reemplaza, si viene viejo) un documento ya leído
async function guardaDoc(f,t,inf,op={},viejo){const ps=partir(t),id=viejo?.id||'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),nombre=viejo?.name||f.name.replace(/\.[^.]+$/,'');
  const est=viejo?.estante||op.estante||(bib.estante&&bib.estante!=='Todo'?bib.estante:adivina(f.name,t));
  if(viejo)await borraTrozos(id);
  await tx((D,T)=>{D.put({...(viejo||{}),id,name:nombre,file:f.name,ext:ext(f.name),size:f.size,estante:est,active:viejo?viejo.active:true,chars:t.length,trozos:ps.length,pags:inf?.total||Math.max(0,...ps.map(p=>p.pag||0)),lectura:inf,added:viejo?.added||Date.now(),...(op.oficial?{oficial:op.oficial}:{})});
    ps.forEach((p,i)=>T.put({id:id+'_'+i,doc:id,nombre,pag:p.pag,text:p.text}));});
  if(!op.oficial)dispatchEvent(new CustomEvent('capri:apuntes',{detail:{src:'bib',id,nombre,texto:t}}));   // asocia.js: ¿se parece a algún paciente?
  return {id,ps};}
async function agregar(files,box,op={}){for(const f of files){const row=document.createElement('div');row.className='bb-prog';row.textContent='Leyendo '+f.name+'…';box?.prepend(row);
    try{const t0=performance.now(),{t,inf}=await leerX(f,m=>row.textContent=f.name+': '+m),{ps}=await guardaDoc(f,t,inf,op);
      log('biblioteca: '+f.name+' ('+ps.length+' trozos'+(inf?.total?', '+inf.conTexto+'/'+inf.total+' pág. con texto':'')+', '+Math.round(performance.now()-t0)+' ms)','y');
      if(inf?.vacias?.length){row.classList.add('err');row.textContent='⚠ '+f.name+': '+inf.vacias.length+' página(s) sin texto legible ('+rangos(inf.vacias)+'). Ábrelo y toca «Ver lectura» para revisarlo.';setTimeout(()=>row.remove(),12000);continue;}}
    catch(e){row.classList.add('err');row.textContent='✖ '+f.name+': '+e.message;setTimeout(()=>row.remove(),9000);continue;}row.remove();}
  await carga();render();op.listo?.();}

// ---------- búsqueda (BM25) ----------
const STOP=new Set(('de la que el en los del se las por un para con una su al lo como mas pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mi antes algunos unos yo otro otras otra the and of to in is for on that with are be this as'+
  // palabras de la pregunta que no dicen de qué tema es («según el documento, ¿qué es lo más importante?»): antes jalaban trozos al azar
  ' dime dame segun documento documentos archivo libro libros apuntes biblioteca reservorio importante importantes principal principales resumen resume resumeme completo toda toda dice explica explicame').split(' '));
const stem=w=>{if(/^\d+$/.test(w))return w;if(w.length>5&&w.endsWith('es'))w=w.slice(0,-2);else if(w.length>4&&w.endsWith('s'))w=w.slice(0,-1);return w.length>6?w.slice(0,6):w;};
const words=s=>(String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').match(/[a-zñ0-9]{3,}/g)||[]).filter(w=>!STOP.has(w)).map(stem);
function armar(){const act=new Set(docs.filter(d=>d.active).map(d=>d.id)),D=[],df=new Map();let tot=0;
  for(const t of trozos){if(!act.has(t.doc))continue;const tf=new Map(),ws=words(t.text);for(const w of ws)tf.set(w,(tf.get(w)||0)+1);for(const w of tf.keys())df.set(w,(df.get(w)||0)+1);D.push({t,tf,len:ws.length});tot+=ws.length;}
  idx={D,df,avg:tot/Math.max(1,D.length),n:D.length};}
function buscar(q,k=TOPK,soloDoc){if(!idx)armar();const qs=[...new Set(words(q))];if(!qs.length||!idx.n)return [];const out=[];
  for(const d of idx.D){if(soloDoc&&d.t.doc!==soloDoc)continue;let s=0,hit=0;for(const w of qs){const f=d.tf.get(w);if(!f)continue;hit++;const n=idx.df.get(w);s+=Math.log(1+(idx.n-n+.5)/(n+.5))*f*2.4/(f+1.4*(.25+.75*d.len/idx.avg));}
    if(s>0)out.push({t:d.t,s:s*(.6+.4*hit/qs.length),cov:hit/qs.length});}
  out.sort((a,b)=>b.s-a.s);const seen=new Set(),res=[];for(const o of out){if(o.s<out[0].s*.4)break;const key=o.t.doc+'|'+o.t.pag;if(seen.has(key))continue;seen.add(key);res.push(o);if(res.length>=k)break;}return res;}

// ---------- lo que se le pasa a Capri ----------
let foco=null; // documento del que estás platicando ahora
async function prepara(q){ctx='';fuentes=[];if(!bib.on||!q||q.length<4||!docs.some(d=>d.active))return;const t0=performance.now();
  // solo pasan trozos que de verdad vienen al caso: un «hola» no carga nada y no hace más lenta la respuesta
  // las fuentes oficiales (GPC, NOM, Compendio) las cita R.I.P aparte, con su clave y año
  const ofi=new Set(docs.filter(d=>d.oficial).map(d=>d.id));const r=buscar(q,TOPK*2,foco?.id).filter(o=>foco||!ofi.has(o.t.doc)).slice(0,TOPK);const fuerte=r.filter(o=>foco?o.s>.8:o.s>1.6&&o.cov>=.34);if(!fuerte.length)return;
  fuentes=fuerte.map(o=>({nombre:o.t.nombre,pag:o.t.pag,text:o.t.text}));
  ctx=fuentes.map((f,i)=>`[B${i+1}] ${f.nombre}${f.pag?', p. '+f.pag:''}\n${f.text}`).join('\n\n');log('biblioteca: '+fuentes.length+' trozo(s) en '+Math.round(performance.now()-t0)+' ms','g');}
const _prep=window.medPrepare;window.medPrepare=async q=>{await Promise.all([_prep?_prep(q):null,prepara(q).catch(()=>{})]);};  // en paralelo: no suma espera
const _prompt=window.medPrompt;window.medPrompt=()=>(_prompt?_prompt():'')+(ctx?`

BIBLIOTECA DE ${(cfg.name||'Kiga').toUpperCase()}${foco?' (está platicando contigo del documento «'+foco.name+'»)':''}
Si la pregunta tiene que ver con estos trozos de sus documentos, apóyate en ellos y cita así, sin markdown: (nombre del documento, p. N). Si no vienen al caso, ignóralos sin mencionarlos. No inventes lo que no dicen. Son solo algunos trozos, no el documento entero: no los presentes como resumen completo.
${ctx}`:'');
const _after=window.medAfter;window.medAfter=()=>{_after?.();if(!fuentes.length)return;
  line('s med','📚 de tu biblioteca: '+[...new Set(fuentes.map(f=>f.nombre+(f.pag?' p. '+f.pag:'')))].join(' · '));fuentes=[];};

// ---------- sección BIBLIOTECA ----------
const css=document.createElement('style');css.textContent=`
#vBib{padding:18px 22px}.bb{display:grid;grid-template-columns:190px 1fr minmax(260px,360px);gap:18px;min-height:100%;font:13px/1.5 var(--mono);color:#ffd9dc}
.bb h3{font:600 15px/1 var(--sans);letter-spacing:.1em;color:var(--hr);margin:0;text-transform:uppercase}.bb .sub{font:10px var(--mono);letter-spacing:.2em;color:#a0565e;text-transform:uppercase}
.bb .est{display:flex;flex-direction:column;gap:3px}.bb .est button{background:none;border:0;border-left:2px solid #3b1418;color:#ffd9dc;text-align:left;padding:7px 10px;font:12px var(--mono);cursor:pointer;display:flex;justify-content:space-between}
.bb .est button:hover{border-color:var(--hr)}.bb .est button.on{border-color:var(--hc);color:var(--hc);background:rgba(94,246,255,.06)}.bb .est b{color:#a0565e;font-weight:400}
.bb .drop{border:1px dashed var(--hr2);padding:20px;text-align:center;cursor:pointer;color:#c98d93;background:rgba(255,77,94,.03);transition:.15s}.bb .drop:hover,.bb .drop.over{border-color:var(--hc);color:var(--hc);background:rgba(94,246,255,.05)}
.bb .drop small{display:block;color:#a0565e;margin-top:6px;font-size:10.5px;letter-spacing:.04em}
.bb input,.bb select{background:#0a0506;border:1px solid #3b1418;color:#ffe3e6;font:13px var(--mono);padding:8px 10px;box-sizing:border-box}.bb input:focus{outline:0;border-color:var(--hc)}
.bb .ls{display:flex;flex-direction:column}.bb .d{display:grid;grid-template-columns:62px 1fr auto;gap:10px;align-items:center;padding:8px 6px;border-bottom:1px solid #2a0d11;cursor:pointer}
.bb .d:hover{background:rgba(255,77,94,.05)}.bb .d.on{background:rgba(94,246,255,.06)}.bb .d .fm{font:600 10px var(--sans);letter-spacing:.1em;color:var(--hc);border:1px solid var(--hc2);text-align:center;padding:3px 0;text-transform:uppercase}
.bb .d .nm{color:#ffe3e6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bb .d small{color:#a0565e}.bb .d .off{opacity:.45}
.bb .pv{border:1px solid #3b1418;padding:12px;display:flex;flex-direction:column;gap:9px;background:rgba(10,4,6,.6);align-self:start;position:sticky;top:0}
.bb .pv .tx{white-space:pre-wrap;max-height:34vh;overflow:auto;font-size:12px;color:#e9c4c8;border-top:1px solid #2a0d11;padding-top:8px}
.bb .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.bb .mini{font:11px var(--mono);background:none;border:1px solid #3b1418;color:#ffd9dc;padding:5px 9px;cursor:pointer}.bb .mini:hover{border-color:var(--hc);color:var(--hc)}
.bb .hit{border-left:2px solid var(--hc);padding:5px 9px;margin-bottom:6px;font-size:12px;cursor:pointer}.bb .hit b{color:var(--hc)}.bb mark{background:rgba(94,246,255,.25);color:inherit}
.bb-prog{font:12px var(--mono);color:var(--hc);padding:4px 0}.bb-prog.err{color:var(--hr)}
@media (max-width:980px){.bb{grid-template-columns:1fr}.bb .est{flex-direction:row;flex-wrap:wrap}.bb .pv{position:static}}`;document.head.appendChild(css);
let sec=null,sel=null,q='';
const fmtSize=n=>n>1e6?(n/1e6).toFixed(1)+' MB':Math.max(1,Math.round(n/1e3))+' KB';
function render(){if(!sec)return;const cnt=e=>docs.filter(d=>e==='Todo'||d.estante===e).length;
  const ests=['Todo',...ESTANTES,...new Set(docs.map(d=>d.estante).filter(e=>!ESTANTES.includes(e)))];
  const vis=docs.filter(d=>bib.estante==='Todo'||d.estante===bib.estante);
  const hits=q.trim().length>2?buscar(q,12,null,true):[];
  sec.innerHTML=`<div class="bb"><div><h3>Biblioteca</h3><div class="sub" style="margin:4px 0 12px">${docs.length} documento(s) · local</div>
   <div class="est">${ests.map(e=>`<button data-e="${esc(e)}" class="${bib.estante===e?'on':''}">${esc(e)}<b>${cnt(e)}</b></button>`).join('')}</div>
   <label style="display:flex;gap:8px;align-items:flex-start;margin-top:14px;font:12px var(--mono);color:#c98d93"><input type="checkbox" id="bbOn" ${bib.on?'checked':''} style="margin-top:3px"> Capri consulta la biblioteca al contestar</label></div>
  <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
   <div class="drop" id="bbDrop">Arrastra documentos aquí o haz clic para elegir${bib.estante!=='Todo'?' · van a «'+esc(bib.estante)+'»':''}
    <small>PDF · WORD (DOCX, DOC) · EXCEL (XLSX, XLS, CSV) · POWERPOINT (PPTX) · ODT/ODS/ODP · RTF · EPUB · HTML · TXT/MD/JSON · FOTOS Y ESCANEOS (los lee Capri en tu PC)</small></div>
   <input type="file" id="bbFile" multiple accept="${ACEPTA}" style="display:none"><div id="bbProg"></div>
   <input id="bbQ" placeholder="Buscar dentro de tus documentos…" value="${esc(q)}">
   ${hits.length?`<div>${hits.map(o=>`<div class="hit" data-id="${o.t.doc}"><b>${esc(o.t.nombre)}${o.t.pag?' · p. '+o.t.pag:''}</b><br>${marca(o.t.text,q)}</div>`).join('')}</div>`:q.trim().length>2?'<small style="color:#a0565e">Sin resultados.</small>':''}
   <div class="ls">${vis.map(d=>`<div class="d${sel===d.id?' on':''}" data-id="${d.id}"><span class="fm">${esc(d.ext||'?')}</span><div style="min-width:0" class="${d.active?'':'off'}"><div class="nm">${esc(d.name)}</div><small>${esc(TIPOS[d.ext]||'Texto')} · ${d.pags?d.pags+' pág. · ':''}${fmtSize(d.size)} · ${esc(d.estante)}${d.lectura?.vacias?.length?' · <b style="color:var(--hr)" title="páginas sin texto">⚠ '+d.lectura.vacias.length+' sin texto</b>':''}</small></div><small>${new Date(d.added).toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</small></div>`).join('')||'<small style="color:#a0565e;padding:10px 0">Aquí no hay documentos todavía.</small>'}</div></div>
  <div id="bbPv">${prev()}</div></div>`;}
function marca(t,q){const ws=new Set(words(q));const s=esc(t.slice(0,420));return s.replace(/[\p{L}\p{N}]{3,}/gu,w=>ws.has(stem(w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')))?'<mark>'+w+'</mark>':w)+(t.length>420?'…':'');}
function prev(){const d=docs.find(x=>x.id===sel);if(!d)return `<div class="pv"><div class="sub">Documento</div><small style="color:#c98d93">Elige uno para verlo, platicar de él con Capri o mandarlo a otro módulo.${foco?'<br><br>Platicando de: <b style="color:var(--hc)">'+esc(foco.name)+'</b> <button class="mini" data-a="sinfoco">soltar</button>':''}</small></div>`;
  const tx=trozos.filter(t=>t.doc===d.id).sort((a,b)=>+a.id.split('_')[1]-+b.id.split('_')[1]).slice(0,4).map(t=>t.text).join(' ');
  return `<div class="pv"><div class="sub">${esc(TIPOS[d.ext]||'Documento')}</div><b style="color:#ffe3e6;font:600 15px var(--sans)">${esc(d.name)}</b>
   <small style="color:#a0565e">${esc(d.file)} · ${d.trozos} trozos buscables · ${Math.round(d.chars/1000)}k caracteres${avisoLectura(d.lectura)}${d.lectura?'':' · leído antes de 2.8'}</small>
   <div class="row"><button class="hbtn c" data-a="lectura">👁 Ver lectura completa</button></div>
   <div class="row"><button class="hbtn c" data-a="platicar">${foco?.id===d.id?'Platicando de esto':'Platicar de esto'}</button><button class="mini" data-a="resumen">Resúmelo</button><button class="mini" data-a="quiz">Hazme preguntas</button></div>
   <div class="row"><label style="display:flex;gap:6px;align-items:center;font:12px var(--mono)"><input type="checkbox" data-a="act" ${d.active?'checked':''}> Capri lo consulta</label></div>
   <div class="row"><select id="bbEst">${[...new Set([...ESTANTES,d.estante])].map(e=>`<option ${e===d.estante?'selected':''}>${esc(e)}</option>`).join('')}<option value="+">+ nuevo estante…</option></select></div>
   <div class="row">${window.medGuardarTexto?'<button class="mini" data-a="med">⚕ Al reservorio médico</button>':''}${typeof dbPut==='function'?'<button class="mini" data-a="estudio">Al modo estudio</button>':''}<button class="mini" data-a="txt">⬇ Texto</button><button class="mini" data-a="del">✕ Quitar</button></div>
   <div class="sub">Inicio del documento · el texto entero está en «Ver lectura completa»</div>
   <div class="tx">${esc(tx.slice(0,2400))}${d.chars>2400?'…':''}</div></div>`;}
const textoDe=id=>trozos.filter(t=>t.doc===id).sort((a,b)=>+a.id.split('_')[1]-+b.id.split('_')[1]).map((t,i,a)=>(t.pag&&t.pag!==a[i-1]?.pag?`\n[Página ${t.pag}]\n`:'')+(i&&t.pag===a[i-1].pag&&a[i-1].text.length>=CHUNK?t.text.slice(OVER):(i?'\n':'')+t.text)).join('');  // solo se quita el traslape dentro de la misma página
function preguntar(t){window.hudGo?.('capri',true);setTimeout(()=>send(t),380);}
async function accion(a,el){const d=docs.find(x=>x.id===sel);
  if(a==='sinfoco'){foco=null;return render();}
  if(!d)return;
  if(a==='platicar'){foco=foco?.id===d.id?null:{id:d.id,name:d.name};render();if(foco){line('s','(📚 Platicando de «'+d.name+'»: Capri buscará primero ahí. Suéltalo en BIBLIOTECA cuando termines.)');window.hudGo?.('capri',true);}return;}
  if(a==='resumen'){foco={id:d.id,name:d.name};return preguntar('Resúmeme «'+d.name+'» con lo más importante, en puntos cortos.');}
  if(a==='quiz'){foco={id:d.id,name:d.name};return preguntar('Hazme 5 preguntas para repasar «'+d.name+'», una por una, y corrígeme.');}
  if(a==='act'){d.active=el.checked;idx=null;await tx(D=>D.put(d));return render();}
  if(a==='lectura')return window.verLectura?.('bib',d.id);
  if(a==='med'){el.textContent='Mandando…';try{await window.medGuardarTexto(d.name,d.file,textoDe(d.id),d.lectura);el.textContent='✓ En el reservorio';}catch(e){el.textContent='✖ '+e.message;}return;}
  if(a==='estudio'){const t=textoDe(d.id);await dbPut({id:'bib_'+d.id,name:d.file,text:t,pdf:null,active:true,chars:t.length,size:d.size,added:Date.now()});if(typeof renderDocs==='function')await renderDocs();el.textContent='✓ En modo estudio';return;}
  if(a==='txt'){const u=URL.createObjectURL(new Blob([textoDe(d.id)],{type:'text/plain'})),l=document.createElement('a');l.href=u;l.download=d.name+'.txt';l.click();setTimeout(()=>URL.revokeObjectURL(u),2000);return;}
  if(a==='del'){if(!confirm('¿Quitar «'+d.name+'» de la biblioteca?'))return;if(foco?.id===d.id)foco=null;sel=null;await borra(d.id);return render();}}
function montar(el){if(sec)return;sec=el;
  sec.addEventListener('click',e=>{const t=e.target;
    if(t.closest('#bbDrop'))return sec.querySelector('#bbFile').click();
    const b=t.closest('[data-e]');if(b){bib.estante=b.dataset.e;saveB();return render();}
    const a=t.closest('[data-a]');if(a&&a.tagName!=='INPUT')return accion(a.dataset.a,a);
    const d=t.closest('[data-id]');if(d){sel=d.dataset.id;render();}});
  sec.addEventListener('change',async e=>{const t=e.target;
    if(t.id==='bbFile'){agregar([...t.files],sec.querySelector('#bbProg'));t.value='';return;}
    if(t.id==='bbOn'){bib.on=t.checked;saveB();return;}
    if(t.dataset.a==='act')return accion('act',t);
    if(t.id==='bbEst'){const d=docs.find(x=>x.id===sel);let v=t.value;if(v==='+'){v=(prompt('Nombre del estante:')||'').trim();if(!v)return render();}d.estante=v;await tx(D=>D.put(d));render();}});
  sec.addEventListener('input',e=>{if(e.target.id!=='bbQ')return;q=e.target.value;clearTimeout(montar.t);montar.t=setTimeout(()=>{render();const i=sec.querySelector('#bbQ');i.focus();i.setSelectionRange(q.length,q.length);},180);});
  sec.addEventListener('dragover',e=>{e.preventDefault();sec.querySelector('#bbDrop')?.classList.add('over');});
  sec.addEventListener('dragleave',e=>{if(!sec.contains(e.relatedTarget))sec.querySelector('#bbDrop')?.classList.remove('over');});
  sec.addEventListener('drop',e=>{e.preventDefault();sec.querySelector('#bbDrop')?.classList.remove('over');if(e.dataTransfer.files.length)agregar([...e.dataTransfer.files],sec.querySelector('#bbProg'));});}
addEventListener('hud:view',async e=>{const {v,el}=e.detail||{};if(v!=='biblioteca'||!el)return;montar(el);await carga();render();});
window.openBiblioteca=()=>window.hudGo?.('biblioteca');
window.bibInfo=()=>({docs:docs.length,on:bib.on});
const _send=send;
send=async v=>{const k=(v||'').trim().toLowerCase();if(/^(biblioteca|libros|documentos)$/.test(k)&&!busy){line('u',v.trim());window.openBiblioteca();return;}
  await _send(v);if(k==='help')line('t','  biblioteca — Tus documentos (PDF, Word, Excel, PowerPoint…) para que Capri los consulte');};
carga();
// para R.I.P: fuentes oficiales, modo estudio y lector de escaneos
window.bibAgregar=(files,op)=>agregar(files,null,op);
window.bibDocs=async()=>{if(!bdb)await carga();return docs;};
window.bibTexto=id=>textoDe(id);
window.bibBuscar=async(q,k,soloDoc)=>{if(!bdb)await carga();return buscar(q,k,soloDoc);};
window.bibQuitar=id=>borra(id);
window.bibFoco=d=>{foco=d?{id:d.id,name:d.name}:null;};
// para la ventana de lectura (lectura.js)
window.bibLectura=async id=>{if(!bdb)await carga();const d=docs.find(x=>x.id===id);if(!d)return null;
  const ts=trozos.filter(t=>t.doc===id).sort((a,b)=>+a.id.split('_')[1]-+b.id.split('_')[1]);
  return {id,name:d.name,file:d.file,lectura:d.lectura||null,chars:d.chars,trozos:ts.length,paginas:paginasDeTrozos(ts,CHUNK,OVER),donde:'Biblioteca'};};
window.bibReleer=async(id,f,av)=>{const d=docs.find(x=>x.id===id);if(!d)throw new Error('ya no está en la biblioteca');
  const {t,inf}=await leerX(f,av);await guardaDoc(f,t,inf,{},d);await carga();render();return inf;};
window.bibActivos=()=>docs.filter(d=>d.active).map(d=>({id:d.id,name:d.name,chars:d.chars,lectura:d.lectura,oficial:!!d.oficial,added:d.added}));
window.bibFocoActual=()=>foco;
window.__bibTest={leer,leerX,partir,buscar:(q,k)=>buscar(q,k),carga,adivina};
})();
