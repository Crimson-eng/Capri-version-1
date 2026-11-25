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
const cer=Object.assign({modo:'auto',modelo:'',emb:'',aprende:true,claude:'off',tope:5,turbo:true,ctx:{},medidas:[]},store.get('cerebro',{}));
const save=()=>store.set('cerebro',cer);
let ok=false,modelos=[],ultimo='',modoAct='user';
const esEmb=n=>/embed|bge|minilm|e5-|gte|arctic/i.test(n);
const chats=()=>modelos.filter(m=>!esEmb(m.n)),embs=()=>modelos.filter(m=>esEmb(m.n));
async function ver(){
  try{const r=await fetch(OLL+'/api/tags',{signal:AbortSignal.timeout(1500)});const j=await r.json();modelos=(j.models||[]).map(m=>({n:m.name,gb:(m.size||0)/1e9}));ok=true;}
  catch(e){ok=false;modelos=[];}
  if(ok){if(!chats().some(m=>m.n===cer.modelo))cer.modelo=(chats().find(m=>/gemma/i.test(m.n))||chats()[0])?.n||'';
    if(!embs().some(m=>m.n===cer.emb))cer.emb=(embs().find(m=>/embeddinggemma/i.test(m.n))||embs()[0])?.n||'';save();}
  pinta();if(ok&&cer.modelo&&cer.turbo&&cer.modo!=='gemini')calentar();return ok;}
// Ollama puede tardar en despertar cuando Windows arranca: revisa seguido al principio y luego cada minuto
setInterval(ver,60000);[1500,5e3,12e3,25e3,40e3].forEach(t=>setTimeout(ver,t));

// ---------- turbo GPU ----------
// 1) El modelo se carga a la tarjeta en cuanto abres Capri (y se queda 2 h), así la primera respuesta no espera la carga.
// 2) Todas las llamadas usan el MISMO tamaño de contexto: si cambia, Ollama vuelve a cargar el modelo entero (antes pasaba
//    cada vez que Capri «destilaba» recuerdos: la siguiente respuesta tardaba segundos de más).
// 3) Si el modelo no cabe entero en la memoria de video, una parte se va al procesador y todo va lento: Capri lo ve en
//    /api/ps y baja el contexto (6144 → 4096 → 3072 → 2048) hasta que quepa todo en la GPU.
const VIVO='2h',PASOS=[6144,4096,3072,2048];
const ctxDe=()=>cer.ctx[cer.modelo]||PASOS[0];
let caliente=0,calentando=null;
async function enGPU(){try{const j=await (await fetch(OLL+'/api/ps',{signal:AbortSignal.timeout(2000)})).json();
  const m=(j.models||[]).find(x=>x.name===cer.modelo||x.model===cer.modelo);return m?{pct:m.size?Math.round(100*m.size_vram/m.size):0,gb:m.size_vram/1e9}:null;}catch(e){return null;}}
function calentar(forzar){if(calentando)return calentando;if(!forzar&&Date.now()-caliente<100*60e3)return Promise.resolve();
  return calentando=(async()=>{const t0=performance.now();
    try{for(let i=0;i<PASOS.length;i++){
        const r=await fetch(OLL+'/api/generate',{method:'POST',body:JSON.stringify({model:cer.modelo,prompt:'',keep_alive:VIVO,options:{num_ctx:ctxDe()}})});
        if(!r.ok)throw new Error('Error '+r.status);await r.text();const g=await enGPU();
        if(!g||g.pct>=98||ctxDe()<=PASOS.at(-1)){caliente=Date.now();log('⚡ GPU lista: '+cer.modelo+(g?' · '+g.pct+'% en tarjeta':'')+' · contexto '+ctxDe()+' · '+Math.round(performance.now()-t0)+' ms','g');break;}
        const sig=PASOS.find(n=>n<ctxDe());log('⚡ '+cer.modelo+' solo '+g.pct+'% en tu GPU: bajo el contexto a '+sig+' para que quepa','y');cer.ctx[cer.modelo]=sig;save();}}
    catch(e){log('⚡ no pude precalentar: '+String(e.message).slice(0,40),'w');}finally{calentando=null;pinta();}})();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&listo()&&cer.turbo&&cer.modo!=='gemini')calentar();});
// para el expediente y otros módulos: pedirle a tu GPU una respuesta en JSON (nada sale de la PC)
window.cerebroJSON=async(system,user)=>{if(!listo())return null;
  const body={model:cer.modelo,stream:false,format:'json',keep_alive:VIVO,options:{temperature:.1,num_ctx:ctxDe()},messages:[{role:'system',content:system},{role:'user',content:user}]};
  if(/qwen3|deepseek-r1/i.test(cer.modelo))body.think=false;
  const r=await fetch(OLL+'/api/chat',{method:'POST',body:JSON.stringify(body),signal:window.capriSenal?.(180000)||AbortSignal.timeout(180000)});if(!r.ok)throw new Error('GPU: Error '+r.status);
  const j=await r.json();const t=(j.message?.content||'').replace(/<think>[\s\S]*?<\/think>/g,'').trim();try{return JSON.parse(t);}catch(e){throw new Error('la GPU no devolvió JSON válido');}};
const listo=()=>ok&&!!cer.modelo;
window.cerebroInfo=()=>({nubes:nubesListas(),ok,modelo:cer.modelo,ctx:ctxDe(),modo:cer.modo,emb:cer.emb,mems:mems.length,ultimo,claude:cer.claude,claudeKey:!!cfg.claudeKey,gasto:claudeSpent,tope:cer.tope});

// ---------- ¿quién contesta? ----------
const PESADO=/\b(explica|expl[ií]came|analiza|resume|resumen|c[oó]digo|programa|script|traduce|examen|investiga|compara|calcula|ecuaci[oó]n|ensayo|tarea|redacta|escr[ií]beme)\b|por qu[eé]|c[oó]mo funciona/i;
const SALUD=/s[ií]ntoma|dolor|enfermedad|diagn[oó]s|tratamiento|medicamento|f[aá]rmaco|dosis|cirug|anatom|fisiolog|patolog|cl[ií]nic|paciente|hospital/i;
function rutaLocal(parts){if(!listo()||cer.modo==='gemini')return false;
  if(parts.some(p=>p.inlineData))return false;                 // oír, ver la pantalla o leer PDFs: solo Gemini
  if(cer.modo!=='local'&&Date.now()<gpuLentaHasta&&hayOtro())return false;   // 2.27.1: tu GPU anduvo lenta hace poco: contesta otro mientras
  if(cer.modo==='local'||!cfg.key||!cfg.model)return true;
  if(window.lecturaPesada?.()>8000)return false;                // «resúmeme todo el documento»: no cabe en el contexto de la GPU
  if(modoAct==='idle')return true;                               // lo que dice sola: gratis en tu GPU
  if(cfg.study&&studyText())return false;
  const t=parts.map(p=>p.text||'').join(' ');
  return t.length<260&&!PESADO.test(t)&&!SALUD.test(t);}

// ---------- pensar con la GPU ----------
function sysPrompt(){
  // 2.28: [lo fijo, lo de ahorita]. Lo fijo va de system y no cambia entre mensajes: Ollama lo reusa de su caché
  // (antes la hora y el ánimo iban en medio y tu GPU releía ~2 000 tokens en cada mensaje). Lo de ahorita va con la pregunta.
  const sp=sistemaCapri('');
  return [sp.fijo,sp.ahora+'\nEmpieza SIEMPRE con tu estado entre corchetes, ej. [presumida]. Contesta en español, corto y natural.'];}
// 2.27.1 — por qué Capri se quedaba «pensando» con Ollama prendido:
// a) desde 2.6 el turbo baja el contexto (hasta 2048) para que el modelo quepa en 4 GB, pero su personalidad + memoria
//    ya pasan de 3 500 tokens: Ollama recortaba el principio (¡su personalidad!) y leía todo de nuevo en cada mensaje.
//    Ahora se mide antes: se quitan mensajes viejos de la plática y, si aun así no cabe, contesta otro cerebro.
// b) si la GPU no suelta la primera palabra a tiempo (ocupada, lenta o atorada), se corta y contesta Gemini/Claude,
//    y por 10 min la plática va directo a ellos. Antes solo cambiaba de cerebro si Ollama daba error, nunca por lento.
// 2.28.1: los números cuentan como 1 token por dígito en gemma (clima, horas, coordenadas…): antes se contaban como 1/3
const tok=s=>{s=String(s||'');const d=(s.match(/[0-9]/g)||[]).length;return Math.ceil((s.length-d)/3+d);};
// recorta un texto hasta que quepa en n tokens (desde el principio, o desde el final si cola=true)
function cabe(s,n,cola){s=String(s||'');if(tok(s)<=n)return s;if(n<=8)return '';let c=Math.min(s.length,n*3);
  for(let i=0;i<12;i++){const t=cola?'…'+s.slice(-c):s.slice(0,c)+'\n…';if(tok(t)<=n)return t;c=Math.floor(c*.85);}return '';}
const GPU_ESPERA={caliente:20e3,fria:45e3},GPU_PAUSA=10*60e3,RESERVA=700,MARCO=80;   // MARCO: lo que agrega la plantilla de chat de Ollama   // RESERVA: lugar para lo que contesta
let gpuLentaHasta=0;
const hayNube=()=>!!(cfg.key&&cfg.model)&&navigator.onLine!==false;
const hayOtro=()=>hayNube()||(claudeOk()&&!window.cerebroSinGasto)||nubesListas().length>0;   // 2.29: Groq y OpenRouter también cuentan
// arma lo que lee tu GPU: system fijo + plática + (lo de ahorita y la pregunta)
// 2.28.1 — «the prompt is longer than the context length»: desde 2.28 lo de ahorita (hora, ánimo, clima, fuentes, biblioteca,
// recuerdos…) va junto a la pregunta, y eso NUNCA se recortaba: solo se recortaba la personalidad. Con el contexto de tu GPU
// en 2048 bastaba poco para pasarse y Ollama tronaba (sobre todo cuando Gemini falla y tu GPU tiene que contestar sí o sí).
// Ahora TODO se mide y se reparte: primero tu pregunta, luego lo de ahorita, luego su personalidad. Nunca se pasa del contexto.
// apretar<1 deja más margen (si aun así Ollama dice que no cupo, se vuelve a armar más chico).
// 2.29: lo mismo sirve para los cerebros de respaldo en la nube (Groq, OpenRouter), que también tienen tope de tokens por mensaje
function armaChat(parts,o){
  window.fragTope=o.frag||0;let sp;try{sp=sysPrompt();}finally{window.fragTope=0;}   // en la GPU el contexto es chico: del constructo que se asoma va lo esencial
  const lim=o.lim,RES=o.reserva??RESERVA,sys=sp[0];let ahora=sp[1],usr=parts.filter(p=>p.text).map(p=>p.text).join('\n');
  const preg=()=>notaAhora(ahora)+'\n\n'+usr;
  // la plática se recorta de 4 en 4 mensajes (no de uno en uno) para que el principio se repita y Ollama lo reuse
  let hist=ventanaHist(history,o.hist||12,4);const total=()=>tok(sys)+tok(preg())+hist.reduce((a,h)=>a+tok(h.text)+4,0)+RES+MARCO;
  while(hist.length>2&&total()>lim)hist=hist.slice(Math.min(4,hist.length-2));
  let sysUsa=sys;
  if(total()>lim){if(o.otro)throw new Error('NOCABE');   // no cabe en tu GPU: mejor que conteste Gemini/Claude completo
    hist=[];   // sin otro cerebro: lo esencial de cada parte, sin pasarse
    const B=Math.max(300,lim-RES-MARCO-tok(notaAhora('')));
    const uB=Math.min(tok(usr),Math.floor(B*.4));usr=cabe(usr,uB,true);          // tu pregunta va al final: se queda la cola
    const resto=B-tok(usr),sB0=Math.min(tok(sys),Math.floor(resto*.55));
    ahora=cabe(ahora,resto-sB0);sysUsa=cabe(sys,resto-tok(ahora));
    log('🧠 '+o.quien+': le mandé lo esencial (personalidad '+tok(sysUsa)+', ahorita '+tok(ahora)+', pregunta '+tok(usr)+' tokens)','y');}
  const msgs=[{role:'system',content:sysUsa}];
  for(const h of hist)msgs.push({role:h.role==='model'?'assistant':'user',content:h.text});
  msgs.push({role:'user',content:preg()});
  const m2=[];for(const m of msgs){const l=m2[m2.length-1];if(l&&l.role===m.role&&m.role!=='system')l.content+='\n'+m.content;else m2.push({...m});}
  // la plática tiene que empezar con un mensaje tuyo (algunas APIs truenan si después del system viene uno de Capri)
  if(o.empiezaTu)while(m2.length>2&&m2[1].role==='assistant')m2.splice(1,1);
  return {m2,firma:firma(sysUsa,hist)};}
function armaGPU(parts,otro,apretar=1){const ctx=ctxDe();
  return {...armaChat(parts,{lim:Math.floor(ctx*apretar),otro,frag:2500,quien:'tu GPU tiene contexto '+ctx}),ctx};}
const noCupo=e=>/context length|longer than the context|exceeds the context|context window/i.test(String(e?.message||e||''));
// huella corta de lo que ya leyó tu GPU (para no precargar dos veces lo mismo)
function firma(sys,hist){let h=5381;const t=sys+hist.map(x=>x.text).join('\u0001');for(let i=0;i<t.length;i++)h=(h*33^t.charCodeAt(i))>>>0;return t.length+':'+h;}
let prefijoGPU='',precargando=null,precargaTs=0;
// 2.28 — precarga: en cuanto empiezas a escribir, tu GPU lee de una vez su personalidad, su memoria y la plática;
// cuando mandas el mensaje solo le falta leer tu pregunta. (Ollama guarda lo último que leyó y reusa el principio igual.)
function precargaGPU(){if(precargando||busy||!listo()||cer.modo==='gemini'||cer.turbo===false||Date.now()<gpuLentaHasta||Date.now()-precargaTs<15e3)return;
  let a;try{a=armaGPU([{text:'.'}],true);}catch(e){return;}
  if(a.firma===prefijoGPU)return;precargaTs=Date.now();const t0=performance.now();
  const body={model:cer.modelo,messages:a.m2,stream:false,keep_alive:VIVO,options:{temperature:1,num_ctx:a.ctx,num_predict:1}};
  if(/qwen3|deepseek-r1/i.test(cer.modelo))body.think=false;
  precargando=fetch(OLL+'/api/chat',{method:'POST',body:JSON.stringify(body),signal:AbortSignal.timeout(60e3)}).then(r=>r.ok?r.json():null)
    .then(j=>{if(j){prefijoGPU=a.firma;caliente=Date.now();log('⚡ GPU leyó por adelantado su personalidad y la plática ('+Math.round(performance.now()-t0)+' ms)','g');}})
    .catch(()=>{}).finally(()=>{precargando=null;});}
window.cerebroPrecarga=precargaGPU;
{let tq=0;const qi=document.getElementById('q');qi?.addEventListener('input',()=>{clearTimeout(tq);if(qi.value.trim().length<2)return;
  tq=setTimeout(()=>{precargaGPU();if(ok&&cer.emb&&cer.aprende&&Date.now()-embedVivo>100*60e3&&mems.some(m=>m.v))embed(['.']).catch(()=>{});},350);});}   // y despierta el buscador de recuerdos
async function local(parts,onText,opc={}){
  const otro=opc.otro??hayOtro();
  // 2.28.1: si Ollama aun así dice que no cupo (su conteo real es distinto), se vuelve a armar más chico en vez de tronar
  try{return await local1(parts,onText,otro,opc.apretar||1);}
  catch(e){if(!noCupo(e))throw e;if(otro)throw new Error('NOCABE');const ap=(opc.apretar||1)*.6;if(ap<.2)throw e;
    log('🧠 Ollama dijo que no cupo: lo armo más chico','y');return local(parts,onText,{...opc,otro,apretar:ap});}}
async function local1(parts,onText,otro,apretar){
  const {m2,ctx,firma:fi}=armaGPU(parts,otro,apretar);prefijoGPU=fi;
  const body={model:cer.modelo,messages:m2,stream:true,keep_alive:VIVO,options:{temperature:1,num_ctx:ctx}};
  if(/qwen3|deepseek-r1/i.test(cer.modelo))body.think=false;
  // tope para la primera palabra (solo si hay otro cerebro que pueda contestar)
  const ac=new AbortController(),sg=[ac.signal];const ext=window.capriSenal?.();if(ext)sg.push(ext);
  const espera=otro?(Date.now()-caliente<100*60e3?GPU_ESPERA.caliente:GPU_ESPERA.fria):0;
  const tLenta=espera?setTimeout(()=>ac.abort(new Error('LENTA')),espera):0;
  try{
    const r=await fetch(OLL+'/api/chat',{method:'POST',body:JSON.stringify(body),signal:sg.length>1?AbortSignal.any(sg):sg[0]});   // se corta si cancelas o se traba
    if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error('GPU: '+(j.error||'Error '+r.status));}
    const reader=r.body.getReader(),dec=new TextDecoder();let buf='',raw='',sent=0;
    while(true){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
      while((i=buf.indexOf('\n'))>=0){const ln=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!ln)continue;
        try{const j=JSON.parse(ln);if(j.error)throw new Error('GPU: '+j.error);raw+=j.message?.content||'';
          const vis=raw.replace(/<think>[\s\S]*?(<\/think>|$)/g,'');if(vis.trim()&&tLenta){clearTimeout(tLenta);}
          if(vis.length>sent){onText(vis.slice(sent));sent=vis.length;}}
        catch(e){if(/^GPU/.test(e.message))throw e;}}}
    const full=raw.replace(/<think>[\s\S]*?(<\/think>|$)/g,'');if(!full.trim())throw new Error('EMPTY');
    marca('GPU · '+cer.modelo);return full;}
  catch(e){if(ac.signal.aborted&&!ext?.aborted){gpuLentaHasta=Date.now()+GPU_PAUSA;throw new Error('LENTA');}throw e;}
  finally{clearTimeout(tLenta);}}
function marca(quien){ultimo=quien;const el=$('mdl');if(el)el.textContent=quien==='nube'?(cfg.model||'—'):quien;log('cerebro: '+(quien==='nube'?'Gemini':quien),'g');pinta();}

// ---------- pensar con Claude ----------
let claudeFuera=0;
const claudeOk=()=>cer.claude!=='off'&&!!cfg.claudeKey&&claudeSpent<cer.tope&&Date.now()>claudeFuera;
function rutaClaude(parts){if(!claudeOk()||window.cerebroSinGasto||modoAct==='watch'||modoAct==='idle')return false;
  if(parts.some(p=>p.inlineData&&/^audio/.test(p.inlineData.mimeType)))return false;   // Claude no oye audio: la voz sigue en Gemini
  if(cer.claude!=='siempre'&&window.lecturaPesada?.()>40000)return false;   // documentos enteros: Gemini los lee sin gastar tu saldo de Claude
  if(cer.claude==='siempre')return true;
  const t=parts.map(p=>p.text||'').join(' ');
  return parts.some(p=>p.inlineData)||(cfg.study&&!!studyText())||t.length>=260||PESADO.test(t)||SALUD.test(t);}
async function claudeBrain(parts,onText){
  const [base,hora]=sysPrompt();
  // lo que no cambia va primero y se marca para caché (Anthropic lo relee más rápido y cobra menos); la plática también
  const system=[{type:'text',text:base,cache_control:{type:'ephemeral'}}];
  const msgs=[];const add=(role,content)=>{const l=msgs[msgs.length-1];if(l&&l.role===role)l.content.push(...content);else msgs.push({role,content:[...content]});};
  for(const h of ventanaHist(history,16,4))add(h.role==='model'?'assistant':'user',[{type:'text',text:h.text}]);
  while(msgs.length&&msgs[0].role!=='user')msgs.shift();
  if(msgs.length>1){const l=msgs.at(-1).content;l[l.length-1]={...l[l.length-1],cache_control:{type:'ephemeral'}};}
  const cur=[{type:'text',text:notaAhora(hora)}];for(const p of [...studyPdfParts(),...parts]){const d=p.inlineData;
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

// ---------- más cerebros de respaldo (2.29): Groq y OpenRouter ----------
// Si Gemini no contesta (sin cupo, Google saturado, sin key) o tu GPU se tarda y no hay Gemini, antes de caer al cerebro
// chico de tu GPU prueba estos dos, cada uno con su key gratis. Groq va primero porque es el más rápido; OpenRouter
// después porque tiene los modelos gratis que mejor razonan (DeepSeek). Hablan el mismo idioma que OpenAI (chat/completions).
// Lo que les manda se arma con armaChat, igual que para tu GPU: nunca se pasa de su tope de tokens (el bug de 2.28.1).
const NUBES={
  groq:{nom:'Groq',api:'https://api.groq.com/openai/v1/',def:'llama-3.3-70b-versatile',lim:6000,max:1024,frag:2500,hist:10,espera:20e3,
    llave:'gsk_…',donde:'console.groq.com/keys',
    sugeridos:[['llama-3.3-70b-versatile','Llama 3.3 70B · el más rápido'],['moonshotai/kimi-k2-instruct-0905','Kimi K2 · más listo, también rápido'],['openai/gpt-oss-120b','GPT-OSS 120B · razona'],['llama-3.1-8b-instant','Llama 3.1 8B · instantáneo, el más simple']]},
  openrouter:{nom:'OpenRouter',api:'https://openrouter.ai/api/v1/',def:'deepseek/deepseek-chat-v3-0324:free',lim:24000,max:2048,frag:0,hist:16,espera:40e3,
    llave:'sk-or-…',donde:'openrouter.ai/keys',
    sugeridos:[['deepseek/deepseek-chat-v3-0324:free','DeepSeek V3 (gratis) · listo y sin pausa'],['deepseek/deepseek-r1-0528:free','DeepSeek R1 (gratis) · el que mejor razona, lento'],['moonshotai/kimi-k2:free','Kimi K2 (gratis)'],['meta-llama/llama-3.3-70b-instruct:free','Llama 3.3 70B (gratis)']]}};
const NUBES_ORDEN=['groq','openrouter'];
cfg.nubes=Object.assign({groq:{key:'',modelo:''},openrouter:{key:'',modelo:''}},cfg.nubes||{});
const nc=id=>cfg.nubes[id]||(cfg.nubes[id]={key:'',modelo:''});
const nubeFuera={},nubeVio={},nubeGasto={};   // nubeFuera: hasta cuándo descansa (sin cupo o key mala) · nubeVio: último modelo que contestó
const nubeModelo=id=>nc(id).modelo||NUBES[id].def;
const nubeOk=id=>!!nc(id).key&&Date.now()>(nubeFuera[id]||0)&&navigator.onLine!==false;
const nubesListas=()=>NUBES_ORDEN.filter(nubeOk);
const piensaLargo=m=>/deepseek-r1|qwq|gpt-oss|thinking|:thinking|reason/i.test(m);
// el tope real de cada modelo lo aprende de sus errores («Limit 6000, Requested 7400») y lo guarda
// capa gratis de Groq: cada modelo tiene su tope de tokens por minuto (llama 70B 12 000, Kimi 10 000, gpt-oss 8 000, 8B 6 000)
const LIM_MODELO={'llama-3.3-70b-versatile':9000,'moonshotai/kimi-k2-instruct-0905':8000,'moonshotai/kimi-k2-instruct':8000,'openai/gpt-oss-120b':7000,'llama-3.1-8b-instant':5000};
const nubeLim=(id,m)=>cer.nubeLim?.[id+'|'+m]||(id==='groq'&&LIM_MODELO[m])||NUBES[id].lim;
function aprendeLim(id,m,e){const x=String(e?.message||'').match(/limit[^0-9]{0,12}(\d{3,7})/i);if(!x)return false;
  const n=Math.floor(+x[1]*.85);if(!(n>=800)||n>=nubeLim(id,m))return false;cer.nubeLim=Object.assign(cer.nubeLim||{},{[id+'|'+m]:n});save();
  log('🧠 '+NUBES[id].nom+' · '+m+': su tope es '+x[1]+' tokens; desde ahora le mando hasta '+n,'y');return true;}
const muyGrande=e=>e?.status===413||/too large|context length|context_length|maximum context|reduce the length|tokens per minute|\bTPM\b/i.test(String(e?.message||''));
async function nube1(id,modelo,parts,onText,apretar){const N=NUBES[id],lim=Math.floor(nubeLim(id,modelo)*apretar);
  const reserva=Math.min(N.max,Math.floor(lim/3)),{m2}=armaChat(parts,{lim,otro:false,frag:N.frag,reserva:reserva+100,hist:N.hist,empiezaTu:true,quien:N.nom+' (tope '+lim+' tokens)'});
  const body={model:modelo,messages:m2,stream:true,temperature:1,max_tokens:reserva};
  const headers={'Content-Type':'application/json','Authorization':'Bearer '+nc(id).key};if(id==='openrouter')headers['X-Title']='Capri';
  const ac=new AbortController(),sg=[ac.signal];const ext=window.capriSenal?.();if(ext)sg.push(ext);
  const tLenta=setTimeout(()=>ac.abort(new Error('LENTA')),piensaLargo(modelo)?Math.max(N.espera,90e3):N.espera);
  try{const r=await fetch(N.api+'chat/completions',{method:'POST',headers,body:JSON.stringify(body),signal:sg.length>1?AbortSignal.any(sg):sg[0]});
    if(!r.ok){const j=await r.json().catch(()=>({}));const e=new Error(j.error?.message||j.message||('Error '+r.status));e.status=r.status;e.espera=+r.headers.get('retry-after')||0;throw e;}
    const reader=r.body.getReader(),dec=new TextDecoder();let buf='',raw='',sent=0,fin=false;
    while(!fin){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
      while((i=buf.indexOf('\n'))>=0){const ln=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!ln.startsWith('data:'))continue;const d=ln.slice(5).trim();
        if(d==='[DONE]'){fin=true;break;}let j;try{j=JSON.parse(d);}catch(_){continue;}
        if(j.error){const e=new Error(j.error.message||'error');e.status=+j.error.code||500;throw e;}
        const dl=j.choices?.[0]?.delta||{};if(dl.reasoning||dl.reasoning_content){clearTimeout(tLenta);window.capriLatido?.();}   // está pensando (R1): eso cuenta como señal de vida
        raw+=dl.content||'';const vis=raw.replace(/<think>[\s\S]*?(<\/think>|$)/g,'');
        if(vis.trim())clearTimeout(tLenta);if(vis.length>sent){onText(vis.slice(sent));sent=vis.length;}}}
    const full=raw.replace(/<think>[\s\S]*?(<\/think>|$)/g,'');if(!full.trim())throw new Error('EMPTY');
    nubeVio[id]=modelo;marca(N.nom+' · '+modelo.replace(/^[^/]+\//,''));return full;}
  catch(e){if(ac.signal.aborted&&!ext?.aborted)throw new Error('LENTA');throw e;}
  finally{clearTimeout(tLenta);}}
// pide a una nube: su modelo; si no cabe, lo arma más chico; si ese modelo no tiene cupo, prueba otros de la misma nube
async function nubePide(id,parts,onText){const N=NUBES[id],prim=nubeModelo(id);
  const otros=N.sugeridos.map(x=>x[0]).filter(m=>m!==prim&&(!cer.nubeMods?.[id]?.length||cer.nubeMods[id].includes(m)));
  let ult=null,dijo=false;const on=x=>{dijo=true;onText(x);},lista=[prim,...otros].slice(0,3);
  for(const m of lista){
    let ap=1;
    for(let k=0;k<4&&ap>=.35;k++){
      try{return await nube1(id,m,parts,on,ap);}
      catch(e){if(esCorte(e)||dijo)throw e;ult=e;
        if(!muyGrande(e))break;
        if(aprendeLim(id,m,e))continue;                  // ya sabe su tope real: vuelve a armarlo a ese tamaño
        if(e.status===429)break;                         // sin cupo este minuto (no es que no quepa): otro modelo
        log('🧠 '+N.nom+' dijo que no cupo: lo armo más chico','y');ap*=.6;}}
    if(!ult||!(ult.status===429||ult.status===404||ult.status>=500||ult.message==='LENTA'||muyGrande(ult)))throw ult;
    if(m!==lista.at(-1))log('🧠 '+N.nom+' · '+m+' no pudo ('+(ult.status||ult.message)+'): pruebo otro modelo','y');}
  throw ult||new Error('EMPTY');}
function nubeFallo(id,e){const N=NUBES[id],m=String(e?.message||''),key=e?.status===401||e?.status===403,cupo=e?.status===429||e?.status===402;
  nubeFuera[id]=Date.now()+(key?30*60e3:cupo?Math.max(60e3,(e.espera||0)*1000):e?.message==='LENTA'?5*60e3:2*60e3);
  log(N.nom+': '+(e?.status||'')+' '+m.slice(0,120),'w');
  if(key)line('s','(La key de '+N.nom+' no es válida o no tiene permiso. Revísala en AJUSTES → Cerebros de respaldo.)');
  pinta();}
// prueba las nubes en orden; porque = lo que se le dice a Kiga la primera vez
async function respaldoNubes(parts,onText,porque){let ult=null,prev='';
  for(const id of nubesListas()){const N=NUBES[id];let dijo=false;
    line('s','('+(prev?prev+' tampoco pudo':porque)+'; te contesto con '+N.nom+'.)');prev=N.nom;window.capriLatido?.();
    try{return await nubePide(id,parts,x=>{dijo=true;onText(x);});}
    catch(e){if(esCorte(e)||dijo)throw e;nubeFallo(id,e);ult=e;}}
  throw ult||new Error('SIN_NUBES');}
const sinFotos=parts=>!parts.some(p=>p.inlineData);   // estas nubes solo leen texto: lo que trae imagen, audio o PDF se queda en Gemini/Claude
window.capriNubes=()=>NUBES_ORDEN.map(id=>({id,nom:NUBES[id].nom,key:!!nc(id).key,ok:nubeOk(id),modelo:nubeModelo(id),fuera:nubeFuera[id]||0}));

// ---------- el que decide ----------
const _ask=ask;
let preRec=null;
const conTope=(pr,ms,tarde)=>new Promise(res=>{const t=setTimeout(()=>{tarde?.();res('');},ms);Promise.resolve(pr).then(v=>{clearTimeout(t);res(v||'');},()=>{clearTimeout(t);res('');});});
ask=async(parts,onText)=>{
  // 2.28: buscar en los recuerdos no puede frenar la respuesta más de 1.2 s (antes hasta 4 s si el modelo de embeddings estaba dormido)
  const rec=await conTope(preRec||recordar(parts),1200,()=>log('🧠 recuerdos: tardaron, contesto sin ellos','y'));preRec=null;const p2=rec?[{text:rec},...parts]:parts;
  if(rutaClaude(parts)){let dijo=false;try{return await claudeBrain(p2,x=>{dijo=true;onText(x);});}catch(e){if(dijo||esCorte(e))throw e;claudeFallo(e);}}
  if(rutaLocal(parts)){let dijo=false;try{return await local(p2,x=>{dijo=true;onText(x);});}catch(e){if(esCorte(e))throw e;log(String(e.message).slice(0,60),'w');if(dijo||!hayOtro())throw e;
      const quien=hayNube()?'Gemini':nubesListas().length?NUBES[nubesListas()[0]].nom:'Claude';
      if(e.message==='LENTA')line('s','(Tu GPU tardó demasiado en contestar; te contesto con '+quien+'. Por 10 min la plática va directo ahí.)');
      else if(e.message==='NOCABE')log('🧠 la plática no cabe en el contexto de tu GPU: contesta '+quien,'y');
      if(!hayNube()){
        if(nubesListas().length&&sinFotos(parts)){try{return await respaldoNubes(p2,onText,'Sin Gemini');}catch(e2){if(esCorte(e2))throw e2;}}
        if(claudeOk()&&!window.cerebroSinGasto){try{return await claudeBrain(p2,onText);}catch(e2){if(esCorte(e2))throw e2;claudeFallo(e2);}}
        throw e;}}}
  let algo=false;
  try{const t=await _ask(p2,x=>{algo=true;onText(x);});marca('nube');return t;}
  catch(e){if(esCorte(e))throw e;const caido=e.status===429||e.status>=500||e.message==='NOKEY'||e instanceof TypeError;
    const motivo=e.status===429?' (sin cupo)':e instanceof TypeError?' (sin internet)':e.status>=500?' (Google saturado, '+e.status+')':e.message==='NOKEY'?' (falta su key)':e.status?' ('+e.status+')':'';
    if(!algo&&caido&&claudeOk()&&!window.cerebroSinGasto&&!parts.some(p=>p.inlineData&&/^audio/.test(p.inlineData.mimeType))){
      line('s','(Gemini no respondió; te contesto con Claude.)');try{return await claudeBrain(p2,onText);}catch(e2){if(esCorte(e2))throw e2;claudeFallo(e2);}}
    // 2.29: antes de caer al cerebro chico de tu GPU, los de respaldo en la nube (Groq y luego OpenRouter)
    let probeNubes=false;
    if(!algo&&caido&&sinFotos(parts)&&nubesListas().length){probeNubes=true;
      try{return await respaldoNubes(p2,onText,'Gemini no respondió'+motivo);}catch(e2){if(esCorte(e2))throw e2;}}
    if(algo||!caido||!listo()||cer.modo==='gemini'||parts.some(p=>p.inlineData))throw e;
    line('s',probeNubes?'(Tampoco contestó ningún cerebro de respaldo; te contesto con el de tu GPU.)':'(Gemini no respondió'+motivo+'; te contesto con el cerebro de tu GPU.)');
    log('Gemini: '+(e.status||'')+' '+String(e.message).slice(0,120),'w');
    return local(p2,onText,{otro:false});}};
const _respond=respond;
// la búsqueda en recuerdos arranca ya, en paralelo con las fuentes médicas y la biblioteca, en vez de esperar a que terminen
respond=async(userText,extra,mode)=>{modoAct=mode||'user';if(mode!=='idle'&&mode!=='watch')pararFondo();preRec=recordar([{text:userText}]);try{return await _respond(userText,extra,mode);}finally{modoAct='user';preRec=null;guardaPlatica();}};

// ---------- memoria buscable ----------
let mems=[],db=null;
// v2 (2.9.1): además de las pláticas ('m'), un resumen por día ('dias')
const idb=()=>db||(db=new Promise((res,rej)=>{const o=indexedDB.open('capri-cerebro',2);o.onupgradeneeded=()=>{const d=o.result;if(!d.objectStoreNames.contains('m'))d.createObjectStore('m',{keyPath:'id',autoIncrement:true});
  if(!d.objectStoreNames.contains('dias'))d.createObjectStore('dias',{keyPath:'dia'});};o.onsuccess=()=>res(o.result);o.onerror=()=>rej(o.error);}));
const tx=async(mode,fn,st='m')=>{const d=await idb();return new Promise((res,rej)=>{const t=d.transaction(st,mode);const r=fn(t.objectStore(st));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});};
let dias=[];   // [{dia:'2026-10-28', resumen, n, ts}]
tx('readonly',s=>s.getAll()).then(a=>{mems=a||[];for(const m of mems){m.dia=m.dia||diaDe(m.ts);m.hilo=m.hilo||hiloDe(m.t);}pinta();}).catch(()=>{});
tx('readonly',s=>s.getAll(),'dias').then(a=>{dias=a||[];}).catch(()=>{});

// ---------- hilos de memoria ----------
// Todo se guarda (también la plática trivial del día a día), pero cada plática va a su hilo y cada día tiene su resumen,
// para que Capri recuerde tu vida diaria («¿qué te conté ayer?») sin revolverla con lo que estudias.
const HILOS={dia:'Día a día',personal:'Sobre ti y tu gente',estudio:'Estudio y salud',planes:'Planes y pendientes'};
const diaDe=ts=>{const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const sinAcento=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function hiloDe(txt){const u=sinAcento(String(txt).split('\nCapri:')[0]);
  if(/medic|salud|enferm|sintom|dolor|fiebre|diagnost|tratamiento|farmac|dosis|paciente|clinic|anatom|fisiolog|patolog|cirug|guardia|examen|parcial|apuntes|estudi|clase|tarea de|maestr|profe|universidad|escuela|ingles|toefl/.test(u))return 'estudio';
  if(/manana|pasado manana|tengo que|tengo cita|debo |recuerdame|pendiente|no se me olvide|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|a las \d|entrega|planeo|voy a ir|la proxima semana/.test(u))return 'planes';
  if(/\bmi (mama|papa|madre|padre|herman|novi|amig|abuel|tio|tia|prim|pareja|esposa|esposo|hij|famil|jefe|compa)|me siento|estoy (triste|feliz|cansad|enojad|estresad|aburrid|nervios|ansios)|me gusta|odio|mi cumple|me paso|me dijo|me dijeron/.test(u))return 'personal';
  return 'dia';}
let embedVivo=0;
const norm=v=>{let n=0;for(const x of v)n+=x*x;n=Math.sqrt(n)||1;return Float32Array.from(v,x=>x/n);};
// los embeddings van en el procesador (num_gpu 0) para no sacar de la tarjeta al modelo que platica: con 4 GB no caben los dos
async function embed(texts){if(!ok||!cer.emb)return null;
  const r=await fetch(OLL+'/api/embed',{method:'POST',body:JSON.stringify({model:cer.emb,input:texts,keep_alive:VIVO,options:{num_gpu:0}}),signal:AbortSignal.timeout(4000)});embedVivo=Date.now();
  if(!r.ok)return null;const j=await r.json();return (j.embeddings||[]).map(norm);}
const palabras=t=>new Set((t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').match(/[a-zñ0-9]{4,}/g)||[]));
const cos=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;};
let ultimaGuardada='',nuevas=0;
async function guardaPlatica(){if(!cer.aprende)return;const a=history.at(-1),u=history.at(-2);
  if(!a||!u||a.role!=='model'||u.role!=='user'||/^\(/.test(u.text))return;
  const txt=(cfg.name||'Kiga')+': '+u.text.slice(0,500)+'\nCapri: '+clean(a.text).replace(/^\[[a-z_]+\]\s*/i,'').slice(0,600);
  if(txt===ultimaGuardada)return;ultimaGuardada=txt;
  const imp=window.capriImportancia?window.capriImportancia(txt):1;   // la plática trivial también se guarda (hilo «Día a día»), solo pesa menos al buscar
  const e={t:txt,ts:Date.now(),imp,dia:diaDe(Date.now()),hilo:hiloDe(txt)};try{const v=await embed([txt]);if(v?.[0])e.v=v[0];}catch(_){}
  try{e.id=await tx('readwrite',s=>s.add(e));}catch(_){}mems.push(e);
  if(mems.length>20000){const viejo=mems.slice(0,2000).sort((a,b)=>((a.imp??1)-(b.imp??1))||(a.ts-b.ts))[0];mems=mems.filter(m=>m!==viejo);tx('readwrite',s=>s.delete(viejo.id)).catch(()=>{});}   // se va primero lo viejo y poco importante
  pinta();if(++nuevas>=6)setTimeout(destila,4000);}
async function recordar(parts){if(!cer.aprende||!mems.length)return '';
  const q=parts.filter(p=>p.text).map(p=>p.text).join(' ').slice(-500)||(history.at(-1)?.role==='user'?history.at(-1).text:'');
  if(q.length<8||modoAct==='watch')return '';
  const porDia=deDias(q);if(porDia)return porDia;
  const viejas=mems.filter(m=>Date.now()-m.ts>15*60e3);if(!viejas.length)return primeraDelDia();  // lo reciente ya va en la plática
  let top=[];const qv=viejas.some(m=>m.v)?await embed([q]).catch(()=>null):null;
  if(qv?.[0])top=viejas.filter(m=>m.v&&m.v.length===qv[0].length).map(m=>[cos(qv[0],m.v),m]).filter(x=>x[0]>.5);
  else{const W=palabras(q);if(W.size)top=viejas.map(m=>{const P=palabras(m.t);let n=0;for(const w of W)if(P.has(w))n++;return [n/Math.sqrt(W.size*Math.max(1,P.size)),m];}).filter(x=>x[0]>.18);}
  top=top.map(([s,m])=>[s*(.85+.08*(m.imp??1)),m]).sort((a,b)=>b[0]-a[0]).slice(0,3);   // a igual parecido, gana lo importante
  const oc=ocurrencia(q,new Set(top.map(x=>x[1]))),pd=primeraDelDia(),extra=[oc,pd].filter(Boolean).join('\n');
  if(!top.length)return extra;
  return `(Recuerdos de pláticas pasadas con ${cfg.name||'Kiga'} que pueden venir al caso. Úsalos solo si ayudan, sin decir que los buscaste:\n`+
    top.map(([,m])=>'- '+new Date(m.ts).toLocaleDateString('es-MX',{day:'numeric',month:'short'})+' ['+(HILOS[m.hilo]||'')+']: '+m.t.replace(/\n/g,' / ')).join('\n')+')'+(extra?'\n'+extra:'');}
// ---------- asociaciones (2.10): como a una persona, algo de ahora le recuerda una plática de hace días ----------
// Busca pláticas de hace más de un día que compartan algo poco común con lo de ahora (un nombre, un lugar, un tema raro),
// y se la «trae a la mente» a Capri para que la saque con naturalidad o con una broma. Máx. una cada 20 min.
let df=null,dfN=0,ultOcurr=+store.get('ocurrTs',0)||0,turnos=0;const pcache=new WeakMap();
const pal=m=>{let p=pcache.get(m);if(!p){p=palabras(m.t);pcache.set(m,p);}return p;};
function ocurrencia(q,ya){turnos++;if(mems.length<20||Date.now()-ultOcurr<20*60e3||turnos<3)return '';
  if(!df||Math.abs(mems.length-dfN)>40){df=new Map();for(const m of mems)for(const w of pal(m))df.set(w,(df.get(w)||0)+1);dfN=mems.length;}
  const raro=Math.max(3,mems.length*.02),W=[...palabras(q)].filter(w=>(df.get(w)||0)<=raro);if(!W.length)return '';
  const idf=w=>Math.log(1+mems.length/(1+(df.get(w)||0)));let best=null,bs=0,com=[];
  for(const m of mems){if(Date.now()-m.ts<20*3600e3||ya.has(m))continue;const P=pal(m),c=W.filter(w=>P.has(w));if(!c.length)continue;
    const s=c.reduce((a,w)=>a+idf(w),0)*(.9+.05*(m.imp??1));if(s>bs){bs=s;best=m;com=c;}}
  if(!best||bs<Math.log(1+mems.length/4))return '';
  ultOcurr=Date.now();store.set('ocurrTs',ultOcurr);turnos=0;const dd=Math.max(1,Math.round((Date.now()-best.ts)/864e5)),name=cfg.name||'Kiga';
  return `(Se te vino a la mente, como cuando a alguien algo le recuerda otra cosa: ${dd===1?'ayer':'hace '+dd+' días'} ${name} y tú platicaron esto: «${best.t.replace(/\n/g,' / ').slice(0,350)}». Lo que lo conecta con lo de ahora: ${com.slice(0,3).join(', ')}. Si de verdad conecta, sácalo con naturalidad y con tu humor («oye, esto me recordó cuando…», una broma ligera o preguntar cómo siguió). Si no viene al caso, ignóralo. No digas que lo buscaste.)`;}
// «¿qué te conté ayer?», «el lunes», «hace 3 días», «la semana pasada»: se trae ese día completo (su resumen y sus pláticas)
const DSEM=['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
function diasPedidos(q){const u=sinAcento(q),hoy=new Date();hoy.setHours(12,0,0,0);const d=n=>diaDe(hoy.getTime()-n*864e5);
  if(!/(te (conte|dije|platique|hable)|hablamos|platicamos|paso|hice|fui|que onda con|recuerdas|te acuerdas|como me fue)/.test(u)&&!/\b(ayer|antier|anteayer|hace \d+ dias?|la semana pasada|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)( pasado)?)\b/.test(u))return null;
  if(/\bantier|anteayer\b/.test(u))return [d(2)];if(/\bayer\b/.test(u))return [d(1)];
  const h=u.match(/hace (\d+) dias?/);if(h)return [d(+h[1])];if(/la semana pasada/.test(u))return [7,8,9,10,11,12,13].map(d);
  const w=u.match(/\bel (lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);if(w){let n=(hoy.getDay()-DSEM.indexOf(w[1])+7)%7||7;return [d(n)];}
  if(/\bhoy|en la manana|hace rato\b/.test(u))return [d(0)];return null;}
function deDias(q){const ds=diasPedidos(q);if(!ds)return '';const out=[];
  for(const dia of ds){const r=dias.find(x=>x.dia===dia),ms=mems.filter(m=>m.dia===dia).slice(-8);if(!r&&!ms.length)continue;
    out.push(`${new Date(dia+'T12:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}:`+(r?.resumen?'\nResumen: '+r.resumen:'')+(ms.length?'\n'+ms.map(m=>'- '+m.t.replace(/\n/g,' / ').slice(0,400)).join('\n'):''));}
  if(!out.length)return `(${cfg.name||'Kiga'} pregunta por un día del que no tienes pláticas guardadas: dilo con honestidad, no inventes.)`;
  return `(Lo que platicaron ese día, de tus hilos de memoria. Úsalo con naturalidad, sin decir que lo buscaste:\n${out.join('\n\n')})`;}
// en la primera plática del día, Capri tiene presente cómo le fue ayer (o el último día que hablaron)
let primeraDada=store.get('hiloPrimera','');
function primeraDelDia(){const hoy=diaDe(Date.now());if(primeraDada===hoy)return '';const r=dias.filter(x=>x.dia<hoy&&x.resumen).sort((a,b)=>b.dia.localeCompare(a.dia))[0];
  primeraDada=hoy;store.set('hiloPrimera',hoy);if(!r)return '';
  return `(Lo último de su vida que tienes en tus hilos, del ${new Date(r.dia+'T12:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}: ${r.resumen}. Si viene al caso, pregúntale cómo siguió.)`;}
// resumen de cada día ya terminado: con tu GPU si está (gratis y privado); si no, Gemini. Uno a la vez, cuando no estás usando a Capri.
let resumiendo=false;
// 2.27.1: Ollama atiende de uno en uno. Si estaba resumiendo un día o destilando recuerdos y le hablas, tu pregunta se formaba
// detrás (con una GPU de 4 GB, hasta un minuto). Ahora esos trabajos de fondo se cortan en cuanto le escribes o le hablas.
const fondos=new Set();
const senalFondo=()=>{const c=new AbortController();fondos.add(c);setTimeout(()=>fondos.delete(c),180e3);return AbortSignal.any([c.signal,AbortSignal.timeout(180e3)]);};
function pararFondo(){let n=0;for(const c of fondos)if(!c.signal.aborted){c.abort();n++;}fondos.clear();if(n)log('🧠 dejé lo que hacía en tu GPU para contestarte','g');}
async function resumeDia(dia,forzar){if(resumiendo)return false;const ms=mems.filter(m=>m.dia===dia);if(!ms.length)return false;
  const ya=dias.find(x=>x.dia===dia);if(ya&&!forzar&&ya.n===ms.length)return false;resumiendo=true;
  const name=cfg.name||'Kiga',txt=ms.map(m=>m.t.replace(/\n/g,' / ').slice(0,500)).join('\n').slice(-12000);
  const sys=`Resume en 3 a 6 frases cortas, en tercera persona, el día de ${name} según sus pláticas con Capri: qué hizo, cómo se sintió, con quién estuvo, qué le preocupaba y qué quedó pendiente. Incluye detalles concretos (nombres, lugares, horas). Nada inventado. Solo el resumen, sin título.`;
  try{let r='';
    if(listo()){const j=await (await fetch(OLL+'/api/chat',{method:'POST',signal:senalFondo(),body:JSON.stringify({model:cer.modelo,stream:false,keep_alive:VIVO,...(/qwen3|deepseek-r1/i.test(cer.modelo)?{think:false}:{}),options:{temperature:.2,num_predict:260,num_ctx:ctxDe()},messages:[{role:'system',content:sys},{role:'user',content:txt.slice(-ctxDe()*2.5)}]})})).json();
      r=(j.message?.content||'').replace(/<think>[\s\S]*?<\/think>/g,'').trim();}
    else if(cfg.key&&cfg.model&&typeof gemUna==='function')r=(await gemUna([{text:sys+'\n\nPLÁTICAS:\n'+txt}],{temperature:.2,maxOutputTokens:400})).text;
    if(!r)return false;const d={dia,resumen:r.replace(/\s+/g,' ').trim(),n:ms.length,ts:Date.now()};
    await tx('readwrite',s=>s.put(d),'dias');dias=dias.filter(x=>x.dia!==dia).concat(d);log('🧵 resumí el '+dia+' ('+ms.length+' plática(s))','g');return true;}
  catch(e){log('resumen del día: '+String(e.message).slice(0,40),'w');return false;}finally{resumiendo=false;}}
setInterval(async()=>{if(busy||Date.now()-lastAct<3*60e3)return;const hoy=diaDe(Date.now());
  const pend=[...new Set(mems.map(m=>m.dia))].filter(d=>d<hoy&&!dias.some(x=>x.dia===d&&x.n===mems.filter(m=>m.dia===d).length)).sort().reverse()[0];if(pend)resumeDia(pend);},90e3);
// para la ventana de hilos (hilos.js)
window.hilosInfo=()=>({HILOS,mems,dias,diaDe});
window.hilosResumir=d=>resumeDia(d,true);
window.hilosBorrar=async id=>{mems=mems.filter(m=>m.id!==id);await tx('readwrite',s=>s.delete(id)).catch(()=>{});pinta();};
window.hilosCambiar=async(id,h)=>{const m=mems.find(x=>x.id===id);if(!m)return;m.hilo=h;await tx('readwrite',s=>s.put(m)).catch(()=>{});};
// cada 6 pláticas, la GPU relee lo último y saca datos nuevos y duraderos de ti para su memoria de siempre
async function destila(){if(!listo()||busy||!cer.aprende||nuevas<6)return;nuevas=0;const name=cfg.name||'Kiga';
  const ult=mems.slice(-6).map(m=>m.t).join('\n---\n'),ya=(M().hechos||[]).map(h=>'- '+h.t).join('\n');
  try{const r=await fetch(OLL+'/api/chat',{method:'POST',signal:senalFondo(),body:JSON.stringify({model:cer.modelo,stream:false,keep_alive:VIVO,...(/qwen3|deepseek-r1/i.test(cer.modelo)?{think:false}:{}),
      options:{temperature:.2,num_predict:220,num_ctx:ctxDe()},messages:[{role:'system',content:`Extraes datos duraderos sobre ${name} de sus pláticas con Capri. Responde SOLO con líneas así: <<recuerda: categoria | dato corto en tercera persona>>. Categorías: nombre, gusto, persona, vivencia, dia, escuela, otro. Máximo 3 líneas. Nada que ya esté en la lista, nada inventado, nada sobre Capri. Si no hay nada nuevo responde NADA.`},
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
 <h3>Velocidad <small style="font-weight:400">· turbo GPU</small></h3>
 <label>Turbo GPU<select id="ceTurbo"><option value="1">Activo: precalienta el modelo en tu tarjeta y ajusta el contexto para que quepa entero</option><option value="0">Apagado (como antes)</option></select></label>
 <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="ceBench" style="width:auto;flex:1;padding:8px 10px">⚡ Medir velocidad</button><button class="btn" id="ceOllT" style="width:auto;flex:1;padding:8px 10px;display:none">🔧 Turbo de Ollama</button></div>
 <small id="ceBenchOut"></small>
 <h3>Cerebro de Claude <small style="font-weight:400">· Anthropic</small></h3>
 <small id="ceClSt"></small>
 <label>Cuándo usa Claude<select id="ceCl"><option value="off">Apagado</option><option value="pesado">Para lo pesado (explicaciones, salud, estudio, imágenes)</option><option value="siempre">Siempre que se pueda (la voz sigue en Gemini)</option></select></label>
 <label>Tope de gasto en dólares (cuando llega, deja de usarlo)<input id="ceTope" type="number" min="0" step="0.5"></label>
 <small>Usa la key de «API key de Claude» de arriba y el modelo que elijas ahí. Cada respuesta cuesta centavos; Capri lleva la cuenta. La voz y lo que mira de tu pantalla siguen en Gemini.</small>`;
$('cClose')?.parentElement?.before(box);
// ---------- panel «Cerebros de respaldo» en Ajustes (2.29) ----------
const boxN=document.createElement('div');boxN.id='nubesBox';
boxN.innerHTML=`<h3>Cerebros de respaldo <small style="font-weight:400">· Groq y OpenRouter</small></h3>
 <small>Si Gemini no contesta (sin cupo, saturado o sin key), antes de usar el cerebro chico de tu GPU Capri prueba estos, en este orden. Los dos tienen capa gratis: solo crea tu key y pégala. Solo leen texto: lo que trae foto, voz o PDF sigue en Gemini.</small>
 ${NUBES_ORDEN.map((id,i)=>{const N=NUBES[id];return `<div class="nubeB" data-n="${id}" style="border-left:2px solid var(--cyan);padding-left:8px;margin:8px 0">
  <b>${i+1}. ${N.nom}</b> <small id="nuSt_${id}"></small>
  <label>API key de ${N.nom} (empieza con ${N.llave})<input id="nuK_${id}" type="password" placeholder="Pega aquí tu key de ${N.donde}" autocomplete="off"></label>
  <label>Modelo<select id="nuM_${id}"></select></label>
  <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="nuL_${id}" style="width:auto;flex:1;padding:8px 10px">Cargar modelos</button><button class="btn" id="nuT_${id}" style="width:auto;flex:1;padding:8px 10px">▶ Probar ${N.nom}</button></div>
  <small id="nuO_${id}"></small></div>`;}).join('')}
 <small>Groq: entra a <b>console.groq.com</b> → API Keys → Create. OpenRouter: <b>openrouter.ai</b> → Keys → Create (los modelos que terminan en <code>:free</code> no cuestan). Las keys se quedan solo en esta PC.</small>`;
box.before(boxN);
function pintaNubes(){for(const id of NUBES_ORDEN){const N=NUBES[id],c=nc(id),st=$('nuSt_'+id);if(!st)continue;
  const ki=$('nuK_'+id);if(document.activeElement!==ki)ki.value=c.key||'';
  const mods=[...N.sugeridos];for(const m of cer.nubeMods?.[id]||[])if(!mods.some(x=>x[0]===m))mods.push([m,m]);
  const cur=nubeModelo(id);if(!mods.some(x=>x[0]===cur))mods.unshift([cur,cur]);
  const s=$('nuM_'+id);s.innerHTML=mods.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');s.value=cur;
  const f=nubeFuera[id]||0;
  st.textContent=!c.key?'○ sin key':Date.now()<f?'✖ descansando '+Math.ceil((f-Date.now())/60e3)+' min (falló hace poco)':'● lista'+(nubeVio[id]?' · último que contestó: '+nubeVio[id]:'');
  st.style.color=!c.key?'var(--mut)':Date.now()<f?'#ffb000':'var(--grn)';}}
for(const id of NUBES_ORDEN){const N=NUBES[id];
  $('nuK_'+id).onchange=()=>{nc(id).key=$('nuK_'+id).value.trim();nubeFuera[id]=0;store.set('cfg',cfg);pintaNubes();};
  $('nuM_'+id).onchange=()=>{nc(id).modelo=$('nuM_'+id).value;nubeFuera[id]=0;store.set('cfg',cfg);pintaNubes();};
  $('nuL_'+id).onclick=async()=>{const o=$('nuO_'+id),k=$('nuK_'+id).value.trim();o.textContent='Buscando modelos…';
    try{const r=await fetch(N.api+'models',{headers:k?{Authorization:'Bearer '+k}:{},signal:AbortSignal.timeout(15e3)});const j=await r.json();
      if(!r.ok)throw new Error(r.status===401?'key inválida':j.error?.message||'Error '+r.status);
      let ms=(j.data||[]).map(m=>m.id).filter(Boolean);
      ms=id==='openrouter'?ms.filter(m=>/:free$/.test(m)):ms.filter(m=>!/whisper|tts|guard|embed|playai|orpheus|distil|compound/i.test(m));
      cer.nubeMods=Object.assign(cer.nubeMods||{},{[id]:ms.sort()});save();pintaNubes();o.textContent='✔ '+ms.length+' modelo(s)'+(id==='openrouter'?' gratis':'')+'. Los recomendados salen primero.';}
    catch(e){o.textContent='✖ '+String(e.message).slice(0,80);}};
  $('nuT_'+id).onclick=async()=>{const o=$('nuO_'+id);nc(id).key=$('nuK_'+id).value.trim();store.set('cfg',cfg);if(!nc(id).key){o.textContent='Primero pega tu key.';return;}
    o.textContent='Pensando con '+N.nom+' · '+nubeModelo(id)+'…';const t0=performance.now();let txt='';
    try{await nubePide(id,[{text:'Salúdame en una frase y dime con qué cerebro estás pensando.'}],x=>{txt+=x;o.textContent=clean(txt);});
      nubeFuera[id]=0;o.textContent=clean(txt).trim()+'  ·  '+((performance.now()-t0)/1000).toFixed(1)+' s';}
    catch(e){o.textContent='No se pudo: '+(e instanceof TypeError?'no hubo conexión (¿sin internet o bloqueado?)':e.message==='LENTA'?'tardó demasiado':String(e.message).slice(0,120));}
    pintaNubes();};}
function pinta(){btn.classList.toggle('act',cer.modo!=='gemini'&&listo());const st=$('ceSt');if(!st)return;
  st.textContent=ok?(chats().length?'● Conectado a Ollama · '+chats().length+' modelo(s) · memoria buscable: '+mems.length+' plática(s)'+(cer.emb?' (por significado)':' (por palabras: baja embeddinggemma para que busque mejor)')+(ultimo?' · último que contestó: '+(ultimo==='nube'?'Gemini':ultimo):''):'● Ollama está abierto pero no tiene modelos: baja uno (abajo dice cómo).')
    :'✖ No encontré Ollama en tu PC (o está cerrado). Sin él, todo va a Gemini.';
  st.style.color=ok&&chats().length?'var(--grn)':'#ffb000';
  const s=$('ceMod');s.innerHTML=chats().map(m=>`<option value="${m.n}">${m.n} · ${m.gb.toFixed(1)} GB${m.gb>3.6?' (grande para 4 GB)':''}</option>`).join('')||'<option value="">(ninguno)</option>';s.value=cer.modelo;
  $('ceModo').value=cer.modo;$('ceApr').value=cer.aprende?'1':'0';$('ceTurbo').value=cer.turbo?'1':'0';
  bCl.classList.toggle('act',claudeOk());$('ceCl').value=cer.claude;$('ceTope').value=cer.tope;
  const cs=$('ceClSt');cs.textContent=!cfg.claudeKey?'○ Listo para cuando tengas créditos: falta tu API key de Anthropic.':cer.claude==='off'?'○ Key puesta, pero Claude está apagado.':claudeSpent>=cer.tope?'✖ Llegó al tope: gastado '+usd(claudeSpent)+' de '+usd(cer.tope)+'.':Date.now()<claudeFuera?'✖ Claude no respondió hace poco (¿sin créditos?); lo vuelve a intentar en unos minutos.':'● Activo · gastado '+usd(claudeSpent)+' de '+usd(cer.tope)+' · modelo '+(cfg.claudeModel||'claude-opus-5-5');
  cs.style.color=claudeOk()?'var(--grn)':'#ffb000';pintaNubes();}
$('ceModo').onchange=()=>{cer.modo=$('ceModo').value;save();pinta();};
$('ceMod').onchange=()=>{cer.modelo=$('ceMod').value;save();pinta();if(cer.turbo)calentar(true);};
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
// ---------- prueba de velocidad: mide lo mismo antes y después, en tu PC ----------
async function medir(){const o=$('ceBenchOut');const R={ts:Date.now(),turbo:cer.turbo};
  // dibujo: cuadros por segundo de la página y con qué tarjeta dibuja
  R.fps=await new Promise(res=>{let n=0;const t0=performance.now();(function f(t){n++;if(t-t0<1000)requestAnimationFrame(f);else res(Math.round(n*1000/(t-t0)));})(t0);});
  const gi=await window.capriDesk?.gpuInfo?.().catch(()=>null);const act=gi?.devs?.find(d=>d.active)||gi?.devs?.[0];
  R.dibuja=act?({0x10de:'NVIDIA',0x8086:'Intel',0x1002:'AMD'}[act.vendor]||'GPU '+act.vendor.toString(16)):(gi===undefined?'navegador':'?');
  R.raster=gi?.st?.gpu_compositing||gi?.st?.rasterization||'';
  if(!await ver()||!cer.modelo){R.nota='sin Ollama';}
  else{if(cer.turbo)await calentar();const t0=performance.now();let pri=0,fin=null;o.textContent='Midiendo tu GPU con '+cer.modelo+'…';
    try{const r=await fetch(OLL+'/api/chat',{method:'POST',body:JSON.stringify({model:cer.modelo,stream:true,keep_alive:cer.turbo?VIVO:'30m',...(/qwen3|deepseek-r1/i.test(cer.modelo)?{think:false}:{}),
        options:{temperature:0,num_predict:96,num_ctx:cer.turbo?ctxDe():6144},messages:[{role:'user',content:'Describe en cinco frases cortas una ciudad de noche bajo la lluvia.'}]})});
      const rd=r.body.getReader(),dc=new TextDecoder();let buf='';
      while(true){const {value,done}=await rd.read();if(done)break;buf+=dc.decode(value,{stream:true});let i;
        while((i=buf.indexOf('\n'))>=0){const ln=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!ln)continue;const j=JSON.parse(ln);if(!pri&&j.message?.content)pri=performance.now()-t0;if(j.done)fin=j;}}
      R.modelo=cer.modelo;R.primera=Math.round(pri);R.total=Math.round(performance.now()-t0);
      if(fin){R.tps=fin.eval_duration?+(fin.eval_count/(fin.eval_duration/1e9)).toFixed(1):null;R.carga=Math.round((fin.load_duration||0)/1e6);R.lee=fin.prompt_eval_duration?Math.round(fin.prompt_eval_count/(fin.prompt_eval_duration/1e9)):null;}
      const g=await enGPU();R.gpu=g?.pct??null;R.ctx=cer.turbo?ctxDe():6144;}
    catch(e){R.nota='falló: '+String(e.message).slice(0,50);}}
  cer.medidas=[...(cer.medidas||[]),R].slice(-12);save();pintaMedidas();return R;}
const resumenMedida=R=>R.nota&&!R.modelo?`dibujo ${R.fps} fps (${R.dibuja}) · ${R.nota}`:
  `${R.turbo?'turbo':'normal'} · 1ª palabra ${(R.primera/1000).toFixed(2)} s · ${R.tps??'?'} palabras/s (tokens) · carga ${R.carga??'?'} ms · ${R.gpu??'?'}% en GPU · contexto ${R.ctx} · dibujo ${R.fps} fps (${R.dibuja})`;
function pintaMedidas(){const o=$('ceBenchOut');if(!o)return;const M=cer.medidas||[];
  o.innerHTML=M.length?M.slice(-6).reverse().map(R=>`<div>${new Date(R.ts).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · ${esc(resumenMedida(R))}</div>`).join('')+
    '<div style="color:var(--mut)">Para comparar: mide con Turbo apagado y luego encendido. La 1ª palabra baja sobre todo porque el modelo ya está cargado; las palabras/s suben cuando está 100% en GPU.</div>':'Aún no hay mediciones.';}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
$('ceTurbo').onchange=()=>{cer.turbo=$('ceTurbo').value==='1';save();if(cer.turbo)calentar(true);pinta();};
window.cerebroMedir=medir;window.cerebroMedidas=()=>(cer.medidas||[]).slice();window.cerebroResumen=resumenMedida;
$('ceBench').onclick=async()=>{const b=$('ceBench');b.disabled=true;b.textContent='⚡ Midiendo…';try{await medir();}finally{b.disabled=false;b.textContent='⚡ Medir velocidad';}};
if(window.capriDesk?.turboOllama)$('ceOllT').style.display='';
$('ceOllT').onclick=async()=>{if(!confirm('Turbo de Ollama: activa «flash attention» y guarda el contexto a 8 bits (OLLAMA_FLASH_ATTENTION=1 y OLLAMA_KV_CACHE_TYPE=q8_0 para tu usuario de Windows). Usa la mitad de memoria de video para el contexto, así el modelo cabe entero en tu tarjeta.\n\nSe va a cerrar y volver a abrir Ollama. ¿Seguimos?'))return;
  const r=await window.capriDesk.turboOllama();$('ceOut').textContent=r?.ok?'🔧 Listo: Ollama se reinició con flash attention y caché a 8 bits. Mide otra vez en unos segundos.':'No se pudo ('+(r?.why||'error')+').';
  caliente=0;setTimeout(()=>ver(),6000);};
pintaMedidas();
// en el chat: «velocidad» mide y te dice cómo va
const _sendV=send;
send=async v=>{const k=(v||'').trim().toLowerCase();if(/^(velocidad|prueba de velocidad)$/.test(k)&&!busy){line('u',v.trim());line('s','(⚡ Midiendo…)');const R=await medir();line('s','(⚡ '+resumenMedida(R)+')');return;}
  await _sendV(v);if(k==='help')line('t','  velocidad — Mide qué tan rápido piensa tu GPU y con qué tarjeta dibuja Capri');};
pinta();
})();
