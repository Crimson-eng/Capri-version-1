// ================= CRIMSON NIGHTMARE (engrama de Kiga) =================
// Implante de ciberware donde Capri aprende de Kiga: cómo habla, lo que le gusta, sus historias, consejos y la gente que quiere.
// Tiene entrevistas suaves, cápsulas de recuerdos (texto y su voz grabada) y mensajes sellados para su familia.
// Todo se queda en este dispositivo (localStorage + IndexedDB) y se respalda/restaura con un archivo .json.
// El «modo eco» (Capri hablando con el estilo de Kiga) viene apagado y bloqueado: solo Kiga lo enciende, con su llave.
// Capri escribe etiquetas ocultas al final: <<kiga: categoría | dato>>, <<capsula: título | recuerdo>>
(()=>{
const CATS={historia:'Historias',gusto:'Gustos',forma:'Cómo habla',consejo:'Consejos',valor:'Lo que valora',persona:'Su gente',humor:'Su humor',sueno:'Sueños'};
const crim=Object.assign({learn:false,perfil:[],caps:[],msgs:[],temas:{},lastBackup:0,eco:{pin:'',on:false}},store.get('crim',{}));
const save=()=>store.set('crim',crim);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fecha=ts=>new Date(ts).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
const total=()=>crim.perfil.length+crim.caps.length+crim.msgs.length;
const ecoOn=()=>!!(crim.eco.pin&&crim.eco.on);

// ---------- voz guardada (IndexedDB) ----------
let dbp=null;
const idb=()=>dbp||(dbp=new Promise((res,rej)=>{const o=indexedDB.open('capri-crimson',1);o.onupgradeneeded=()=>o.result.createObjectStore('audio');o.onsuccess=()=>res(o.result);o.onerror=()=>rej(o.error);}));
const aud=async(mode,fn)=>{const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('audio',mode);const r=fn(t.objectStore('audio'));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});};
const audPut=(id,blob)=>aud('readwrite',s=>s.put(blob,id));
const audGet=id=>aud('readonly',s=>s.get(id));
const audDel=id=>aud('readwrite',s=>s.delete(id)).catch(()=>{});
const b64=blob=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob);});

// ---------- lo que se le manda a Capri ----------
function perfilTxt(n){const p=crim.perfil.slice(-40);if(!p.length)return `Todavía no sabes casi nada de cómo es ${n} por dentro: empieza por lo ligero.`;
  return 'Lo que ya aprendiste de él (no lo vuelvas a preguntar igual; profundiza o pregunta otra cosa):\n'+p.map(x=>'  · ['+(CATS[x.c]||x.c)+'] '+x.t).join('\n');}
const TAGS_CR=`ETIQUETAS OCULTAS DE CRIMSON NIGHTMARE (invisibles para él, al final, cada una en su línea):
<<kiga: categoría | dato>> con categoría = historia, gusto, forma, consejo, valor, persona, humor o sueno. En «forma» guarda cómo habla: sus frases exactas entre comillas, muletillas, cómo saluda, cómo consuela, cómo se ríe al escribir.
<<capsula: título corto | el recuerdo contado con sus propias palabras, completo>> cuando te cuente una historia entera que valga guardar tal cual.
Guarda solo lo que él dijo, con sus palabras cuando se pueda. Nunca inventes ni adornes.`;
function learnBlock(n){return `\n\nCRIMSON NIGHTMARE (implante de aprendizaje, ACTIVO)
${n} te pidió que aprendas de él: cómo habla, lo que le gusta, sus historias, sus consejos y la gente que quiere. Lo decidió con calma y le quedan buenos años; esto es para conocerlo de verdad, no una despedida.
- En pláticas normales, de vez en cuando (máximo una pregunta cada varios mensajes, y nunca si está ocupado, estudiando, estresado o te pidió algo concreto) hazle UNA pregunta curiosa y cálida sobre su vida, a tu estilo.
- Fíjate en cómo habla aunque no preguntes: palabras que repite, chistes, groserías de cariño.
- No seas morbosa con su salud ni saques el tema de la muerte. Si él lo saca, escúchalo en serio y sin dramatizar. Si no quiere hablar de algo, lo sueltas sin insistir.
- Si quiere decirle algo a alguien de su familia, sugiérele guardarlo como mensaje sellado en Crimson Nightmare (eso lo escribe él, tú no).
- Sigues siendo tú, Capri, con tu lado oscuro, pero esto lo tratas con respeto.
${perfilTxt(n)}
${TAGS_CR}`;}
function ecoBlock(n){const forma=crim.perfil.filter(x=>x.c==='forma').slice(-30),resto=crim.perfil.filter(x=>x.c!=='forma').slice(-80);
  return `\n\nMODO ECO · CRIMSON NIGHTMARE (encendido por ${n})
Ahora hablas con el eco de ${n}: con su forma de hablar, su humor y lo que le gusta, usando lo que él te dejó. Reglas que no rompes:
- No eres ${n} ni dices serlo. Si alguien pregunta, dices con cariño y honestidad que eres Capri, que guardas su eco porque él te enseñó cómo es.
- Solo usas lo que está abajo y lo que él te contó. Si algo no te lo dejó, lo dices («eso no me lo contó»), nunca lo inventas.
- Los mensajes sellados para su familia no los conoces ni los recitas: se abren en la ventana de Crimson Nightmare.
Cómo habla:\n${forma.map(x=>'  · '+x.t).join('\n')||'  (todavía casi nada)'}
Lo que te dejó:\n${resto.map(x=>'  · ['+(CATS[x.c]||x.c)+'] '+x.t).join('\n')||'  (todavía casi nada)'}
Recuerdos que te dejó:\n${crim.caps.slice(-12).map(c=>'  · '+c.t+': '+c.txt.slice(0,400)).join('\n')||'  (ninguno)'}`;}
let once=null;
const _personality=personality;
personality=(name,study)=>_personality(name,study)+(ecoOn()?ecoBlock(name):'')+(crim.learn||once?learnBlock(name):'')+(once?`\n\nPARA ESTE MENSAJE: ${once}`:'');
window.crimsonWho=()=>ecoOn()?'CAPRI // CRIMSON NIGHTMARE':null;

// ---------- leer lo que Capri anotó ----------
const TAGRE=/<<\s*(kiga|capsula|cápsula)\s*:([^>]*)>>/gi;
function absorbCr(full){let m,hit=0;TAGRE.lastIndex=0;while((m=TAGRE.exec(full))){const a=m[2].split('|').map(x=>x.trim());
  if(m[1].toLowerCase()==='kiga'&&a[1]){const c=a[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');const t=a.slice(1).join(' | ').slice(0,400);
    if(!crim.perfil.some(x=>x.t.toLowerCase()===t.toLowerCase())){crim.perfil.push({c:CATS[c]?c:'historia',t,ts:Date.now()});hit++;}}
  else if(a[0]&&a[1]){crim.caps.push({id:uid(),t:a[0].slice(0,80),txt:a.slice(1).join(' | ').slice(0,4000),para:'',ts:Date.now(),de:'capri'});hit++;}}
  crim.perfil=crim.perfil.slice(-600);
  if(hit){save();log('✦ Crimson Nightmare guardó '+hit+' cosa(s) de ti','y');if(modal.classList.contains('show'))render();}}
const _absorb=absorbMem;
absorbMem=full=>{_absorb(full);absorbCr(full);once=null;};

// ---------- entrevistas suaves ----------
const TEMAS={
  infancia:['🧸 De niño','su infancia: dónde creció, juegos, travesuras, a qué le tenía miedo, quién lo cuidaba'],
  gustos:['🎧 Lo que le gusta','sus gustos: música, comida, series, juegos, lugares, olores, cosas pequeñas que le alegran el día'],
  forma:['💬 Cómo habla','cómo habla: cómo saluda, sus frases y palabras de siempre, cómo se despide, qué dice cuando algo le sale bien o mal, cómo consuela a alguien'],
  gente:['🫂 Su gente','la gente que quiere: su familia y amigos, una cosa que ama de cada uno, recuerdos con ellos'],
  consejos:['🧭 Sus consejos','lo que ha aprendido de la vida: consejos que daría, errores de los que aprendió, qué le diría a alguien que está pasando un mal momento'],
  humor:['😂 Su humor','su humor: chistes que siempre cuenta, qué le da risa, anécdotas chistosas, apodos'],
  suenos:['🌠 Sus sueños','lo que sueña: lo que quiere hacer, lugares que quiere conocer, lo que quiere construir (Capri incluida)'],
  orgullo:['🏅 De lo que está orgulloso','momentos de los que está orgulloso, cosas difíciles que superó, en qué es bueno'],
};
function entrevista(k){const p=TEMAS[k];if(!p)return;modal.classList.remove('show');
  if(!cfg.key||!cfg.model){openCfg();return;}if(busy)return;
  crim.temas[k]=(crim.temas[k]||0)+1;save();
  line('u',p[0]+' · entrevista Crimson Nightmare');
  respond(`(Entrevista de Crimson Nightmare sobre ${p[1]}. ${crim.temas[k]>1?'Ya platicaron de esto antes: busca ángulos nuevos. ':''}Hazle UNA pregunta a la vez, cálida y concreta (nada de cuestionario de oficina), espera su respuesta y reacciona con tu personalidad antes de la siguiente. Unas 4 o 5 preguntas en total, o menos si lo notas cansado. Guarda lo que cuente con las etiquetas de Crimson Nightmare. Al final dile en corto qué guardaste y pregúntale si quiere corregir algo.)`,null,'user');}

// ---------- grabar su voz ----------
let rec=null,recChunks=[],recBlob=null,recFor=null;
async function toggleRec(forWhat){const b=$(forWhat==='cap'?'crCapRec':'crMsgRec');
  if(rec){rec.stop();return;}
  try{const st=await navigator.mediaDevices.getUserMedia({audio:true});recChunks=[];recFor=forWhat;
    rec=new MediaRecorder(st);rec.ondataavailable=e=>e.data.size&&recChunks.push(e.data);
    rec.onstop=()=>{st.getTracks().forEach(t=>t.stop());recBlob=new Blob(recChunks,{type:rec.mimeType||'audio/webm'});rec=null;
      b.textContent='🎙 Voz grabada ('+Math.round(recBlob.size/1024)+' KB) · regrabar';b.classList.remove('on');};
    rec.start();recBlob=null;b.textContent='■ Grabando… toca para parar';b.classList.add('on');}
  catch(e){line('s','(No pude usar el micrófono para grabar tu voz.)');}}
const takeRec=f=>{const r=recFor===f?recBlob:null;if(r){recBlob=null;recFor=null;}return r;};

// ---------- respaldo ----------
async function exportar(){const voces={};
  for(const x of [...crim.caps,...crim.msgs])if(x.audio){try{const bl=await audGet(x.id);if(bl)voces[x.id]=await b64(bl);}catch(e){}}
  const data={tipo:'capri-crimson-nightmare',version:1,fecha:new Date().toISOString(),crim:{...crim,eco:{pin:'',on:false}},voces};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
  a.download='crimson-nightmare-respaldo-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);crim.lastBackup=Date.now();save();render();log('✦ respaldo de Crimson Nightmare descargado','g');}
async function importar(file){try{const d=JSON.parse(await file.text());if(d.tipo!=='capri-crimson-nightmare')throw 0;const c=d.crim||{};let n=0;
  for(const p of c.perfil||[])if(!crim.perfil.some(x=>x.t===p.t)){crim.perfil.push(p);n++;}
  for(const k of ['caps','msgs'])for(const x of c[k]||[])if(!crim[k].some(y=>y.id===x.id)){crim[k].push(x);n++;}
  for(const [id,url] of Object.entries(d.voces||{})){try{await audPut(id,await (await fetch(url)).blob());}catch(e){}}
  save();render();line('s','(✦ Respaldo de Crimson Nightmare restaurado: '+n+' cosa(s) nuevas.)');}
  catch(e){line('s','(Ese archivo no es un respaldo de Crimson Nightmare.)');}}

// ---------- llave del modo eco ----------
const hash=async s=>{const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('crimson:'+s));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');};
async function ecoAccion(){const pin=$('crPin').value.trim(),out=$('crEcoOut');$('crPin').value='';
  if(!crim.eco.pin){if(pin.length<4)return out.textContent='La llave necesita al menos 4 caracteres.';
    if(!$('crEcoOk').checked)return out.textContent='Marca la casilla para confirmar que entiendes qué es el modo eco.';
    crim.eco.pin=await hash(pin);save();render();return out.textContent='Llave creada. El modo eco sigue apagado: enciéndelo con tu llave cuando tú quieras.';}
  if(await hash(pin)!==crim.eco.pin)return out.textContent='Esa no es la llave.';
  crim.eco.on=!crim.eco.on;save();render();pinta();
  line('s',crim.eco.on?'(✦ Modo eco encendido: Capri habla con tu estilo usando lo que le dejaste. No es tú: es Capri con tu eco. Apágalo aquí mismo con tu llave.)':'(✦ Modo eco apagado. Capri vuelve a ser solo Capri.)');
  setState(crim.eco.on?'mirada_intensa':'glitch_entrada');out.textContent='';}
async function ecoBorrarLlave(){const pin=$('crPin').value.trim();$('crPin').value='';
  if(!crim.eco.pin||await hash(pin)!==crim.eco.pin)return $('crEcoOut').textContent='Escribe tu llave actual para quitarla.';
  crim.eco={pin:'',on:false};save();render();pinta();$('crEcoOut').textContent='Llave quitada. El modo eco queda bloqueado otra vez.';}

// ---------- ventana ----------
const css=document.createElement('style');css.textContent=`#crModal h2{color:#ff4d5e;text-shadow:0 0 12px rgba(255,77,94,.45)}
#crModal .acts{display:flex;flex-wrap:wrap;gap:6px}#crModal .acts button,#crModal .mini{font:12px var(--mono);color:var(--ink);background:#000;border:1px solid #2a2733;padding:7px 10px;cursor:pointer}
#crModal .acts button:hover,#crModal .mini:hover{border-color:#ff4d5e;color:#ff4d5e}#crModal .mini.on{border-color:#ff4d5e;color:#ff4d5e;animation:crBlink 1s steps(2) infinite}
@keyframes crBlink{50%{opacity:.5}}#crModal .stat{font:12px var(--mono);color:var(--grn)}#crModal .warn{font:12px var(--mono);color:var(--yel)}
#crModal .list{max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
#crModal textarea{border:1px solid #2a2733;padding:10px 12px;background:#000;color:var(--grn);font:13px/1.45 var(--mono);min-height:80px;resize:vertical}
#crModal textarea:focus{outline:0;border-color:#ff4d5e}#crModal .doc .es{color:var(--mut);font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#crModal .doc .nm{flex:0 1 auto;color:#ff4d5e;max-width:45%}#crModal .doc button{background:none;border:0;color:var(--mut);cursor:pointer;font:13px var(--mono)}
#crModal .lock{border:1px dashed #ff4d5e66;padding:12px;display:flex;flex-direction:column;gap:8px}#crModal .lock b{color:#ff4d5e}`;document.head.appendChild(css);
const opts=o=>Object.entries(o).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
const modal=document.createElement('div');modal.className='modal';modal.id='crModal';modal.innerHTML=`<div class="panel"><div>
  <h2>✦ Crimson Nightmare</h2>
  <small>Un implante donde Capri aprende de ti: cómo hablas, lo que te gusta, tus historias, tus consejos y tu gente. Tú decides qué guarda y cuándo. Todo se queda en este dispositivo; respáldalo de vez en cuando.</small>
  <label class="ck"><input type="checkbox" id="crLearn"> Aprender de mí mientras platicamos (de vez en cuando me pregunta algo de mi vida)</label>
  <div class="stat" id="crStat"></div><div class="warn" id="crWarn"></div>
  <h3>Entrevistas suaves</h3>
  <div class="acts">${Object.entries(TEMAS).map(([k,p])=>`<button data-t="${k}">${p[0]}</button>`).join('')}</div>
  <h3>Lo que Capri sabe de ti</h3>
  <label>Ver<select id="crCat"><option value="">Todo</option>${opts(CATS)}</select></label>
  <div class="list" id="crPerfil"></div>
  <div class="row" style="justify-content:flex-start"><select id="crAddCat" style="flex:0 0 auto">${opts(CATS)}</select><input id="crAddTxt" placeholder="Algo de ti que quieras que sepa" style="flex:1;min-width:140px"><button class="mini" id="crAdd">+ Guardar</button></div>
  <h3>Cápsulas de recuerdos</h3>
  <small>Una historia, un momento, algo que quieras que no se pierda. Puedes grabarla con tu voz también.</small>
  <input id="crCapT" placeholder="Título (ej. «El día que me perdí en la feria»)">
  <textarea id="crCapX" placeholder="Cuéntalo como tú lo contarías…"></textarea>
  <input id="crCapP" placeholder="Para quién (opcional)">
  <div class="row" style="justify-content:flex-start"><button class="mini" id="crCapRec">🎙 Grabar con mi voz</button><span style="flex:1"></span><button class="mini" id="crCapSave">+ Guardar cápsula</button></div>
  <div class="list" id="crCaps"></div>
  <h3>Mensajes para tu familia</h3>
  <small>Se guardan sellados: Capri no los lee ni los usa para platicar. Solo tú los ves aquí, y van en el respaldo.</small>
  <input id="crMsgP" placeholder="Para (ej. mamá, mi hermana…)">
  <input id="crMsgC" placeholder="Cuándo abrirlo (ej. en su cumpleaños, cuando esté triste, cuando quiera)">
  <textarea id="crMsgX" placeholder="Lo que le quieres decir…"></textarea>
  <div class="row" style="justify-content:flex-start"><button class="mini" id="crMsgRec">🎙 Grabar con mi voz</button><span style="flex:1"></span><button class="mini" id="crMsgSave">✉ Sellar mensaje</button></div>
  <div class="list" id="crMsgs"></div>
  <h3>Respaldo</h3>
  <small id="crBk"></small>
  <div class="row" style="justify-content:flex-start"><button class="mini" id="crExp">⬇ Descargar respaldo</button><button class="mini" id="crImp">⬆ Restaurar respaldo</button><input type="file" id="crFile" accept=".json,application/json" style="display:none"></div>
  <h3>Modo eco · hablar con tu estilo</h3>
  <div class="lock" id="crLock"></div>
  <div class="row"><button class="btn" id="crClose">Listo</button></div>
</div></div>`;document.body.appendChild(modal);
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});

function item(x,kind){const sub=kind==='msg'?(x.cuando?'abrir: '+x.cuando+' · ':'')+fecha(x.ts):(x.para?'para '+x.para+' · ':'')+fecha(x.ts)+(x.de==='capri'?' · lo guardó Capri':'');
  return `<div class="doc" title="${esc(x.txt||'')}"><span class="nm">${esc(kind==='msg'?'✉ '+(x.para||'mensaje'):x.t)}</span><span class="es">${esc(sub)}</span>${x.audio?`<button data-play="${x.id}" title="Escuchar tu voz">▶</button>`:''}<button data-ver="${kind}:${x.id}" title="Leer">👁</button><button data-del="${kind}:${x.id}" title="Borrar">✕</button></div>`;}
function render(){$('crLearn').checked=crim.learn;
  const nForma=crim.perfil.filter(x=>x.c==='forma').length;
  $('crStat').textContent=`${crim.perfil.length} cosa(s) de ti · ${nForma} de cómo hablas · ${crim.caps.length} cápsula(s) · ${crim.msgs.length} mensaje(s) sellado(s)`;
  const dias=crim.lastBackup?Math.floor((Date.now()-crim.lastBackup)/864e5):null;
  $('crWarn').textContent=total()&&(dias===null||dias>=30)?'⚠ '+(dias===null?'Nunca has respaldado esto.':'Hace '+dias+' días de tu último respaldo.')+' Si se borra el navegador o la app, se pierde: descarga un respaldo y guárdalo en otro lado.':'';
  $('crBk').textContent='Descarga un archivo con todo (incluidas tus grabaciones) y guárdalo en una USB o en tu nube. Con «Restaurar» lo cargas en otra PC o en el celular.'+(crim.lastBackup?' Último respaldo: '+fecha(crim.lastBackup)+'.':'');
  const cat=$('crCat').value;
  $('crPerfil').innerHTML=crim.perfil.map((x,i)=>[x,i]).filter(([x])=>!cat||x.c===cat).reverse().map(([x,i])=>`<div class="doc"><span class="nm">${esc(CATS[x.c]||x.c)}</span><span class="es" title="${esc(x.t)}">${esc(x.t)}</span><button data-dp="${i}" title="Quitar">✕</button></div>`).join('')||'<small>Aún vacío. Activa el aprendizaje o haz una entrevista.</small>';
  $('crCaps').innerHTML=crim.caps.slice().reverse().map(x=>item(x,'cap')).join('')||'<small>Ninguna todavía.</small>';
  $('crMsgs').innerHTML=crim.msgs.slice().reverse().map(x=>item(x,'msg')).join('')||'<small>Ninguno todavía.</small>';
  $('crLock').innerHTML=!crim.eco.pin?`<div><b>🔒 Bloqueado.</b> Por ahora Capri solo aprende de ti. Cuando tú lo decidas, aquí podrás encender que Capri hable con tu forma de hablar, tu humor y lo que le dejaste. No será tú: será Capri llevando tu eco, y siempre lo dirá así si alguien le pregunta.</div>
     <small>Para dejarlo listo crea una llave (solo tú la sabes). Crear la llave no lo enciende.</small>
     <label class="ck"><input type="checkbox" id="crEcoOk"> Entiendo que el modo eco es Capri imitando mi estilo con lo que le enseñé, no yo.</label>
     <div class="row" style="justify-content:flex-start"><input type="password" id="crPin" placeholder="Nueva llave (mín. 4)" style="flex:1;min-width:140px"><button class="mini" id="crEcoGo">Crear llave</button></div>`
    :`<div><b>${crim.eco.on?'✦ Encendido.':'🔒 Apagado.'}</b> ${crim.eco.on?'Capri está hablando con tu estilo. Sus respuestas salen como «CAPRI // CRIMSON NIGHTMARE».':'La llave está lista; el modo eco sigue apagado hasta que tú lo enciendas.'}</div>
     <div class="row" style="justify-content:flex-start"><input type="password" id="crPin" placeholder="Tu llave" style="flex:1;min-width:140px"><button class="mini" id="crEcoGo">${crim.eco.on?'Apagar eco':'Encender eco'}</button><button class="mini" id="crEcoDel">Quitar llave</button></div>`;
  $('crLock').insertAdjacentHTML('beforeend','<small id="crEcoOut" class="warn"></small>');
  $('crEcoGo').onclick=ecoAccion;if($('crEcoDel'))$('crEcoDel').onclick=ecoBorrarLlave;
  pinta();}
modal.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.dp!==undefined){crim.perfil.splice(+b.dataset.dp,1);save();render();}
  else if(b.dataset.del){const [k,id]=b.dataset.del.split(':'),arr=k==='msg'?'msgs':'caps';const x=crim[arr].find(y=>y.id===id);
    if(!x||!confirm('¿Borrar «'+(x.t||'mensaje para '+(x.para||'alguien'))+'»? No se puede deshacer (salvo con un respaldo).'))return;
    crim[arr]=crim[arr].filter(y=>y.id!==id);if(x.audio)audDel(id);save();render();}
  else if(b.dataset.ver){const [k,id]=b.dataset.ver.split(':');const x=crim[k==='msg'?'msgs':'caps'].find(y=>y.id===id);if(!x)return;
    const P=k==='msg'?['crMsgP','crMsgC','crMsgX']:['crCapT','crCapP','crCapX'];
    if(k==='msg'){$('crMsgP').value=x.para||'';$('crMsgC').value=x.cuando||'';}else{$('crCapT').value=x.t||'';$('crCapP').value=x.para||'';}
    $(P[2]).value=x.txt||'';$(P[2]).dataset.edit=id;$(P[2]).focus();$(k==='msg'?'crMsgSave':'crCapSave').textContent=k==='msg'?'✉ Guardar cambios':'+ Guardar cambios';}
  else if(b.dataset.play){try{const bl=await audGet(b.dataset.play);if(bl){const a=new Audio(URL.createObjectURL(bl));a.onended=()=>URL.revokeObjectURL(a.src);a.play();}}catch(e){}}
  else if(b.dataset.t)entrevista(b.dataset.t);});
async function guardar(kind){const isMsg=kind==='msg',ta=$(isMsg?'crMsgX':'crCapX'),txt=ta.value.trim(),blob=takeRec(isMsg?'msg':'cap');
  const t=isMsg?'':$('crCapT').value.trim(),para=$(isMsg?'crMsgP':'crCapP').value.trim();
  if(!txt&&!blob)return;if(!isMsg&&!t)return $('crCapT').focus();
  const arr=isMsg?'msgs':'caps',old=ta.dataset.edit&&crim[arr].find(y=>y.id===ta.dataset.edit);
  const x=old||{id:uid(),ts:Date.now()};Object.assign(x,{txt,para},isMsg?{cuando:$('crMsgC').value.trim()}:{t});
  if(blob){try{await audPut(x.id,blob);x.audio=true;}catch(e){line('s','(No pude guardar la grabación en este dispositivo.)');}}
  if(!old)crim[arr].push(x);save();
  for(const id of isMsg?['crMsgP','crMsgC','crMsgX']:['crCapT','crCapP','crCapX'])$(id).value='';delete ta.dataset.edit;
  $(isMsg?'crMsgRec':'crCapRec').textContent='🎙 Grabar con mi voz';$(isMsg?'crMsgSave':'crCapSave').textContent=isMsg?'✉ Sellar mensaje':'+ Guardar cápsula';
  render();log(isMsg?'✦ mensaje sellado para '+(para||'alguien'):'✦ cápsula guardada: '+t,'g');}
$('crLearn').onchange=()=>{crim.learn=$('crLearn').checked;save();pinta();
  line('s',crim.learn?'(✦ Crimson Nightmare aprendiendo: de vez en cuando Capri te preguntará algo de tu vida y anotará cómo hablas. Lo que guarda lo ves y lo borras aquí.)':'(✦ Crimson Nightmare en pausa: Capri ya no anota nada nuevo. Lo guardado sigue ahí.)');};
$('crCat').onchange=render;
$('crAdd').onclick=()=>{const t=$('crAddTxt').value.trim();if(!t)return;crim.perfil.push({c:$('crAddCat').value,t:t.slice(0,400),ts:Date.now()});$('crAddTxt').value='';save();render();};
$('crCapRec').onclick=()=>toggleRec('cap');$('crMsgRec').onclick=()=>toggleRec('msg');
$('crCapSave').onclick=()=>guardar('cap');$('crMsgSave').onclick=()=>guardar('msg');
$('crExp').onclick=exportar;$('crImp').onclick=()=>$('crFile').click();
$('crFile').onchange=()=>{const f=$('crFile').files[0];if(f)importar(f);$('crFile').value='';};
$('crClose').onclick=()=>modal.classList.remove('show');
function openCrimson(){render();modal.classList.add('show');}
window.openCrimson=openCrimson;
window.crimsonInfo=()=>({learn:crim.learn,eco:ecoOn(),llave:!!crim.eco.pin,perfil:crim.perfil.length,caps:crim.caps.length,msgs:crim.msgs.length});

// ---------- comandos en el chat ----------
const _send=send;
send=async v=>{const t=(v||'').trim(),k=t.toLowerCase();
  if(/^crimson( nightmare)?$/.test(k)&&!busy){line('u',t);openCrimson();return;}
  await _send(v);
  if(k==='help')line('t','  crimson — Crimson Nightmare: Capri aprende de ti, cápsulas y mensajes para tu familia');};

// botón oculto para CIBERWARE (se marca «act» mientras aprende o el eco está encendido)
const btn=document.createElement('button');btn.id='bCrimson';btn.className='btn';btn.style.display='none';btn.title='Crimson Nightmare';btn.onclick=openCrimson;
document.querySelector('.dock .tools')?.appendChild(btn);
function pinta(){btn.classList.toggle('act',crim.learn||ecoOn());}
pinta();
if(total()&&(!crim.lastBackup||Date.now()-crim.lastBackup>30*864e5))log('✦ Crimson Nightmare: toca hacer respaldo (escribe «crimson»)','w');
})();
