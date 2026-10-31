// ================= AFINAR SU VOZ (2.14) =================
// Laboratorio para ir haciendo la voz de Capri más humana a tu gusto, sin entrenar nada:
// 1) le describes con palabras cómo la quieres y lo traduce a ajustes (y a su «tono» de Gemini),
// 2) rondas A/B: escuchas dos versiones y eliges; cada ronda se acerca más a lo que te gusta,
// 3) controles finos, deshacer y favorita. Los ajustes de base son para la voz de tu PC (Piper);
// los ecos del mosaico y la estática se le ponen también a la de Gemini.
(()=>{
const anchor=$('cTtsSt');if(!anchor||!window.vozLocal)return;
const VL=window.vozLocal,FAB=Object.assign({},VL.VL_FAB,{mosaico:.5,mosGlitch:.35});
// [clave, nombre, mín, máx, paso, ayuda]
const DIM=[['vlVel','Velocidad',.7,1.4,.01,'más bajo = más despacio'],['vlTono','Tono',.9,1.15,.01,'arriba de 1.05 empieza a sonar a ardilla'],
 ['vlExpr','Expresión',.3,1,.01,'qué tanto sube y baja al hablar'],['vlRitmo','Ritmo natural',.3,1.3,.01,'variación en lo que dura cada sonido'],
 ['vlPausa','Pausa entre frases',0,.7,.01,'segundos para «respirar»'],['vlCalidez','Calidez',0,1,.01,'más cuerpo, menos siseo'],
 ['vlVida','Vida',0,1,.01,'cada frase sale un poco distinta'],['mosaico','Ecos de otras psiques',0,1,.01,'solo con efectos en «Mosaico»'],
 ['mosGlitch','Estática y micro-cortes',0,1,.01,'solo con efectos en «Mosaico»']];
const R=Object.fromEntries(DIM.map(d=>[d[0],d]));
const lim=(k,x)=>Math.min(R[k][3],Math.max(R[k][2],x));
const PLANTILLA={vlVel:1.04,vlTono:1.02,vlExpr:.78,vlRitmo:.9,vlPausa:.26,vlCalidez:.2,vlVida:.7,mosaico:.45,mosGlitch:.35,fx:'mosaico',
 ttsStyle:'juguetona, pícara y un poco peligrosa, muy segura de sí; a ratos hipnótica y a ratos fría'};
// palabras → cambios. «menos …» o «sin …» lo invierte; «muy/mucho» lo aumenta y «un poco» lo baja
const REGLAS=[
 [/human|natural|\breal\b|persona/,'más humana',{vlExpr:.08,vlVida:.2,vlRitmo:.08}],
 [/rob[oó]tic|sint[eé]tic|artificial|m[aá]quina|digital/,'más sintética',{vlExpr:-.05,vlVida:-.12,mosaico:.12}],
 [/lent|despacio|calma|pausad|tranquil/,'más despacio',{vlVel:-.07,vlPausa:.08}],
 [/r[aá]pid|energ|acelerad|[aá]gil/,'más rápida',{vlVel:.07,vlPausa:-.05}],
 [/agud|aniñ|niña|joven|chiquit/,'más aguda',{vlTono:.03}],
 [/grave|madur|profund|ronc/,'más grave',{vlTono:-.03,vlCalidez:.1}],
 [/c[aá]lid|dulce|tierna|cercan|reconfort|suave/,'más cálida',{vlCalidez:.2}],
 [/brillant|el[eé]ctric|ne[oó]n|n[ií]tid|\bclar[ao]\b|sibilant|alta frecuencia/,'más brillante',{vlCalidez:-.15,mosaico:.05}],
 [/expresiv|emoci|\bviva\b|vivaz|alegr|juguet|travies|p[ií]car|ca[oó]tic|caprich|vol[aá]til|amenaza/,'más expresiva',{vlExpr:.07,vlVida:.15}],
 [/mon[oó]ton|\bplana\b|neutr|estable|fr[ií]a|letal|seria/,'más fría',{vlExpr:-.05,vlVida:-.1}],
 [/hipn[oó]t|susurr|seduct|cadencia/,'más hipnótica',{vlVel:-.05,vlPausa:.06,vlRitmo:.08}],
 [/polif|\bcoro|\becos?\b|\bcapas\b|fantasm|mosaico|psique|\balmas?\b|engrama|conciencia|superpuest/,'más ecos de otras psiques',{mosaico:.2,fx:'mosaico'}],
 [/glitch|est[aá]tic|\bcortes?\b|micro-?cortes|fragment|interferenc|inestab|distorsi|sobrecarg|fluctua/,'más estática',{mosGlitch:.2,fx:'mosaico'}],
 [/pausa|respir/,'más pausas',{vlPausa:.08}]];
function entiende(txt){const cambios={},vistos=[],usos={};let fx=null;
  if(/limpi|sin efecto|sin eco|sin estática|nada de efecto/i.test(txt))fx='off';
  for(const cl of txt.toLowerCase().split(/[,.;:\n]|\by\b|\bpero\b|\bcon\b/)){if(!cl.trim())continue;
    const sg=/\b(menos|no tan|sin|nada de|quita)\b/.test(cl)?-1:1,k=/\b(muy|mucho|much[ií]simo|bastante|demasiado)\b/.test(cl)?1.5:/\b(un poco|poquito|ligera|leve|sutil)/.test(cl)?.5:1;
    for(const [re,nom,d] of REGLAS){if(!re.test(cl)||(usos[nom]=(usos[nom]||0)+1)>2)continue;
      vistos.push((sg<0?nom.replace(/^más/,'menos'):nom)+(k>1?' (mucho)':k<1?' (un poco)':''));
      for(const [c,v] of Object.entries(d)){if(c==='fx'){if(sg>0&&fx!=='off')fx=v;continue;}cambios[c]=(cambios[c]||0)+v*sg*k;}}}
  return {cambios,fx,vistos:[...new Set(vistos)]};}

const box=document.createElement('div');
box.innerHTML=`<h3>Afinar su voz <small style="font-weight:400">· dime cómo la quieres</small></h3>
 <label>Descríbela con tus palabras<textarea id="vfDesc" rows="3" style="width:100%;resize:vertical" placeholder="ej. más humana y juguetona, un poco más despacio, con ecos de otras psiques y algo de estática; menos robótica"></textarea></label>
 <div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap">
  <button class="btn" id="vfApply" style="width:auto;flex:1;padding:8px 10px">✎ Entender y escuchar</button>
  <button class="btn" id="vfCapri" style="width:auto;flex:1;padding:8px 10px" title="Voz humana de base con ecos y estática sutiles">✦ Capri mosaico</button>
  <button class="btn" id="vfFab" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Voz natural de fábrica, sin efectos">⟲ Natural</button></div>
 <small id="vfQue"></small>
 <div id="vfChips" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0">${['más humana','más despacio','más rápida','más aguda','más grave','más cálida','más brillante','más expresiva','más fría','más pausas','menos pausas','más ecos','menos ecos','más estática','menos estática'].map(t=>`<button class="btn" data-t="${t}" style="width:auto;padding:3px 8px;font-size:.8em">${t}</button>`).join('')}</div>
 <fieldset style="border:1px solid #2a2733;padding:8px 10px;margin:6px 0"><legend><small>¿Cuál suena mejor? (rondas A/B)</small></legend>
  <div class="row" style="justify-content:flex-start;gap:8px">
   <button class="btn" id="vfAB" style="width:auto;flex:1;padding:8px 10px">🎧 Nueva ronda</button>
   <button class="btn" id="vfA" style="width:auto;flex:0 0 auto;padding:8px 12px" disabled>A</button>
   <button class="btn" id="vfB" style="width:auto;flex:0 0 auto;padding:8px 12px" disabled>B</button>
   <button class="btn" id="vfRe" style="width:auto;flex:0 0 auto;padding:8px 10px" disabled title="Volver a escuchar las dos">↻</button></div>
  <small>A es como suena ahora y B cambia un par de cosas. Elige la que suene más a Capri; cada ronda los cambios son más finos.</small></fieldset>
 <details><summary><small>Controles finos</small></summary><div id="vfSl"></div></details>
 <div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap">
  <button class="btn" id="vfPlay" style="width:auto;flex:1;padding:8px 10px">▶ Escuchar como está</button>
  <button class="btn" id="vfUndo" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Deshacer el último cambio">↶</button>
  <button class="btn" id="vfFav" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Guardar como favorita">★</button>
  <button class="btn" id="vfFavGo" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Volver a la favorita">★↩</button></div>
 <small id="vfSt"></small>`;
anchor.after(box);
const st=t=>{$('vfSt').textContent=t;};
const vals=()=>Object.fromEntries(DIM.map(([k])=>[k,+cfg[k]]));
let hist=[];
const guarda=()=>{hist.push({...vals(),fx:cfg.fx,ttsStyle:cfg.ttsStyle});if(hist.length>30)hist.shift();};
function pon(o){for(const [k,v] of Object.entries(o)){if(R[k])cfg[k]=+lim(k,v).toFixed(3);else if(k==='fx'){cfg.fx=v;if($('cFx'))$('cFx').value=v;}else if(k==='ttsStyle'){cfg.ttsStyle=v;if($('cTtsStyle'))$('cTtsStyle').value=v;}}
  store.set('cfg',cfg);pinta();}
function pinta(){$('vfSl').innerHTML=DIM.map(([k,n,a,b,p,h])=>`<label>${n} <small id="vf_${k}V">${(+cfg[k]).toFixed(2)}</small> <small style="opacity:.6">· ${h}</small><input type="range" id="vf_${k}" min="${a}" max="${b}" step="${p}" value="${cfg[k]}"></label>`).join('');
  for(const [k] of DIM){const el=$('vf_'+k);el.onpointerdown=guarda;el.oninput=()=>{cfg[k]=+el.value;$('vf_'+k+'V').textContent=(+el.value).toFixed(2);store.set('cfg',cfg);};}}
pinta();$('bCfg')?.addEventListener('click',()=>setTimeout(pinta,60));

// ---------- escuchar ----------
const usaGemini=()=>cfg.tts==='gemini'&&cfg.key&&window.vozGeminiBuf;
let gemCache={t:'',buf:null},ocupada=false;
const frase=()=>$('cTtsText')?.value||'¡Ehhh, choom! ¿Damos un paseo? Vamos a divertirnos un rato.';
async function genera(over={}){const t=frase();
  if(usaGemini()){if(gemCache.t!==t+cfg.ttsVoice+cfg.ttsStyle){gemCache={t:t+cfg.ttsVoice+cfg.ttsStyle,buf:await window.vozGeminiBuf(t)};}return {buf:gemCache.buf,rate:1};}
  if(!VL.lista())throw new Error('primero baja la voz de tu PC (arriba, «Voz de tu PC») o pon el motor en Gemini');
  return VL.sintetiza(t,window.vozCtx(),over);}
// toca con los efectos (y ecos) de «over» si los trae, y espera a que termine
async function toca({buf,rate},over={}){const keep={mosaico:cfg.mosaico,mosGlitch:cfg.mosGlitch};Object.assign(cfg,{mosaico:over.mosaico??cfg.mosaico,mosGlitch:over.mosGlitch??cfg.mosGlitch});
  window.speechSynthesis?.cancel();let r;try{r=window.vozDemo(buf,rate,over.fx||cfg.fx||'off');}finally{Object.assign(cfg,keep);}
  await new Promise(res=>setTimeout(res,(r.fin-r.ahora())*1000+120));}
async function escucha(over={},nombre=''){if(ocupada)return;ocupada=true;const t0=performance.now();st('Generando'+(nombre?' '+nombre:'')+'…');
  try{const a=await genera(over);st('▶ '+(nombre||'Así suena ahora')+(usaGemini()?' (Gemini)':' (tu PC)')+' · '+((performance.now()-t0)/1000).toFixed(1)+' s');await toca(a,over);return true;}
  catch(e){st('No se pudo: '+String(e.message).slice(0,160));return false;}finally{ocupada=false;}}

// ---------- describir ----------
$('vfApply').onclick=()=>{const txt=$('vfDesc').value.trim();if(!txt){st('Escribe primero cómo la quieres.');return;}
  const {cambios,fx,vistos}=entiende(txt);guarda();const o={};for(const [k,v] of Object.entries(cambios))o[k]=+cfg[k]+v;if(fx)o.fx=fx;
  // para Gemini, la descripción misma es el tono (si es muy larga, lo que entendí de ella)
  o.ttsStyle=txt.length<=220?txt.replace(/\s+/g,' '):(vistos.join(', ')||txt.replace(/\s+/g,' ').slice(0,220));
  pon(o);$('vfQue').textContent=vistos.length?'Entendí: '+vistos.join(', ')+'.'+(usaGemini()?' A Gemini le paso tu descripción como su tono.':''):'No reconocí palabras de voz, pero a Gemini le paso tu descripción tal cual. Prueba con: más lenta, más cálida, más expresiva, con ecos, con estática…';
  escucha();};
$('vfChips').onclick=e=>{const t=e.target.dataset?.t;if(!t)return;const {cambios,fx}=entiende(t);guarda();const o={};for(const [k,v] of Object.entries(cambios))o[k]=+cfg[k]+v;if(fx)o.fx=fx;pon(o);escucha({},t);};
$('vfCapri').onclick=()=>{guarda();pon(PLANTILLA);$('vfQue').textContent='Plantilla «Capri mosaico»: voz humana y pícara con ecos de otras psiques y estática sutil. Desde aquí afínala a tu gusto.';escucha({},'Capri mosaico');};
$('vfFab').onclick=()=>{guarda();pon({...FAB,fx:'off'});$('vfQue').textContent='Voz natural de fábrica, sin efectos.';escucha({},'natural');};
$('vfPlay').onclick=()=>escucha();
$('vfUndo').onclick=()=>{const h=hist.pop();if(!h){st('No hay nada que deshacer.');return;}pon(h);st('↶ Listo, volví al ajuste anterior.');};
$('vfFav').onclick=()=>{cfg.vlFav={...vals(),fx:cfg.fx,ttsStyle:cfg.ttsStyle};store.set('cfg',cfg);st('★ Guardada como favorita.');};
$('vfFavGo').onclick=()=>{if(!cfg.vlFav){st('Aún no guardas una favorita (★).');return;}guarda();pon(cfg.vlFav);escucha({},'tu favorita');};

// ---------- rondas A/B ----------
let ronda=0,paso=.2,B=null,cambioB='';
function variante(){const dims=usaGemini()?['mosaico','mosGlitch']:DIM.map(d=>d[0]).filter(k=>cfg.fx==='mosaico'||!/^mos/.test(k));
  const o={},quien=[];for(const k of [...dims].sort(()=>Math.random()-.5).slice(0,2)){const [,n,a,b]=R[k],d=(Math.random()<.5?-1:1)*paso*(b-a)*(.6+Math.random()*.4);
    const v=lim(k,+cfg[k]+d);if(Math.abs(v-cfg[k])<1e-3){const v2=lim(k,+cfg[k]-d);o[k]=v2;quien.push((v2>cfg[k]?'más ':'menos ')+n.toLowerCase());}else{o[k]=v;quien.push((v>cfg[k]?'más ':'menos ')+n.toLowerCase());}}
  return {o,txt:quien.join(' y ')};}
const botones=on=>{for(const id of ['vfA','vfB','vfRe'])$(id).disabled=!on;};
async function oirAB(){botones(false);if(!(await escucha({},'A (como está)')))return;await new Promise(r=>setTimeout(r,450));if(await escucha(B.o,'B'))botones(true);
  st('¿Cuál te gustó más, A o B? (ronda '+ronda+')');}
$('vfAB').onclick=()=>{if(ocupada)return;ronda++;const v=variante();B=v;cambioB=v.txt;oirAB();};
$('vfRe').onclick=()=>{if(B&&!ocupada)oirAB();};
$('vfA').onclick=()=>{botones(false);paso=Math.max(.06,paso*.85);st('Te quedas con A. Va otra ronda con cambios más finos…');setTimeout(()=>$('vfAB').click(),600);};
$('vfB').onclick=()=>{botones(false);guarda();pon(B.o);paso=Math.max(.06,paso*.8);$('vfQue').textContent='Elegiste B: '+cambioB+'.';st('Guardado. Va otra ronda…');setTimeout(()=>$('vfAB').click(),600);};
})();
