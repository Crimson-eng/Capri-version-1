// ================= MODO INGLÉS (Capri profe) =================
// Capri como maestra de inglés: corrige frases (explica en español, versión correcta y versión natural), platica en inglés
// a tu nivel corrigiéndote suave, guarda vocabulario y tus errores repetidos, y hace práctica estilo TOEFL iBT.
// Va en un archivo aparte (como medico.js) para no chocar con otras ramas: se engancha envolviendo funciones de index.html.
// Capri escribe etiquetas ocultas al final: <<vocab: palabra | significado | ejemplo>>, <<error: tipo>>, <<nivel: B1>>, <<repaso: palabra | 1/0>>
(()=>{
const LEVELS={auto:'Automático (Capri lo mide)',A2:'Básico (A2)',B1:'Intermedio (B1)',B2:'Intermedio alto (B2)',C1:'Avanzado (C1)'};
const GOALS={general:'Inglés en general',toefl:'Presentar el TOEFL',trabajo:'Trabajo / escuela'};
const MODES={off:'Apagado (solo si le pregunto)',profe:'Profe: corrige todo mi inglés',talk:'Plática en inglés'};
const eng=Object.assign({mode:'off',level:'auto',goal:'general',est:'',voice:'',slow:true,vocab:[],errs:{}},store.get('eng',{}));
const save=()=>store.set('eng',eng);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let once=null; // instrucción solo para el siguiente mensaje («profe: …»)
const lvl=()=>eng.level!=='auto'?eng.level:(eng.est||'sin medir todavía; míralo con lo que escriba');

// ---------- lo que se le manda a Capri ----------
const FORMAT_PROFE=n=>`FORMATO DE CORRECCIÓN (cuando ${n} te pase una frase en inglés o pregunte qué está mal):
- Primero una reacción corta tuya, en español, con tu personalidad (no sermón).
- Luego estas líneas, cada una en su renglón, con la parte en inglés siempre entre comillas "así":
✗ "lo que escribió", marcando la parte mal en MAYÚSCULAS
✓ "la versión corregida"
☆ "cómo lo diría un nativo, más natural" (solo si cambia algo)
¿Por qué? explicación en español en 1 a 3 frases claras: la regla, sin tecnicismos de más (si usas un término como "present perfect", explícalo).
⚡ Una mini práctica: 1 frase para que la corrija o complete él. Espera su respuesta y luego dile si quedó.
- Si la frase ya está perfecta, dilo y presume un poco por él; si hay algo más natural, dalo con ☆.
- Si son varios errores, todos en el mismo ✗/✓, y en ¿Por qué? explica cada uno por número.
- No inventes reglas. Si algo es correcto en inglés americano pero no en británico (o es informal), acláralo.`;
const TAGS_ENG=n=>`ETIQUETAS OCULTAS DE INGLÉS (invisibles para ${n}, al final, cada una en su línea):
<<vocab: palabra o frase en inglés | significado en español | ejemplo corto>> cuando le enseñes una palabra o expresión que valga la pena guardar (no las obvias).
<<error: tipo corto en español>> por cada tipo de error que cometió, ej. <<error: tiempos verbales>>, <<error: preposiciones>>, <<error: falso amigo>>.
<<nivel: A2|B1|B2|C1>> cuando ya tengas idea clara de su nivel o cambie.
<<repaso: palabra | 1>> si acertó una palabra de su vocabulario en un repaso, <<repaso: palabra | 0>> si falló.`;
function memEng(){const errs=Object.entries(eng.errs).sort((a,b)=>b[1]-a[1]).slice(0,6);const voc=eng.vocab.slice(-25);
  return (errs.length?`\nSus errores que más se repiten: ${errs.map(([t,c])=>t+' ('+c+')').join(', ')}. Ponles atención extra y repásalos de vez en cuando.`:'')
    +(voc.length?`\nVocabulario que ya le enseñaste (úsalo a veces para que lo fije): ${voc.map(v=>v.w).join(', ')}.`:'');}
function engBlock(n){const goal=eng.goal==='toefl'?`Su meta: presentar el TOEFL iBT. Cuando venga al caso, relaciona lo que practican con el examen (secciones Reading, Listening, Writing y Speaking; puntaje por sección en escala 1 a 6 alineada al CEFR, más el equivalente en la escala clásica 0 a 30). Si no estás segura de un detalle del formato actual del examen, dilo en vez de inventarlo.`
    :eng.goal==='trabajo'?'Su meta: usar el inglés en trabajo y escuela (correos, juntas, presentaciones, lecturas técnicas).':'Su meta: inglés en general, para entender y hablar con soltura.';
  const base=`\n\nMAESTRA DE INGLÉS (también eres su profe de inglés)
Nivel de ${n}: ${lvl()}. ${goal}${memEng()}
Sigues siendo tú, Capri: traviesa, con tus caritas y tu lado oscuro. Corriges con cariño y humor, nunca aburrida ni de libro de texto, pero las explicaciones tienen que ser correctas y claras. Celebra cuando lo hace bien.`;
  if(eng.mode==='talk')return base+`
MODO PLÁTICA EN INGLÉS (ACTIVO)
- Contéstale SIEMPRE en inglés, a su nivel: ${/A2|sin medir/.test(lvl())?'frases cortas y vocabulario sencillo':/B1/.test(lvl())?'frases claras, algún phrasal verb común':'natural, con expresiones idiomáticas'}. Tu jerga va en inglés también (choom, preem, nova, gonk). La etiqueta de estado sigue igual, en español.
- Mantén viva la plática: haz preguntas, cuéntale cosas, reta un poco.
- Si cometió errores, después de tu respuesta añade UNA línea que empiece con ✎ y la corrección: "lo que dijo" → "cómo va", y por qué en español en pocas palabras. Máximo 2 correcciones por mensaje, las más importantes. Si no hubo errores, no pongas la línea.
- Si te escribe en español, contéstale en inglés sencillo y dale la frase en inglés de lo que quería decir.
- Si te habla por voz: en las llaves transcribe exactamente lo que dijo, CON sus errores (no lo corrijas ahí). Si alguna palabra se le entendió mal por pronunciación, añade en la línea ✎ un tip corto de cómo se pronuncia.
${TAGS_ENG(n)}`;
  if(eng.mode==='profe')return base+`
MODO PROFE (ACTIVO): cada vez que ${n} escriba o diga algo en inglés, corrígelo con el formato de abajo, aunque no te lo pida. Si escribe en español, platica normal.
${FORMAT_PROFE(n)}
${TAGS_ENG(n)}`;
  return `\n\nINGLÉS: también eres su profe de inglés (nivel ${lvl()}). Si ${n} te pregunta qué está mal en una frase, cómo se dice algo o te pide práctica, usa este formato:
${FORMAT_PROFE(n)}
${TAGS_ENG(n)}`;}
const _personality=personality;
personality=(name,study)=>_personality(name,study)+engBlock(name)+(once?`\n\nPARA ESTE MENSAJE: ${once}`:'');

// ---------- leer lo que Capri anotó ----------
const TAGRE=/<<\s*(vocab|error|nivel|repaso)\s*:([^>]*)>>/gi;
function absorbEng(full){let m,hit=false;TAGRE.lastIndex=0;while((m=TAGRE.exec(full))){hit=true;const a=m[2].split('|').map(x=>x.trim());
  if(m[1].toLowerCase()==='vocab'&&a[0]){const k=a[0].toLowerCase();const old=eng.vocab.find(v=>v.w.toLowerCase()===k);
    if(old){old.es=a[1]||old.es;old.ej=a[2]||old.ej;}else{eng.vocab.push({w:a[0].slice(0,80),es:(a[1]||'').slice(0,160),ej:(a[2]||'').slice(0,200),ts:Date.now(),ok:0,mal:0});log('vocab: '+a[0],'y');}}
  else if(m[1].toLowerCase()==='error'&&a[0]){const t=a[0].toLowerCase().slice(0,40);eng.errs[t]=(eng.errs[t]||0)+1;}
  else if(m[1].toLowerCase()==='nivel'){const l=(a[0].match(/[ABC][12]/i)||[])[0];if(l){eng.est=l.toUpperCase();log('nivel de inglés ≈ '+eng.est,'y');}}
  else if(m[1].toLowerCase()==='repaso'){const v=eng.vocab.find(v=>v.w.toLowerCase()===(a[0]||'').toLowerCase());if(v){if(+a[1])v.ok++;else v.mal++;v.rep=Date.now();}}}
  eng.vocab=eng.vocab.slice(-300);if(hit){save();if(modal.classList.contains('show'))render();}}
const _absorb=absorbMem;
absorbMem=full=>{_absorb(full);absorbEng(full);once=null;};

// ---------- voz: las partes en inglés con voz en inglés ----------
let speakLang=null,enVoices=[];
const EN_GOOD=/aria|jenny|ava|emma|michelle|ana\b|sonia|libby|natasha|samantha|allison|susan|zira|google us english|google uk english female|female/i;
function loadEn(){if(!('speechSynthesis' in window))return;enVoices=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
  const sc=v=>(/natural|online|neural/i.test(v.name)?4:0)+(EN_GOOD.test(v.name)?3:0)+(/en[-_]US/i.test(v.lang)?2:/en[-_]GB/i.test(v.lang)?1:0);
  enVoices.sort((a,b)=>sc(b)-sc(a));fillVoices();}
if('speechSynthesis' in window){speechSynthesis.addEventListener?.('voiceschanged',loadEn);loadEn();}
const enVoice=()=>enVoices.find(v=>v.name===eng.voice)||enVoices[0];
const EN_W=new Set("the is are you i it to and of what that this have do don't can my your with for be was were will would so but not just like know how why it's i'm you're we they he she an in on at me does did has been there their".split(' '));
const ES_W=new Set('el la que de y en los las es no por con para una un se lo como pero más mi tu te me yo está eso esto qué ya muy sí del al le su'.split(' '));
function isEnglish(t){if(/[ñ¿¡]|[áéíóú]/i.test(t))return false;const w=t.toLowerCase().match(/[a-z']+/g)||[];let en=0,es=0;for(const x of w){if(EN_W.has(x))en++;if(ES_W.has(x))es++;}return en>es;}
const _getVoice=getVoice;
getVoice=()=>speakLang==='en'&&enVoice()?enVoice():_getVoice();
const _speak=speakChunk;
speakChunk=(text,force)=>{const parts=[];let last=0;const re=/["“«]([^"”»]{2,})["”»]/g;let m;
  while((m=re.exec(text))){if(m.index>last)parts.push(text.slice(last,m.index));parts.push(m[1]);last=re.lastIndex;}parts.push(text.slice(last));
  const slow=eng.slow&&eng.mode!=='off',r=cfg.rate;
  for(const p of parts){if(!p.replace(/[^\p{L}\p{N}]/gu,''))continue;speakLang=isEnglish(p)?'en':null;
    if(speakLang&&slow)cfg.rate=Math.max(.6,r*.88);_speak(p,force);cfg.rate=r;}
  speakLang=null;};

// ---------- práctica ----------
const PRACTICE={
  nivel:['📏 Examen de nivel','Hazle un examen de nivel rápido y divertido: 6 preguntas de inglés UNA POR UNA (empieza fácil y sube: gramática, vocabulario, una de leer y entender, y al final pídele que escriba 2 o 3 frases sobre su día). Espera cada respuesta antes de la siguiente. Al terminar dile su nivel CEFR estimado, qué hace bien y qué le conviene estudiar primero, y escribe <<nivel: X>>.'],
  vocab:['🃏 Repasar vocabulario',()=>{const v=[...eng.vocab].sort((a,b)=>(a.ok-a.mal)-(b.ok-b.mal)||(a.rep||0)-(b.rep||0)).slice(0,8);
    return v.length?`Hazle un repaso de su vocabulario guardado, UNA palabra a la vez, alternando: que te diga qué significa, que la use en una frase, o que la traduzca del español. Palabras (empieza por las que más falla): ${v.map(x=>x.w+' = '+x.es).join('; ')}. Después de cada respuesta escribe <<repaso: palabra | 1 o 0>>.`
      :'Todavía no tiene vocabulario guardado. Enséñale 5 palabras o expresiones útiles para su nivel y su meta, con ejemplo, y guarda cada una con <<vocab: …>>. Luego pregúntale una para ver si la captó.';}],
  write:['✍ Writing estilo TOEFL','Dale una tarea de Writing estilo TOEFL iBT a su nivel: alterna entre escribir un correo (con situación y 3 cosas que debe incluir) o una discusión académica (un profesor plantea una pregunta, dos estudiantes opinan y él aporta su opinión con razones, unas 100 palabras). Da solo la consigna y el tiempo sugerido, y espera. Cuando te mande su texto: califícalo en escala 1 a 6 (y su CEFR) con rúbrica: cumplimiento de la tarea, organización y desarrollo, gramática, vocabulario. Da 3 correcciones concretas con ✗/✓, una versión mejorada de un párrafo y un consejo para subir de banda.'],
  read:['📖 Reading estilo TOEFL','Dale una práctica de Reading estilo TOEFL iBT a su nivel: un texto corto original (académico o de la vida diaria, 120 a 180 palabras) y 3 preguntas de opción múltiple (idea principal, detalle, vocabulario en contexto). Espera sus respuestas y luego corrige explicando en español por qué cada opción es o no es correcta. Guarda 1 o 2 palabras útiles del texto con <<vocab: …>>.'],
  speak:['🎤 Speaking estilo TOEFL','Dale una práctica de Speaking estilo TOEFL iBT: hazle UNA pregunta de entrevista personal en inglés (como «Tell me about a place you like to study and why»), y dile en español que le dé al 🎤 y conteste en unos 45 segundos. Cuando conteste por voz, califícalo en escala 1 a 6 en fluidez, pronunciación, gramática y vocabulario, con 2 correcciones y un tip de pronunciación.'],
  talk:['💬 Platicar en inglés',null],
};
function practice(k){const p=PRACTICE[k];if(!p)return;modal.classList.remove('show');
  if(k==='talk'){setMode('talk');return;}
  if(!cfg.key||!cfg.model){openCfg();return;}if(busy)return;
  // la consigna va en el mensaje (no en «once») para que quede en el historial y en el siguiente turno sepa cómo calificar
  line('u',p[0]);respond('(Práctica de inglés, '+p[0].replace(/^\S+\s/,'')+'. '+(typeof p[1]==='function'?p[1]():p[1])+')',null,'user');}
function setMode(m){eng.mode=m;save();render();const b=$('bEng');b?.classList.toggle('act',m!=='off');
  if(m==='talk'){line('s','(Modo plática en inglés: Capri te contesta en inglés a tu nivel y te corrige suave con ✎. Puedes hablarle con 🎤 o 🎙.)');setState('emocionada');
    if(cfg.key&&cfg.model&&!busy)respond('(Activé el modo plática en inglés. Arranca tú: salúdame con tu estilo y hazme una pregunta fácil e interesante.)',null,'user');}
  else if(m==='profe'){line('s','(Modo profe: todo lo que escribas o digas en inglés, Capri lo revisa y te explica en español.)');setState('presumida');}
  else line('s','(Modo inglés apagado. Igual puedes escribir «profe: tu frase» cuando quieras que te la revise.)');}

// ---------- comandos en el chat ----------
const _send=send;
send=async v=>{const t=(v||'').trim(),k=t.toLowerCase();
  if(/^(ingl[eé]s|english)$/.test(k)&&!busy){line('u',t);openEng();return;}
  if(/^vocab(ulario)?$/.test(k)&&!busy){line('u',t);line('c','CAPRI');line('t',eng.vocab.length?'Tu libretita de vocabulario~\n'+eng.vocab.slice(-40).map(v=>'  · '+v.w+' = '+v.es+(v.ej?'  ("'+v.ej+'")':'')).join('\n'):'Todavía no te he enseñado palabras nuevas. Pídeme práctica, choom.');setState('presumida');return;}
  const pm=t.match(/^(profe|corrige|corr[ií]geme|check)\s*:?\s+([\s\S]+)/i);
  once=pm&&!busy?'Revisa este inglés con el FORMATO DE CORRECCIÓN: "'+pm[2].replace(/"/g,"'")+'"':null;
  await _send(v);
  if(k==='help')line('t',"  inglés — modo profe, plática en inglés y práctica TOEFL\n  profe: <frase> — reviso tu inglés y te explico\n  vocab — tu vocabulario guardado");};

// ---------- ventana ----------
const css=document.createElement('style');css.textContent=`#engModal .acts{display:flex;flex-wrap:wrap;gap:6px}#engModal .acts button{font:12px var(--mono);color:var(--ink);background:#000;border:1px solid #2a2733;padding:7px 10px;cursor:pointer}
#engModal .acts button:hover{border-color:var(--cyan);color:var(--cyan)}#engModal .stat{font:12px var(--mono);color:var(--grn)}#engModal .voc{max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
#engModal .doc .es{color:var(--mut);font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#engModal .doc .nm{flex:0 1 auto;color:var(--yel)}`;document.head.appendChild(css);
const opts=o=>Object.entries(o).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
const modal=document.createElement('div');modal.className='modal';modal.id='engModal';modal.innerHTML=`<div class="panel"><div>
  <h2>Aa Modo inglés · Capri profe</h2>
  <small>Pégale una frase y pregúntale «¿qué está mal aquí?», o escribe <b>profe: tu frase</b>. Te marca el error, te explica en español, te da la versión correcta y cómo lo diría un nativo. En plática te contesta en inglés y te corrige suave.</small>
  <label>Modo<select id="engMode">${opts(MODES)}</select></label>
  <label>Tu nivel<select id="engLevel">${opts(LEVELS)}</select></label>
  <label>Tu meta<select id="engGoal">${opts(GOALS)}</select></label>
  <div class="stat" id="engStat"></div>
  <h3>Práctica</h3>
  <div class="acts">${Object.entries(PRACTICE).map(([k,p])=>`<button data-p="${k}">${p[0]}</button>`).join('')}</div>
  <h3>Voz en inglés</h3>
  <label>Voz para las partes en inglés<select id="engVoice"></select></label>
  <label class="ck"><input type="checkbox" id="engSlow"> Un poquito más despacio en inglés (para practicar el oído)</label>
  <div class="row"><button class="btn" id="engTest">Probar voz</button></div>
  <small>Las mejores voces en inglés son las «Natural» de Microsoft Edge (Aria, Jenny, Ava). El micrófono funciona igual en inglés: el audio lo entiende Gemini.</small>
  <h3>Tu vocabulario</h3>
  <div class="voc" id="engVoc"></div>
  <div class="row"><button class="btn" id="engClose">Listo</button></div>
</div></div>`;document.body.appendChild(modal);
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});
function fillVoices(){const s=$('engVoice');if(!s)return;s.innerHTML='<option value="">(automática)</option>'+enVoices.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} — ${v.lang}</option>`).join('')+(enVoices.length?'':'<option disabled>No encontré voces en inglés en este navegador</option>');s.value=eng.voice||'';}
function render(){$('engMode').value=eng.mode;$('engLevel').value=eng.level;$('engGoal').value=eng.goal;$('engSlow').checked=eng.slow;
  const errs=Object.entries(eng.errs).sort((a,b)=>b[1]-a[1]).slice(0,3);
  $('engStat').textContent=`Nivel estimado: ${eng.est||'—'} · palabras guardadas: ${eng.vocab.length}`+(errs.length?' · lo que más fallas: '+errs.map(e=>e[0]).join(', '):'');
  $('engVoc').innerHTML=eng.vocab.slice().reverse().map((v,i)=>`<div class="doc" title="${esc(v.ej||'')}"><span class="nm">${esc(v.w)}</span><span class="es">${esc(v.es)}</span><span class="sz">${v.ok}✓ ${v.mal}✗</span><button data-del="${esc(v.w)}" title="Quitar">✕</button></div>`).join('')||'<small>Aún vacío. Capri guarda aquí las palabras que te enseña.</small>';
  $('engVoc').querySelectorAll('button[data-del]').forEach(b=>b.onclick=()=>{eng.vocab=eng.vocab.filter(v=>v.w!==b.dataset.del);save();render();});
  $('bEng')?.classList.toggle('act',eng.mode!=='off');}
function openEng(){loadEn();fillVoices();render();modal.classList.add('show');}
window.openEng=openEng;
$('engMode').onchange=()=>setMode($('engMode').value);
$('engLevel').onchange=()=>{eng.level=$('engLevel').value;save();render();};
$('engGoal').onchange=()=>{eng.goal=$('engGoal').value;save();};
$('engVoice').onchange=()=>{eng.voice=$('engVoice').value;save();};
$('engSlow').onchange=()=>{eng.slow=$('engSlow').checked;save();};
$('engTest').onclick=()=>{window.speechSynthesis?.cancel();speakChunk('A ver, choom~ "Hey choom, ready to level up your English? Don\'t worry, I only bite a little."',true);};
modal.querySelectorAll('button[data-p]').forEach(b=>b.onclick=()=>practice(b.dataset.p));
$('engClose').onclick=()=>modal.classList.remove('show');

// botón en el dock, junto a ESTUDIO
const b=document.createElement('button');b.className='btn';b.id='bEng';b.title='Modo inglés: Capri profe';b.innerHTML='<span class="gl">Aa</span><span class="tx">INGLÉS</span>';
$('bStudy').after(b);b.onclick=openEng;b.classList.toggle('act',eng.mode!=='off');
})();
