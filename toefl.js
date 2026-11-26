// ================= INGLÉS · PROFE DE TOEFL (2.25) =================
// Pestaña INGLÉS del HUD. Capri como docente de TOEFL iBT que funciona SIN IA: todo lo calcula su cerebro Python
// (capri-cerebro/toefl_offline.py + ingles_offline.py) con reglas, un banco de prácticas y tu progreso guardado en tu PC.
//  · Inicio: tu banda estimada (1–6 / CEFR), racha, lo que te conviene practicar y «pregúntale al profe».
//  · Practicar: las tareas del examen (Complete the Words, Build a Sentence, lecturas, Email, Academic Discussion,
//    Listen and Repeat, Interview, dictado) con tiempo, calificación y explicación.
//  · Vocabulario: 120 palabras académicas con repaso espaciado.  · Examen: formato, puntaje, estrategias y plantillas.
//  · Traductor: inglés↔español y corrector sin IA.  · Plan: meta y fecha del examen → plan por semanas.
//  · Resolver quiz (2.26): pegas preguntas de opción múltiple de tus clases y te dice el inciso correcto, por qué,
//    y por qué cada uno de los otros está mal (quiz_toefl.py, ~120 reglas de gramática).
// Si el cerebro Python no está prendido, la pestaña lo dice y ofrece el modo profe con Gemini (ingles.js).
(()=>{
const T=Object.assign({mod:'inicio'},store.get('toefl',{}));const save=()=>store.set('toefl',T);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=(r,b,ms=8000)=>window.cerebroPost?window.cerebroPost(r,b||{},ms):Promise.reject(new Error('sin cerebro'));
const vivo=()=>!!window.cerebroPyInfo?.().vivo;
const NOM={completar:'Complete the Words',ordenar:'Build a Sentence',lectura:'Lectura (diaria / académica)',correo:'Write an Email',discusion:'Academic Discussion',repetir:'Listen and Repeat',entrevista:'Take an Interview',dictado:'Dictado (listening)'};
const SECN={reading:'Reading',listening:'Listening',writing:'Writing',speaking:'Speaking'};
const MODS=[['inicio','Inicio','tu nivel y el profe'],['quiz','Resolver quiz','¿cuál inciso y por qué?'],['practicar','Practicar','tareas del examen'],['vocab','Vocabulario','palabras académicas'],['examen','El examen','formato y estrategias'],['traductor','Traductor','y corrector, sin IA'],['plan','Plan','meta y fecha']];

const css=document.createElement('style');css.textContent=`
#vIngles{padding:18px 22px}.tf{display:grid;grid-template-columns:200px 1fr;gap:20px;min-height:100%;font:13px/1.5 var(--mono);color:#ffd9dc}
.tf-nav{display:flex;flex-direction:column;gap:3px}.tf-nav .tt{font:700 30px/1 var(--sans);letter-spacing:.18em;color:var(--hr,#ff4d5e);text-shadow:0 0 18px var(--hr2,#ff4d5e55);margin-bottom:2px}
.tf-nav .sub{color:#a0565e;font-size:11px;margin-bottom:10px}
.tf-nav button{background:none;border:0;border-left:2px solid #3b1418;color:#ffd9dc;text-align:left;padding:7px 10px;font:12px var(--mono);cursor:pointer}
.tf-nav button small{display:block;color:#a0565e;font-size:10px}.tf-nav button:hover{border-color:var(--hr,#ff4d5e)}
.tf-nav button.on{border-color:var(--hc,#5ef6ff);color:var(--hc,#5ef6ff);background:rgba(94,246,255,.06)}
.tf h3{font:600 15px/1.2 var(--sans);letter-spacing:.1em;color:var(--hr,#ff4d5e);margin:0 0 8px;text-transform:uppercase}
.tf .bx{background:#0f0b0e;border:1px solid #3b1418;padding:14px 16px;margin-bottom:14px}
.tf .mut{color:#a0565e;font-size:11.5px}.tf .ok{color:#2dff8f}.tf .no{color:#ff4d5e}.tf .cy{color:#5ef6ff}
.tf .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.tf .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.tf .band{font:700 44px/1 var(--sans);color:#5ef6ff;text-shadow:0 0 16px #5ef6ff55}.tf .band small{font:12px var(--mono);color:#a0565e;margin-left:6px}
.tf .sec{border:1px solid #2a1418;padding:10px}.tf .sec b{display:block;font:700 22px/1 var(--sans);color:#ffd9dc;margin:4px 0}
.tf .bar{height:5px;background:#2a1418}.tf .bar i{display:block;height:100%;background:linear-gradient(90deg,#ff4d5e,#5ef6ff)}
.tf .btn2{background:#1a0e12;border:1px solid #ff4d5e88;color:#ffd9dc;font:12px var(--mono);padding:7px 12px;cursor:pointer;margin:4px 6px 4px 0}
.tf .btn2:hover{border-color:#5ef6ff;color:#fff}.tf .btn2.c{border-color:#5ef6ff;color:#5ef6ff}
.tf .tipos{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin-bottom:14px}
.tf .tipos button{text-align:left;background:#120c10;border:1px solid #3b1418;color:#ffd9dc;padding:9px 10px;font:12px var(--mono);cursor:pointer}
.tf .tipos button small{display:block;color:#a0565e;font-size:10px}.tf .tipos button.on,.tf .tipos button:hover{border-color:#5ef6ff}
.tf textarea,.tf input[type=text],.tf input[type=date],.tf input[type=number],.tf select{width:100%;box-sizing:border-box;background:#0a0709;border:1px solid #3b1418;color:#fff;font:13px/1.5 var(--mono);padding:8px;outline:0}
.tf textarea{min-height:170px;resize:vertical}.tf textarea:focus,.tf input:focus{border-color:#5ef6ff}
.tf .para{font:15px/2.1 Georgia,serif;color:#f4e9ea}.tf .para input{width:auto;display:inline-block;padding:0 3px;font:15px Georgia,serif;border:0;border-bottom:1px dashed #5ef6ff;background:#0d1a1c;color:#5ef6ff}
.tf .para input.bien{border-color:#2dff8f;color:#2dff8f}.tf .para input.mal{border-color:#ff4d5e;color:#ff9aa3}
.tf .chips{display:flex;flex-wrap:wrap;gap:6px;min-height:38px;padding:6px;border:1px dashed #3b1418;margin:8px 0}
.tf .chips button{background:#1a0e12;border:1px solid #5ef6ff66;color:#fff;font:13px var(--mono);padding:5px 9px;cursor:pointer}
.tf .q{margin:12px 0}.tf .q label{display:block;padding:4px 6px;cursor:pointer}.tf .q label:hover{background:#1a0e12}
.tf .q.bien{border-left:3px solid #2dff8f;padding-left:8px}.tf .q.mal{border-left:3px solid #ff4d5e;padding-left:8px}
.tf .post{border-left:2px solid #5ef6ff55;padding:4px 10px;margin:6px 0;color:#e8d6d8}.tf .post b{color:#5ef6ff}
.tf .tmr{float:right;font:700 18px var(--mono);color:#5ef6ff}.tf .tmr.fin{color:#ff4d5e}
.tf .res{border:1px solid #5ef6ff55;background:#081114;padding:12px 14px;margin-top:12px}.tf .res ul{margin:6px 0 6px 18px;padding:0}
.tf pre{white-space:pre-wrap;font:12.5px/1.5 var(--mono);color:#e8d6d8;margin:6px 0}
.tf .card{text-align:center;padding:26px 16px}.tf .card .w{font:700 30px/1.2 var(--sans);color:#5ef6ff}.tf .card .e{color:#e8d6d8;font-style:italic;margin:8px 0}
.tf .card .s{font:18px var(--sans);color:#2dff8f;margin:10px 0;min-height:24px}
@media (max-width:980px){.tf{grid-template-columns:1fr}.tf-nav{flex-direction:row;flex-wrap:wrap}.tf-nav .tt,.tf-nav .sub{width:100%}.tf .g2,.tf .g4{grid-template-columns:1fr 1fr}}`;
document.head.appendChild(css);

let sec=null,item=null,res=null,tmr=null,vocab=null,vi=0,ver=false,cache={};
const $t=id=>sec?.querySelector('#'+id);
function voces(){return (speechSynthesis?.getVoices?.()||[]).filter(v=>/^en[-_]/i.test(v.lang));}
function decir(txt,rate=.92){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt);const v=voces().find(v=>/en[-_]US/i.test(v.lang))||voces()[0];if(v){u.voice=v;u.lang=v.lang;}else u.lang='en-US';u.rate=rate;speechSynthesis.speak(u);return true;}catch(e){return false;}}
function reloj(seg,el){clearInterval(tmr);let t=seg;const pinta=()=>{if(!el.isConnected)return clearInterval(tmr);el.textContent=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');el.classList.toggle('fin',t<=0);};pinta();
  tmr=setInterval(()=>{t--;pinta();if(t<=0)clearInterval(tmr);},1000);}

// ---------- vistas ----------
function sinCerebro(){return `<div class="bx"><h3>Necesito mi cerebro Python</h3><p>El profe de TOEFL sin IA vive en mi cerebro Python (carpeta <b>capri-cerebro</b>). Ábrelo con <b>Capri-Cerebro.exe</b> o <b>run.bat</b> y esta pestaña se prende sola.</p>
  <p class="mut">Mientras, puedes usar mi modo profe con Gemini: escribe <b>inglés</b> en el chat.</p><button class="btn2" data-a="reintentar">Buscar de nuevo</button> <button class="btn2" data-a="gemini">Modo profe con Gemini</button></div>`;}
async function vInicio(){const p=await api('/api/toefl/progreso');cache.prog=p;const s=p.secciones;
  return `<div class="g2"><div class="bx"><h3>Tu nivel estimado</h3><div class="band">${p.banda??'—'}<small>${p.cefr?p.cefr+' · escala 1–6':'haz prácticas para medirte'}</small></div>
   <p class="mut">${p.practicas} prácticas · racha ${p.racha} día(s)${p.meta?.banda?' · meta '+p.meta.banda:''}${p.meta?.fecha?' · examen '+esc(p.meta.fecha):''}</p></div>
   <div class="bx"><h3>Pregúntale al profe</h3><input type="text" id="tfAsk" placeholder="¿cómo se califica el writing? · plantilla email · tips reading"><div id="tfAskR"></div></div></div>
   <div class="bx"><h3>Por sección</h3><div class="g4">${Object.entries(s).map(([k,v])=>`<div class="sec"><span class="mut">${SECN[k]}</span><b>${v.banda??'—'}</b><div class="bar"><i style="width:${(v.banda||0)/6*100}%"></i></div><small class="mut">${v.intentos} intento(s)</small></div>`).join('')}</div>
   <p>Te conviene practicar: <b class="cy">${(p.siguiente||[]).map(k=>SECN[k]).join(' y ')}</b>.</p>
   <button class="btn2 c" data-a="sugerida">Dame una práctica de eso</button><button class="btn2" data-m="vocab">Repasar vocabulario (${p.vocab?.pendientes||0} pendientes)</button></div>
   <p class="mut">${esc(p.aviso||'')}</p>`;}
function vPracticar(){return `<div class="tipos">${Object.entries(NOM).map(([k,n])=>`<button data-t="${k}" class="${item?.tipo===k?'on':''}">${n}<small>${({completar:'Reading',lectura:'Reading',ordenar:'Writing',correo:'Writing · 7 min',discusion:'Writing · 10 min',repetir:'Speaking',entrevista:'Speaking · 45 s',dictado:'Listening'})[k]}</small></button>`).join('')}</div>
  <div id="tfItem">${item?pintaItem():'<p class="mut">Elige una tarea. Te califico al momento y te explico.</p>'}</div>`;}
function pintaItem(){const it=item;let h=`<div class="bx"><h3>${esc(NOM[it.tipo])}</h3><p class="mut">${esc(it.instrucciones)}</p>`;
  if(it.tipo==='completar'){let k=0;h+=`<p class="mut">${esc(it.titulo)}</p><div class="para">${it.partes.map(p=>typeof p==='string'?esc(p):`${esc(p.prefijo)}<input data-h="${k++}" size="${p.faltan+1}" maxlength="${p.faltan+3}" autocomplete="off" spellcheck="false">`).join('')}</div>`;}
  if(it.tipo==='ordenar')h+=`<p>Contexto: <b>${esc(it.pista)}</b></p><div class="chips" id="tfArma"></div><div class="chips" id="tfBanco">${it.pedazos.map((p,i)=>`<button data-p="${i}">${esc(p)}</button>`).join('')}</div><span class="mut">Toca los pedazos en orden. Termina con «${esc(it.final)}».</span> <button class="btn2" data-a="limpiar">Volver a empezar</button>`;
  if(it.tipo==='lectura')h+=`<p class="mut">${esc(it.clase)} · ${esc(it.titulo)}</p><div class="para" style="line-height:1.7">${esc(it.texto)}</div>${it.preguntas.map((q,i)=>`<div class="q" data-q="${i}"><b>${i+1}. ${esc(q.q)}</b>${q.opciones.map((o,j)=>`<label><input type="radio" name="tfq${i}" value="${j}"> ${'ABCD'[j]}) ${esc(o)}</label>`).join('')}</div>`).join('')}`;
  if(it.tipo==='correo')h+=`<span class="tmr" id="tfTmr"></span><p>${esc(it.situacion)}</p><p>En tu correo:</p><ul>${it.puntos.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><textarea id="tfTxt" placeholder="Dear …" spellcheck="false"></textarea><small class="mut" id="tfCnt">0 palabras · meta ${it.meta_palabras}+</small>`;
  if(it.tipo==='discusion')h+=`<span class="tmr" id="tfTmr"></span><div class="post"><b>Profesor:</b> ${esc(it.profesor)}</div>${it.alumnos.map(a=>`<div class="post"><b>${esc(a.nombre)}:</b> ${esc(a.texto)}</div>`).join('')}<textarea id="tfTxt" placeholder="In my opinion…" spellcheck="false"></textarea><small class="mut" id="tfCnt">0 palabras · meta ${it.meta_palabras}+</small>`;
  if(it.tipo==='repetir'||it.tipo==='dictado')h+=`<button class="btn2 c" data-a="oir">▶ Oír</button><button class="btn2" data-a="oirlento">▶ Más lento</button>${it.tipo==='repetir'?' <span class="mut">Repítela en voz alta, igualita. Luego escribe lo que dijiste:</span>':''}<input type="text" id="tfTxt" placeholder="escribe lo que oíste" autocomplete="off" spellcheck="false" style="margin-top:8px">`;
  if(it.tipo==='entrevista')h+=`<span class="tmr" id="tfTmr"></span><button class="btn2 c" data-a="oirq">▶ Oír la pregunta</button><button class="btn2" data-a="verq">Ver la pregunta</button><p id="tfQ" style="display:none"><b>${esc(it.pregunta)}</b></p>
    ${(window.SpeechRecognition||window.webkitSpeechRecognition)?'<button class="btn2" data-a="dictar">🎤 Dictar</button>':''}<textarea id="tfTxt" placeholder="Contesta en voz alta y escribe (o dicta) lo que dijiste…" spellcheck="false"></textarea><small class="mut" id="tfCnt">0 palabras · ~${it.meta_palabras} en 45 s</small>`;
  h+=`<div><button class="btn2 c" data-a="calificar">Calificar</button><button class="btn2" data-a="otra">Otra</button></div>${res?pintaRes():''}</div>`;return h;}
function pintaRes(){const r=res;let h=`<div class="res"><b class="cy">Banda ${r.banda}</b> <span class="mut">(${r.pct}%)</span> `;
  if(r.tipo==='completar')h+=`${r.aciertos}/${r.total} palabras.${r.detalle.filter(d=>!d.bien).length?'<br>Correctas: '+r.detalle.filter(d=>!d.bien).map(d=>`<span class="no">${esc(d.diste)}</span> → <span class="ok">${esc(d.palabra)}</span>`).join(', '):''}`;
  if(r.tipo==='ordenar')h+=r.bien?'<span class="ok">¡Perfecta!</span>':`<span class="no">No quedó.</span><br>Correcta: <b class="ok">${esc(r.correcta)}</b><br><span class="mut">${esc(r.nota)}</span>`;
  if(r.tipo==='lectura')h+=`${r.aciertos}/${r.total}<ul>${r.detalle.map(d=>`<li class="${d.bien?'ok':'no'}">${esc(d.q)}<br><span style="color:#e8d6d8">${d.bien?'✓':'✗ Era '+'ABCD'[d.correcta]+') '+esc(d.texto_correcta)} — ${esc(d.porque)}</span></li>`).join('')}</ul>`;
  if(r.tipo==='repetir'||r.tipo==='dictado')h+=`parecido ${r.parecido}%<br>Era: <b class="ok">${esc(r.correcta)}</b>${r.faltan.length?'<br>Te faltó: <span class="no">'+esc(r.faltan.join(' '))+'</span>':''}${r.sobran.length?'<br>De más / distinto: <span class="no">'+esc(r.sobran.join(' '))+'</span>':''}`;
  if(r.puntos!=null)h+=`· <b>${r.puntos}/5</b> en la rúbrica · ${r.palabras} palabras
    ${r.bien.length?'<ul>'+r.bien.map(x=>`<li class="ok">${esc(x)}</li>`).join('')+'</ul>':''}${r.mejorar.length?'<b>Para subir:</b><ul>'+r.mejorar.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':''}
    ${r.errores?.length?'<b>Con correcciones:</b><pre>'+esc(r.corregido)+'</pre>':''}<details><summary class="cy" style="cursor:pointer">Plantilla</summary><pre>${esc(r.plantilla)}</pre></details><p class="mut">${esc(r.aviso)}</p>`;
  return h+'</div>';}
async function vVocab(){if(!vocab||vi>=vocab.tarjetas.length){vocab=await api('/api/toefl/vocab',{n:12});vi=0;ver=false;}
  const c=vocab.tarjetas[vi];const top=`<p class="mut">${vocab.aprendidas} aprendidas · ${vocab.vistas}/${vocab.total} vistas · ${vocab.pendientes} para repasar hoy</p>`;
  if(!c)return top+'<div class="bx">¡Nada pendiente por hoy! Vuelve mañana.</div>';
  return top+`<div class="bx card"><div class="w">${esc(c.en)}</div><div class="e">“${esc(c.ejemplo)}”</div><div class="s">${ver?esc(c.es):''}</div>
   <button class="btn2" data-a="vdecir">▶ Oír</button>${ver?'<button class="btn2 c" data-a="vbien">Me la sabía</button><button class="btn2" data-a="vmal">No me la sabía</button>':'<button class="btn2 c" data-a="vver">Ver significado</button>'}
   <p class="mut">caja ${c.caja}/5 · tarjeta ${vi+1}/${vocab.tarjetas.length}</p></div>`;}
async function vExamen(){const e=cache.ex||(cache.ex=await api('/api/toefl/examen'));
  return `<div class="bx"><h3>${esc(e.nombre)} · ${esc(e.vigente)}</h3><p>${esc(e.puntaje)}</p><p>${esc(e.adaptativo)}</p><p class="mut">${esc(e.aviso)}</p></div>
  ${e.secciones.map(s=>`<div class="bx"><h3>${esc(s.nombre)}</h3><ul>${s.tareas.map(([n,t,d])=>`<li><b>${esc(n)}</b> — ${esc(d)} ${t?`<button class="btn2" data-t="${t}">practicar</button>`:''}</li>`).join('')}</ul>
   <b class="cy">Estrategias</b><ul>${(e.estrategias[s.id]||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
  <div class="bx"><h3>Plantillas</h3>${Object.entries(e.plantillas).map(([k,v])=>`<b class="cy">${esc(NOM[k]||k)}</b><pre>${esc(v)}</pre>`).join('')}</div>`;}
function vTraductor(){return `<div class="bx"><h3>Traductor y corrector sin IA</h3><textarea id="tfTr" placeholder="Escribe en inglés (o en español para pasarlo al inglés)…" style="min-height:110px">${esc(T.tr||'')}</textarea>
  <button class="btn2 c" data-a="traducir">Traducir</button><button class="btn2" data-a="corregir">Corregir mi inglés</button><button class="btn2" data-a="trdecir">▶ Oír</button><div id="tfTrR"></div>
  <p class="mut">Reglas y diccionario local: frases normales salen bien, las largas un poco robóticas. Enséñale palabras en el chat: <b>en: learn: word = palabra</b>.</p></div>`;}
async function vPlan(){const p=await api('/api/toefl/plan');
  return `<div class="bx"><h3>Tu meta</h3><div class="g2"><label>Banda objetivo (1–6)<input type="number" id="tfMb" min="1" max="6" step="0.5" value="${p.meta.banda||''}"></label><label>Fecha del examen<input type="date" id="tfMf" value="${esc(p.meta.fecha||'')}"></label></div>
   <button class="btn2 c" data-a="meta">Guardar</button> <span class="mut">${p.dias_al_examen!=null?p.dias_al_examen+' días al examen':'sin fecha: plan de 4 semanas'} · nivel ${p.nivel??'sin medir'}</span></div>
   ${p.semanas.map(s=>`<div class="bx"><h3>Semana ${s.semana} · foco ${esc(SECN[s.foco]||s.foco)}</h3><ul>${s.diario.map(d=>`<li>${esc(d)}</li>`).join('')}</ul><span class="mut">Fin de semana: ${esc(s.fin_de_semana)}</span></div>`).join('')}`;}
const QZ_EJ=`She ___ to school every day.
a) go
b) goes
c) going
d) gone

If I ___ rich, I would travel around the world.
a) am  b) were  c) will be  d) be

Find the error: The students (A) was very happy (B) because they (C) passed the exam (D) easily.`;
function vQuiz(){return `<div class="bx"><h3>Resolver quiz</h3>
  <p class="mut">Pega una o varias preguntas con sus incisos (a, b, c, d) tal como vienen en tu quiz. Te digo cuál es la correcta, por qué, y por qué las otras no.</p>
  <textarea id="tfQz" placeholder="She ___ to school every day.&#10;a) go&#10;b) goes&#10;c) going&#10;d) gone" style="min-height:150px">${esc(T.qz||'')}</textarea>
  <button class="btn2 c" data-a="quiz">Resolver</button><button class="btn2" data-a="qzej">Ejemplo</button><button class="btn2" data-a="qzlimpiar">Limpiar</button></div>
  <div id="tfQzR"></div>
  <div class="bx"><h3>Qué entiende</h3><ul>
   <li><b>Completar el hueco</b> (___): tiempos, verbo + -ing o to, modales, condicionales, comparativos, artículos, preposiciones, pronombres, who/which/whose, much/many…</li>
   <li><b>¿Cuál oración es correcta?</b> con oraciones completas como incisos.</li>
   <li><b>Encuentra el error</b> con partes marcadas (A) (B) (C) (D).</li>
   <li><b>Sinónimos</b> («closest in meaning to…») de su lista de vocabulario académico.</li>
   <li><b>Lectura</b> (pega el texto también) y cualquier pregunta que dependa del sentido: esas las contesta una IA.</li></ul>
   <p class="mut">Primero revisa con ~120 reglas de gramática. Lo que las reglas aseguran sale al momento y sin gastar nada. Lo que no aseguran se lo pregunta a Claude (si tienes key y saldo), a Gemini o a tu GPU, y te dice cuál lo resolvió. Sin ninguna IA, en esas te dice «no la puedo asegurar» en vez de adivinar. En el chat: <b>quiz: &lt;pregunta&gt;</b>.</p></div>`;}
// lo que las reglas no aseguran se lo pregunto a una IA: Claude (si tienes key y saldo), Gemini o tu GPU (Ollama)
async function quizIA(r,aviso){if(!r?.dudas?.length||!r.prompt_ia)return r;
  const ci=window.cerebroInfo?.()||{},red=navigator.onLine!==false;
  const opciones=[];
  if(red&&cfg.claudeKey&&ci.claude!=='off'&&!(ci.tope&&ci.gasto>=ci.tope))opciones.push(['Claude',async()=>(await claudeStream('Eres un profesor experto de inglés y TOEFL. Respondes solo JSON válido.',[{role:'user',content:r.prompt_ia}],()=>{},4096)).full]);
  if(red&&cfg.key&&cfg.model)opciones.push(['Gemini',async()=>(await gemUna([{text:r.prompt_ia}],{responseMimeType:'application/json',maxOutputTokens:4096})).text]);
  // 2.30: antes de tu GPU, los respaldos listos en la nube (Kimi K2 en Groq, DeepSeek en OpenRouter): más certeros que el cerebro chico
  if(red&&ci.nubes?.length&&window.cerebroNubeTexto)opciones.push([ci.nubes.map(id=>id==='groq'?'Groq':'OpenRouter').join(' / '),async()=>{const x=await window.cerebroNubeTexto('Eres un profesor experto de inglés y TOEFL. Respondes solo JSON válido.',r.prompt_ia,25e3);if(!x)throw new Error('ninguna nube contestó');return x.texto;}]);
  if(ci.ok&&ci.modelo&&window.cerebroJSON)opciones.push(['tu GPU ('+ci.modelo+')',async()=>JSON.stringify(await window.cerebroJSON('Eres un profesor experto de inglés y TOEFL. Respondes solo JSON válido.',r.prompt_ia))]);
  // 2.30: cada cerebro tiene 25 s (40 s tu GPU); si se tarda, pasa al siguiente en vez de dejarte esperando
  const tope=(pr,ms)=>Promise.race([pr,new Promise((_,no)=>setTimeout(()=>no(new Error('tardó más de '+ms/1000+' s')),ms))]);
  for(const [quien,fn] of opciones){try{aviso?.(quien);const txt=await tope(fn(),/GPU/.test(quien)?40e3:25e3);
      const m=await api('/api/toefl/fusionar',{preguntas:r.preguntas,texto:txt,fuente:quien},10000);
      if(m.con_ia){log('quiz: '+m.con_ia+' pregunta(s) resueltas con '+quien,'g');return Object.assign({},m,{dudas:[]});}}
    catch(e){log('quiz: '+quien+' no pudo ('+String(e.message).slice(0,60)+')','w');}}
  return Object.assign({},r,{sinIA:!opciones.length});}
window.quizIA=quizIA;
function pintaQuiz(r){const out=$t('tfQzR');if(!out)return;
  if(!r.preguntas?.length){out.innerHTML=`<div class="bx"><pre>${esc(r.respuesta)}</pre></div>`;return;}
  const CONF={alta:'<span class="ok">segura (reglas de gramática)</span>',ia:'',media:'<span class="cy">confianza media</span>',baja:'<span class="no">no segura</span>'};
  out.innerHTML=(r.sinIA&&r.preguntas.some(q=>!q.correcta||q.confianza!=='alta')?'<div class="bx"><p class="cy">Hay preguntas que mis reglas no aseguran. Pon tu key de Gemini o de Claude en AJUSTES (o prende tu GPU) y las contesto bien.</p></div>':'')+
   r.preguntas.map((q,n)=>`<div class="bx qz"><div class="mut">${r.preguntas.length>1?(n+1)+' · ':''}${esc(q.tipo)} · ${q.fuente?'<span class="ok">resuelta con '+esc(q.fuente)+'</span>':(CONF[q.confianza]||'')}</div>
   <p><b>${esc(q.pregunta)}</b></p>
   ${q.correcta?`<p class="ok">✅ ${esc(q.correcta)}) ${esc(q.opciones.find(o=>o.letra===q.correcta)?.texto)}</p><p style="white-space:pre-wrap">${esc(q.explicacion)}</p>`
     :`<p class="cy">🤔 No la puedo asegurar. ${esc(q.explicacion||'')}</p>`}
   ${q.correcta?`<ul>${q.opciones.filter(o=>o.letra!==q.correcta).map(o=>{const p=o.problemas?.[0];
     const por=o.ia||(q.tipo==='encontrar el error'?'esta parte está bien escrita':p?p.mal:(!/vocabulario|lectura/.test(q.tipo)?(o.forma||'no encaja aquí'):''));
     return `<li><span class="no">✗</span> <b>${esc(o.letra)})</b> ${esc(o.texto)}${por?' — '+esc(por):''}${!o.ia&&p&&p.regla?`<br><span class="mut">Regla: ${esc(p.regla)}</span>`:''}</li>`;}).join('')}</ul>`:''}</div>`).join('');}
const VISTA={inicio:vInicio,quiz:vQuiz,practicar:vPracticar,vocab:vVocab,examen:vExamen,traductor:vTraductor,plan:vPlan};

let pint=0;
async function render(){if(!sec)return;const n=++pint;let html;
  if(!vivo())html=sinCerebro();else{try{html=await VISTA[T.mod]();}catch(e){html=sinCerebro()+`<p class="mut">(${esc(e.message)})</p>`;}}
  if(n!==pint)return;
  sec.innerHTML=`<div class="tf"><div class="tf-nav"><div class="tt">INGLÉS</div><div class="sub">tu profe de TOEFL · funciona sin IA</div>
   ${MODS.map(([k,t,s])=>`<button data-m="${k}" class="${T.mod===k?'on':''}">${t}<small>${s}</small></button>`).join('')}</div><div style="min-width:0">${html}</div></div>`;
  postRender();}
function postRender(){const it=item;if(T.mod!=='practicar'||!it)return;
  const tx=$t('tfTxt'),cnt=$t('tfCnt');if(tx&&cnt)tx.oninput=()=>{cnt.textContent=(tx.value.match(/[A-Za-z']+/g)||[]).length+' palabras · meta '+it.meta_palabras+'+';};
  if(!res&&it.minutos&&$t('tfTmr'))reloj(it.minutos*60,$t('tfTmr'));if(!res&&it.segundos&&$t('tfTmr'))reloj(it.segundos,$t('tfTmr'));
  if(it.tipo==='ordenar')pintaOrden();}
let orden=[];
function pintaOrden(){const a=$t('tfArma'),b=$t('tfBanco');if(!a)return;a.innerHTML=orden.map((i,k)=>`<button data-x="${k}">${esc(item.pedazos[i])}</button>`).join('')||'<span class="mut">tu oración…</span>';
  b.querySelectorAll('[data-p]').forEach(x=>x.style.visibility=orden.includes(+x.dataset.p)?'hidden':'visible');}

async function nueva(tipo){item=await api('/api/toefl/nueva',{tipo});res=null;orden=[];T.mod='practicar';save();await render();
  if(tipo==='dictado'||tipo==='repetir')setTimeout(()=>decir(item.decir),400);if(tipo==='entrevista')setTimeout(()=>decir(item.pregunta),400);}
function respuesta(){const it=item;
  if(it.tipo==='completar')return [...sec.querySelectorAll('.para input')].map(i=>i.value);
  if(it.tipo==='ordenar')return orden.map(i=>it.pedazos[i]).join(' ')+it.final;
  if(it.tipo==='lectura')return it.preguntas.map((q,i)=>sec.querySelector(`input[name=tfq${i}]:checked`)?.value??null);
  return $t('tfTxt')?.value||'';}
async function calificar(){const it=item;clearInterval(tmr);const valores=it.tipo==='completar'?respuesta():null;
  res=await api('/api/toefl/calificar',{tipo:it.tipo,id:it.id,respuesta:respuesta()});const txt=$t('tfTxt')?.value;await render();
  if(txt!=null&&$t('tfTxt')){$t('tfTxt').value=txt;$t('tfTxt').oninput?.();}
  if(it.tipo==='completar')sec.querySelectorAll('.para input').forEach((inp,k)=>{inp.value=valores[k]||'';const d=res.detalle[k];inp.classList.add(d?.bien?'bien':'mal');});
  if(it.tipo==='lectura'){const prev=res.detalle;sec.querySelectorAll('.q').forEach((q,i)=>q.classList.add(prev[i].bien?'bien':'mal'));}
  if(it.tipo==='ordenar')pintaOrden();
  log('TOEFL: '+NOM[it.tipo]+' → banda '+res.banda,'g');}

async function accion(a,el){
  if(a==='reintentar'){window.cerebroPySync?.();return setTimeout(render,1500);}
  if(a==='gemini'){window.hudGo?.('capri',true);return setTimeout(()=>send('inglés'),300);}
  if(a==='sugerida'){const s=(cache.prog?.siguiente||['writing'])[0];return nueva({reading:'completar',writing:'discusion',speaking:'entrevista',listening:'dictado'}[s]||'ordenar');}
  if(a==='otra')return nueva(item.tipo);
  if(a==='calificar')return calificar();
  if(a==='limpiar'){orden=[];return pintaOrden();}
  if(a==='oir')return decir(item.decir);if(a==='oirlento')return decir(item.decir,.7);
  if(a==='oirq')return decir(item.pregunta);if(a==='verq'){$t('tfQ').style.display='block';return;}
  if(a==='dictar'){const R=window.SpeechRecognition||window.webkitSpeechRecognition;try{const r=new R();r.lang='en-US';r.interimResults=false;r.continuous=true;
    r.onresult=e=>{const t=[...e.results].map(x=>x[0].transcript).join(' ');const tx=$t('tfTxt');tx.value=(tx.value+' '+t).trim();tx.oninput?.();};r.onerror=()=>log('dictado no disponible sin internet','w');r.start();setTimeout(()=>{try{r.stop();}catch(e){}},47000);el.textContent='🎤 escuchando…';}catch(e){log('dictado no disponible','w');}return;}
  if(a==='vver'){ver=true;return render();}if(a==='vdecir')return decir(vocab.tarjetas[vi].en+'. '+vocab.tarjetas[vi].ejemplo);
  if(a==='vbien'||a==='vmal'){await api('/api/toefl/vocab',{palabra:vocab.tarjetas[vi].en,bien:a==='vbien'});vi++;ver=false;return render();}
  if(a==='traducir'||a==='corregir'){const t=$t('tfTr').value.trim();T.tr=t;save();if(!t)return;const out=$t('tfTrR');
    if(a==='corregir'){const c=await api('/api/ingles/corregir',{texto:t});out.innerHTML=c.correcciones.length?`<pre>${esc(c.texto)}</pre><ul>${c.correcciones.map(x=>`<li><span class="no">${esc(x.mal)}</span> → <span class="ok">${esc(x.bien)}</span>: ${esc(x.porque)}</li>`).join('')}</ul>`:'<p class="ok">No le encontré errores de los que conozco.</p>';return;}
    const d=await api('/api/ingles/detectar',{texto:t});const r=await api('/api/ingles/traducir',{texto:t,a:d.idioma==='es'?'en':'es'});
    out.innerHTML=`<pre>${esc(r.texto)}</pre><span class="mut">${d.idioma==='en'?(d.puro?'inglés puro':'inglés con algo de español: '+esc(d.es.join(', '))):d.idioma==='es'?'español → inglés palabra por palabra':esc(d.idioma)}${r.desconocidas?.length?' · no conozco: '+esc(r.desconocidas.join(', ')):''}</span>`;return;}
  if(a==='trdecir')return decir($t('tfTr').value);
  if(a==='quiz'){const t=$t('tfQz').value.trim();T.qz=t;save();if(!t)return;$t('tfQzR').innerHTML='<p class="mut">revisando…</p>';
    let r=await api('/api/toefl/resolver',{texto:t},10000);pintaQuiz(r);
    if(r.dudas?.length){const n=r.dudas.length;r=await quizIA(r,q=>{const o=$t('tfQzR');if(o)o.insertAdjacentHTML('afterbegin',`<p class="mut" id="tfQzIA">${n} pregunta(s) no son seguras con reglas: se las pregunto a ${esc(q)}…</p>`);});pintaQuiz(r);}
    log('quiz: '+(r.preguntas||[]).length+' pregunta(s)','g');return;}
  if(a==='qzej'){$t('tfQz').value=QZ_EJ;return accion('quiz');}
  if(a==='qzlimpiar'){$t('tfQz').value='';T.qz='';save();$t('tfQzR').innerHTML='';return;}
  if(a==='meta'){await api('/api/toefl/meta',{banda:+$t('tfMb').value||null,fecha:$t('tfMf').value||null});return render();}}

function montar(el){if(sec===el)return;sec=el;
  sec.addEventListener('click',e=>{const m=e.target.closest('[data-m]');if(m){T.mod=m.dataset.m;save();return render();}
    const t=e.target.closest('[data-t]');if(t)return nueva(t.dataset.t);
    const p=e.target.closest('[data-p]');if(p&&!orden.includes(+p.dataset.p)){orden.push(+p.dataset.p);return pintaOrden();}
    const x=e.target.closest('[data-x]');if(x){orden.splice(+x.dataset.x,1);return pintaOrden();}
    const a=e.target.closest('[data-a]');if(a)accion(a.dataset.a,a).catch(err=>log('TOEFL: '+err.message,'w'));});
  sec.addEventListener('keydown',async e=>{if(e.key!=='Enter')return;
    if(e.target.id==='tfAsk'){const q=e.target.value.trim();if(!q)return;const r=await api('/api/toefl/pregunta',{texto:q}).catch(()=>({}));
      $t('tfAskR').innerHTML=`<pre>${esc(r.respuesta||'Pregúntame del examen: secciones, puntaje, writing, speaking, plantillas, mi nivel, plan.')}</pre>`;}
    else if(e.target.id==='tfTxt'&&e.target.tagName==='INPUT')calificar();});}
addEventListener('hud:view',e=>{const {v,el}=e.detail||{};if(v!=='ingles'||!el)return;montar(el);render();});
// el chat es de una sola línea: al pegar un quiz con saltos de línea, los cambio por espacios para no pegar «day.a) go»
(()=>{const q=document.getElementById('q');if(!q)return;q.addEventListener('paste',e=>{const t=e.clipboardData?.getData('text')||'';if(!/\n/.test(t))return;
  e.preventDefault();const plano=t.replace(/\s*\r?\n\s*/g,' ').trim(),a=q.selectionStart??q.value.length,b=q.selectionEnd??a;
  q.value=q.value.slice(0,a)+plano+q.value.slice(b);q.selectionStart=q.selectionEnd=a+plano.length;q.dispatchEvent(new Event('input'));});})();
window.toeflQuiz=async t=>{if(window.hudView?.()!=='ingles')await window.hudGo?.('ingles');T.mod='quiz';T.qz=t||T.qz;save();await render();if(t)accion('quiz').catch(()=>{});};
// desde el chat: «practica toefl», «toefl email»… (cerebropy.js manda aquí las acciones del profe)
window.toeflIr=async(tipo)=>{if(window.hudView?.()!=='ingles')await window.hudGo?.('ingles');if(tipo)setTimeout(()=>nueva(tipo).catch(()=>{}),250);else{T.mod='inicio';save();render();}};
const _send=send;
send=async v=>{const k=(v||'').trim().toLowerCase();
  if(/^(toefl|profe toefl|pesta[nñ]a ingl[eé]s)$/.test(k)&&!busy){line('u',v);line('c','CAPRI');line('t','te abro mi salón de TOEFL~');return window.toeflIr();}
  if(/^(resolver quiz|quiz)$/.test(k)&&!busy){line('u',v);line('c','CAPRI');line('t','pégame la pregunta con sus incisos y te digo cuál es y por qué~');return window.toeflQuiz();}
  await _send(v);if(k==='help'){line('t','  toefl — pestaña INGLÉS: profe de TOEFL sin IA (prácticas, calificación, vocabulario, plan)');line('t','  quiz: <pregunta con incisos> — te digo el inciso correcto y por qué (sin IA)');}};
})();
