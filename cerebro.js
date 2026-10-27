// ================= CEREBRO DOBLE (Gemini + tu GPU) =================
// Además de Gemini, Capri puede pensar con un modelo que corre en tu tarjeta de video gracias a Ollama
// (ollama.com). En modo Auto, la plática rápida, lo que dice sola y lo que pase sin internet o sin cupo lo
// contesta tu GPU; lo pesado (ver tu pantalla, oírte, salud, estudio, explicaciones largas) se queda en Gemini.
// También aprende con tu GPU: guarda cada plática en una memoria buscable y antes de contestar busca lo que
// viene al caso; y cada tanto relee lo último y saca datos nuevos de ti para su memoria de siempre.
// Ollama acepta llamadas desde 127.0.0.1, así que funciona en Capri de escritorio (el .exe) sin configurar nada.
// Tercer cerebro opcional: Claude (API de Anthropic, con la misma key de «Mi Claude»). Queda apagado hasta que
// haya key y lo prendas; entonces lo pesado va a Claude, con un tope de gasto que tú pones.
(()=>{
const OLL='http://127.0.0.1:11434';
const cer=Object.assign({modo:'auto',modelo:'',emb:'',aprende:true,claude:'off',tope:5},store.get('cerebro',{}));
const save=()=>store.set('cerebro',cer);
let ok=false,modelos=[],ultimo='',modoAct='user';
const esEmb=n=>/embed|bge|minilm|e5-|gte|arctic/i.test(n);
const chats=()=>modelos.filter(m=>!esEmb(m.n)),embs=()=>modelos.filter(m=>esEmb(m.n));
async function ver(){
  try{const r=await fetch(OLL+'/api/tags',{signal:AbortSignal.timeout(1500)});const j=await r.json();modelos=(j.models||[]).map(m=>({n:m.name,gb:(m.size||0)/1e9}));ok=true;}
  catch(e){ok=false;modelos=[];}
  if(ok){if(!chats().some(m=>m.n===cer.modelo))cer.modelo=(chats().find(m=>/gemma/i.test(m.n))||chats()[0])?.n||'';
    if(!embs().some(m=>m.n===cer.emb))cer.emb=(embs().find(m=>/embeddinggemma/i.test(m.n))||embs()[0])?.n||'';save();}
  pinta();return ok;}
setInterval(ver,60000);setTimeout(ver,1500);
const listo=()=>ok&&!!cer.modelo;
window.cerebroInfo=()=>({ok,modelo:cer.modelo,modo:cer.modo,emb:cer.emb,mems:mems.length,ultimo,claude:cer.claude,claudeKey:!!cfg.claudeKey,gasto:claudeSpent,tope:cer.tope});

// ---------- ¿quién contesta? ----------
const PESADO=/\b(explica|expl[ií]came|analiza|resume|resumen|c[oó]digo|programa|script|traduce|examen|investiga|compara|calcula|ecuaci[oó]n|ensayo|tarea|redacta|escr[ií]beme)\b|por qu[eé]|c[oó]mo funciona/i;
const SALUD=/s[ií]ntoma|dolor|enfermedad|diagn[oó]s|tratamiento|medicamento|f[aá]rmaco|dosis|cirug|anatom|fisiolog|patolog|cl[ií]nic|paciente|hospital/i;
function rutaLocal(parts){if(!listo()||cer.modo==='gemini')return false;
  if(parts.some(p=>p.inlineData))return false;                 // oír, ver la pantalla o leer PDFs: solo Gemini
  if(cer.modo==='local'||!cfg.key||!cfg.model)return true;
  if(modoAct==='idle')return true;                               // lo que dice sola: gratis en tu GPU
  if(cfg.study&&studyText())return false;
  const t=parts.map(p=>p.text||'').join(' ');
  return t.length<260&&!PESADO.test(t)&&!SALUD.test(t);}

// ---------- pensar con la GPU ----------
function sysPrompt(){const name=cfg.name||'Kiga';
  let s=personality(name,'')+(window.medPrompt?medPrompt():'')+(window.manosPrompt?manosPrompt():'');
  // la hora va al final: si cambia al principio, Ollama tiene que releer todo el texto en cada mensaje
  const now=new Date().toLocaleString('es-MX',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  s=s.replace('Ahora es '+now+'.','');
  return [s,`Ahora es ${now}${now.endsWith('.')?'':'.'}\nEmpieza SIEMPRE con tu estado entre corchetes, ej. [presumida]. Contesta en español, corto y natural.`];}
async function local(parts,onText){
  const msgs=[{role:'system',content:sysPrompt().join('\n\n')}];
  for(const h of history.slice(-12))msgs.push({role:h.role==='model'?'assistant':'user',content:h.text});
  msgs.push({role:'user',content:parts.filter(p=>p.text).map(p=>p.text).join('\n')});
  const m2=[];for(const m of msgs){const l=m2[m2.length-1];if(l&&l.role===m.role&&m.role!=='system')l.content+='\n'+m.content;else m2.push({...m});}
  const body={model:cer.modelo,messages:m2,stream:true,keep_alive:'30m',options:{temperature:1,num_ctx:6144}};
  if(/qwen3|deepseek-r1/i.test(cer.modelo))body.think=false;
  const r=await fetch(OLL+'/api/chat',{method:'POST',body:JSON.stringify(body)});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error('GPU: '+(j.error||'Error '+r.status));}
  const reader=r.body.getReader(),dec=new TextDecoder();let buf='',raw='',sent=0;
  while(true){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
    while((i=buf.indexOf('\n'))>=0){const ln=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!ln)continue;
      try{const j=JSON.parse(ln);if(j.error)throw new Error('GPU: '+j.error);raw+=j.message?.content||'';
        const vis=raw.replace(/<think>[\s\S]*?(<\/think>|$)/g,'');if(vis.length>sent){onText(vis.slice(sent));sent=vis.length;}}
      catch(e){if(/^GPU/.test(e.message))throw e;}}}
  const full=raw.replace(/<think>[\s\S]*?(<\/think>|$)/g,'');if(!full.trim())throw new Error('EMPTY');
  marca('GPU · '+cer.modelo);return full;}
function marca(quien){ultimo=quien;const el=$('mdl');if(el)el.textContent=quien==='nube'?(cfg.model||'—'):quien;log('cerebro: '+(quien==='nube'?'Gemini':quien),'g');pinta();}

// ---------- pensar con Claude ----------
let claudeFuera=0;
const claudeOk=()=>cer.claude!=='off'&&!!cfg.claudeKey&&claudeSpent<cer.tope&&Date.now()>claudeFuera;
function rutaClaude(parts){if(!claudeOk()||modoAct==='watch'||modoAct==='idle')return false;
  if(parts.some(p=>p.inlineData&&/^audio/.test(p.inlineData.mimeType)))return false;   // Claude no oye audio: la voz sigue en Gemini
  if(cer.claude==='siempre')return true;
  const t=parts.map(p=>p.text||'').join(' ');
  return parts.some(p=>p.inlineData)||(cfg.study&&!!studyText())||t.length>=260||PESADO.test(t)||SALUD.test(t);}
async function claudeBrain(parts,onText){
  const [base,hora]=sysPrompt();
  // lo que no cambia va primero y se marca para caché: Anthropic cobra menos por releerlo
  const system=[{type:'text',text:base,cache_control:{type:'ephemeral'}},{type:'text',text:hora}];
  const msgs=[];const add=(role,content)=>{const l=msgs[msgs.length-1];if(l&&l.role===role)l.content.push(...content);else msgs.push({role,content:[...content]});};
  for(const h of history.slice(-16))add(h.role==='model'?'assistant':'user',[{type:'text',text:h.text}]);
  while(msgs.length&&msgs[0].role!=='user')msgs.shift();
  const cur=[];for(const p of [...studyPdfParts(),...parts]){const d=p.inlineData;
    if(d&&/^image\//.test(d.mimeType))cur.push({type:'image',source:{type:'base64',media_type:d.mimeType,data:d.data}});
    else if(d&&d.mimeType==='application/pdf')cur.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:d.data}});
    else if(p.text)cur.push({type:'text',text:p.text});}
  add('user',cur);
  const {full,cost}=await claudeStream(system,msgs,onText,4096);
  marca('Claude · '+(cfg.claudeModel||'claude-opus-5-5'));log('Claude: ~'+usd(cost)+' · total '+usd(claudeSpent),'y');
  if(claudeSpent>=cer.tope)line('s','(◆ Llegaste a tu tope de gasto de Claude ('+usd(cer.tope)+'). Sigo con Gemini y tu GPU; súbelo en AJUSTES → Cerebro si quieres.)');
  return full;}
function claudeFallo(e){const m=String(e.message||'');
  const sinCredito=/credit balance|billing|purchase credits/i.test(m),key=e.status===401||e.status===403;
  claudeFuera=Date.now()+(sinCredito||key?30:5)*60e3;
  line('s','(◆ Claude no respondió'+(sinCredito?': tu cuenta de Anthropic no tiene créditos todavía':key?': la key no es válida':' ('+m.slice(0,80)+')')+'. Te contesto con otro cerebro.)');}

// ---------- el que decide ----------
const _ask=ask;
ask=async(parts,onText)=>{
  const rec=await recordar(parts).catch(()=>'');const p2=rec?[{text:rec},...parts]:parts;
  if(rutaClaude(parts)){let dijo=false;try{return await claudeBrain(p2,x=>{dijo=true;onText(x);});}catch(e){if(dijo)throw e;claudeFallo(e);}}
  if(rutaLocal(parts)){let dijo=false;try{return await local(p2,x=>{dijo=true;onText(x);});}catch(e){log(String(e.message).slice(0,60),'w');if(dijo||!cfg.key||!cfg.model)throw e;}}
  let algo=false;
  try{const t=await _ask(p2,x=>{algo=true;onText(x);});marca('nube');return t;}
  catch(e){const caido=e.status===429||e.status>=500||e.message==='NOKEY'||e instanceof TypeError;
    if(!algo&&caido&&claudeOk()&&!parts.some(p=>p.inlineData&&/^audio/.test(p.inlineData.mimeType))){
      line('s','(Gemini no respondió; te contesto con Claude.)');try{return await claudeBrain(p2,onText);}catch(e2){claudeFallo(e2);}}
    if(algo||!caido||!listo()||cer.modo==='gemini'||parts.some(p=>p.inlineData))throw e;
    line('s','(Gemini no respondió'+(e.status===429?' (sin cupo)':e instanceof TypeError?' (sin internet)':'')+'; te contesto con el cerebro de tu GPU.)');
    return local(p2,onText);}};
const _respond=respond;
respond=async(userText,extra,mode)=>{modoAct=mode||'user';try{return await _respond(userText,extra,mode);}finally{modoAct='user';guardaPlatica();}};

// ---------- memoria buscable ----------
let mems=[],db=null;
const idb=()=>db||(db=new Promise((res,rej)=>{const o=indexedDB.open('capri-cerebro',1);o.onupgradeneeded=()=>o.result.createObjectStore('m',{keyPath:'id',autoIncrement:true});o.onsuccess=()=>res(o.result);o.onerror=()=>rej(o.error);}));
const tx=async(mode,fn)=>{const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('m',mode);const r=fn(t.objectStore('m'));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});};
tx('readonly',s=>s.getAll()).then(a=>{mems=a||[];pinta();}).catch(()=>{});
const norm=v=>{let n=0;for(const x of v)n+=x*x;n=Math.sqrt(n)||1;return Float32Array.from(v,x=>x/n);};
// los embeddings van en el procesador (num_gpu 0) para no sacar de la tarjeta al modelo que platica: con 4 GB no caben los dos
async function embed(texts){if(!ok||!cer.emb)return null;
  const r=await fetch(OLL+'/api/embed',{method:'POST',body:JSON.stringify({model:cer.emb,input:texts,keep_alive:'30m',options:{num_gpu:0}}),signal:AbortSignal.timeout(4000)});
  if(!r.ok)return null;const j=await r.json();return (j.embeddings||[]).map(norm);}
const palabras=t=>new Set((t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').match(/[a-zñ0-9]{4,}/g)||[]));
const cos=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;};
let ultimaGuardada='',nuevas=0;
async function guardaPlatica(){if(!cer.aprende)return;const a=history.at(-1),u=history.at(-2);
  if(!a||!u||a.role!=='model'||u.role!=='user'||/^\(/.test(u.text))return;
  const txt=(cfg.name||'Kiga')+': '+u.text.slice(0,500)+'\nCapri: '+clean(a.text).replace(/^\[[a-z_]+\]\s*/i,'').slice(0,600);
  if(txt===ultimaGuardada)return;ultimaGuardada=txt;
  const e={t:txt,ts:Date.now()};try{const v=await embed([txt]);if(v?.[0])e.v=v[0];}catch(_){}
  try{e.id=await tx('readwrite',s=>s.add(e));}catch(_){}mems.push(e);
  if(mems.length>3000){const viejo=mems.shift();tx('readwrite',s=>s.delete(viejo.id)).catch(()=>{});}
  pinta();if(++nuevas>=6)setTimeout(destila,4000);}
async function recordar(parts){if(!cer.aprende||!mems.length)return '';
  const q=parts.filter(p=>p.text).map(p=>p.text).join(' ').slice(-500)||(history.at(-1)?.role==='user'?history.at(-1).text:'');
  if(q.length<8||modoAct==='watch')return '';
  const viejas=mems.filter(m=>Date.now()-m.ts>15*60e3);if(!viejas.length)return '';  // lo reciente ya va en la plática
  let top=[];const qv=viejas.some(m=>m.v)?await embed([q]).catch(()=>null):null;
  if(qv?.[0])top=viejas.filter(m=>m.v&&m.v.length===qv[0].length).map(m=>[cos(qv[0],m.v),m]).filter(x=>x[0]>.5);
  else{const W=palabras(q);if(W.size)top=viejas.map(m=>{const P=palabras(m.t);let n=0;for(const w of W)if(P.has(w))n++;return [n/Math.sqrt(W.size*Math.max(1,P.size)),m];}).filter(x=>x[0]>.18);}
  top=top.sort((a,b)=>b[0]-a[0]).slice(0,3);if(!top.length)return '';
  return `(Recuerdos de pláticas pasadas con ${cfg.name||'Kiga'} que pueden venir al caso. Úsalos solo si ayudan, sin decir que los buscaste:\n`+
    top.map(([,m])=>'- '+new Date(m.ts).toLocaleDateString('es-MX',{day:'numeric',month:'short'})+': '+m.t.replace(/\n/g,' / ')).join('\n')+')';}
// cada 6 pláticas, la GPU relee lo último y saca datos nuevos y duraderos de ti para su memoria de siempre
async function destila(){if(!listo()||busy||!cer.aprende||nuevas<6)return;nuevas=0;const name=cfg.name||'Kiga';
  const ult=mems.slice(-6).map(m=>m.t).join('\n---\n'),ya=(M().hechos||[]).map(h=>'- '+h.t).join('\n');
  try{const r=await fetch(OLL+'/api/chat',{method:'POST',body:JSON.stringify({model:cer.modelo,stream:false,keep_alive:'30m',...(/qwen3|deepseek-r1/i.test(cer.modelo)?{think:false}:{}),
      options:{temperature:.2,num_predict:220,num_ctx:4096},messages:[{role:'system',content:`Extraes datos duraderos sobre ${name} de sus pláticas con Capri. Responde SOLO con líneas así: <<recuerda: categoria | dato corto en tercera persona>>. Categorías: nombre, gusto, persona, vivencia, dia, escuela, otro. Máximo 3 líneas. Nada que ya esté en la lista, nada inventado, nada sobre Capri. Si no hay nada nuevo responde NADA.`},
      {role:'user',content:`Ya se sabe:\n${ya||'(nada)'}\n\nPláticas recientes:\n${ult}`}]})});
    const j=await r.json();const out=(j.message?.content||'').replace(/<think>[\s\S]*?<\/think>/g,'');const n=(out.match(/<<\s*recuerda/gi)||[]).length;
    if(n){absorbMem(out.split('\n').filter(l=>/<<\s*recuerda/i.test(l)).slice(0,3).join('\n'));log('🧠 tu GPU le enseñó '+n+' cosa(s) nueva(s)','y');}}
  catch(e){log('destilar: '+String(e.message).slice(0,40),'w');}}

// ---------- botón para CIBERWARE ----------
const btn=document.createElement('button');btn.id='bCerebro';btn.className='btn';btn.style.display='none';btn.title='Cerebro adaptativo';
btn.onclick=async()=>{await ver();
  if(cer.modo==='gemini'){if(!listo())return line('s','(🧠 No encuentro Ollama en tu PC. Instálalo de ollama.com y baja un modelo: ve a AJUSTES → Cerebro de tu GPU.)');cer.modo='auto';}
  else cer.modo='gemini';save();pinta();
  line('s',cer.modo==='auto'?'(🧠 Cerebro doble activo: tu GPU ('+cer.modelo+') contesta la plática y lo que digo sola; lo pesado sigue en Gemini.)':'(🧠 Cerebro de tu GPU apagado: todo va a Gemini.)');};
document.querySelector('.dock .tools')?.appendChild(btn);
const bCl=document.createElement('button');bCl.id='bClaudeBrain';bCl.className='btn';bCl.style.display='none';bCl.title='Coprocesador Claude';
bCl.onclick=()=>{if(cer.claude!=='off'){cer.claude='off';save();pinta();return line('s','(◆ Coprocesador Claude apagado: lo pesado vuelve a Gemini.)');}
  if(!cfg.claudeKey)return line('s','(◆ El coprocesador Claude está instalado pero sin energía: cuando compres créditos en console.anthropic.com, crea una API key y pégala en AJUSTES → «API key de Claude». Luego vuelve a activarlo aquí.)');
  cer.claude='pesado';save();pinta();line('s','(◆ Coprocesador Claude activo: lo pesado (explicaciones, salud, estudio, imágenes) lo piensa Claude, con tope de '+usd(cer.tope)+'.)');};
document.querySelector('.dock .tools')?.appendChild(bCl);

// ---------- panel en Ajustes ----------
const box=document.createElement('div');box.innerHTML=`<h3>Cerebro de tu GPU <small style="font-weight:400">· Ollama</small></h3>
 <small id="ceSt"></small>
 <label>Quién contesta<select id="ceModo"><option value="auto">Auto: tu GPU para platicar, Gemini para lo pesado</option><option value="local">Siempre tu GPU (Gemini solo para ver y oír)</option><option value="gemini">Solo Gemini</option></select></label>
 <label>Modelo de tu GPU<select id="ceMod"></select></label>
 <label>Aprender de las pláticas<select id="ceApr"><option value="1">Sí: memoria buscable y saca datos nuevos de ti</option><option value="0">No</option></select></label>
 <small>Para tu GTX 1650 (4 GB): instala Ollama de <b>ollama.com</b>, abre PowerShell y escribe <code>ollama pull gemma3:4b</code> y luego <code>ollama pull embeddinggemma</code> (para que busque por significado). Si la sientes lenta, prueba <code>ollama pull llama3.2:3b</code>. Todo se queda en tu PC.</small>
 <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="ceTry" style="width:auto;flex:1;padding:8px 10px">▶ Probar cerebro local</button><button class="btn" id="ceRe" style="width:auto;flex:1;padding:8px 10px">↻ Buscar Ollama</button><button class="btn" id="ceDel" style="width:auto;flex:1;padding:8px 10px">✖ Borrar memoria buscable</button></div>
 <small id="ceOut"></small>
 <h3>Cerebro de Claude <small style="font-weight:400">· Anthropic</small></h3>
 <small id="ceClSt"></small>
 <label>Cuándo usa Claude<select id="ceCl"><option value="off">Apagado</option><option value="pesado">Para lo pesado (explicaciones, salud, estudio, imágenes)</option><option value="siempre">Siempre que se pueda (la voz sigue en Gemini)</option></select></label>
 <label>Tope de gasto en dólares (cuando llega, deja de usarlo)<input id="ceTope" type="number" min="0" step="0.5"></label>
 <small>Usa la key de «API key de Claude» de arriba y el modelo que elijas ahí. Cada respuesta cuesta centavos; Capri lleva la cuenta. La voz y lo que mira de tu pantalla siguen en Gemini.</small>`;
$('cClose')?.parentElement?.before(box);
function pinta(){btn.classList.toggle('act',cer.modo!=='gemini'&&listo());const st=$('ceSt');if(!st)return;
  st.textContent=ok?(chats().length?'● Conectado a Ollama · '+chats().length+' modelo(s) · memoria buscable: '+mems.length+' plática(s)'+(cer.emb?' (por significado)':' (por palabras: baja embeddinggemma para que busque mejor)')+(ultimo?' · último que contestó: '+(ultimo==='nube'?'Gemini':ultimo):''):'● Ollama está abierto pero no tiene modelos: baja uno (abajo dice cómo).')
    :'✖ No encontré Ollama en tu PC (o está cerrado). Sin él, todo va a Gemini.';
  st.style.color=ok&&chats().length?'var(--grn)':'#ffb000';
  const s=$('ceMod');s.innerHTML=chats().map(m=>`<option value="${m.n}">${m.n} · ${m.gb.toFixed(1)} GB${m.gb>3.6?' (grande para 4 GB)':''}</option>`).join('')||'<option value="">(ninguno)</option>';s.value=cer.modelo;
  $('ceModo').value=cer.modo;$('ceApr').value=cer.aprende?'1':'0';
  bCl.classList.toggle('act',claudeOk());$('ceCl').value=cer.claude;$('ceTope').value=cer.tope;
  const cs=$('ceClSt');cs.textContent=!cfg.claudeKey?'○ Listo para cuando tengas créditos: falta tu API key de Anthropic.':cer.claude==='off'?'○ Key puesta, pero Claude está apagado.':claudeSpent>=cer.tope?'✖ Llegó al tope: gastado '+usd(claudeSpent)+' de '+usd(cer.tope)+'.':Date.now()<claudeFuera?'✖ Claude no respondió hace poco (¿sin créditos?); lo vuelve a intentar en unos minutos.':'● Activo · gastado '+usd(claudeSpent)+' de '+usd(cer.tope)+' · modelo '+(cfg.claudeModel||'claude-opus-5-5');
  cs.style.color=claudeOk()?'var(--grn)':'#ffb000';}
$('ceModo').onchange=()=>{cer.modo=$('ceModo').value;save();pinta();};
$('ceMod').onchange=()=>{cer.modelo=$('ceMod').value;save();pinta();};
$('ceApr').onchange=()=>{cer.aprende=$('ceApr').value==='1';save();};
$('ceRe').onclick=()=>ver();
$('ceCl').onchange=()=>{cer.claude=$('ceCl').value;claudeFuera=0;save();pinta();};
$('ceTope').onchange=()=>{cer.tope=Math.max(0,+$('ceTope').value||0);save();pinta();};
$('ceDel').onclick=async()=>{if(!confirm('¿Borrar la memoria buscable de pláticas? (Sus recuerdos de siempre no se borran.)'))return;mems=[];await tx('readwrite',s=>s.clear()).catch(()=>{});pinta();};
$('ceTry').onclick=async()=>{const o=$('ceOut');if(!await ver()||!cer.modelo){o.textContent='Primero instala Ollama y baja un modelo.';return;}
  o.textContent='Pensando con '+cer.modelo+'… (la primera vez tarda en cargarlo a la tarjeta)';const t0=performance.now();let txt='';
  try{await local([{text:'Salúdame en una frase y dime con qué cerebro estás pensando.'}],x=>{txt+=x;o.textContent=clean(txt);});
    o.textContent=clean(txt).trim()+'  ·  '+((performance.now()-t0)/1000).toFixed(1)+' s';}
  catch(e){o.textContent='No se pudo: '+e.message;}};
$('bCfg')?.addEventListener('click',()=>setTimeout(ver,50));
pinta();
})();
