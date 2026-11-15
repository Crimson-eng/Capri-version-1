// ================= SIGILO (2.22) =================
// Para Meet, Zoom, Teams, OBS y cualquier captura: la app de escritorio saca a Capri (completa y mini) de lo que se
// comparte, pero en tu monitor la sigues viendo y usando igual. Lo que NO se puede esconder es el sonido: si compartes
// el audio de la PC o estás en llamada, su voz se escucharía. Por eso, cuando presentas (PowerPoint, pantalla completa,
// una app compartiendo) o estás en llamada, Capri entra en modo silencio: no habla sola, no comenta tu pantalla, no
// manda notificaciones y (si así lo eliges) tampoco suena su voz. Si tú le escribes, te contesta en texto.
// Ctrl+Alt+H la esconde al instante y otra vez la regresa. Solo en la app de escritorio de Windows.
(function(){
const D=window.capriDesk?.sigilo;if(!D)return;
let S={sigilo:true,oculta:false,silencio:false,callarVoz:true,motivo:'',presenta:{},atajo:''};
window.capriSilencio=()=>!!S.silencio;
window.capriSigilo=()=>({...S});
const callaVoz=()=>S.silencio&&S.callarVoz;

// lo que Capri hace por su cuenta se queda en pausa mientras está en silencio
const PROPIO=new Set(['idle','watch']);
const _resp=respond;
respond=(u,e,m)=>{if(S.silencio&&PROPIO.has(m)){log('sigilo: no hablo sola ('+S.motivo+')','g');return Promise.resolve();}return _resp(u,e,m);};
const _notify=notify;
notify=(t)=>{if(S.silencio)return;return _notify(t);};
// su voz: si le das «Probar voz» (force) sí suena, porque eso lo pediste tú
const _speak=speakChunk;
speakChunk=(text,force)=>{if(callaVoz()&&!force)return;return _speak(text,force);};

// ---------- aviso en pantalla (solo tú lo ves: va dentro de la ventana protegida) ----------
const css=document.createElement('style');css.textContent=`
#sigiloChip{position:fixed;left:10px;bottom:10px;z-index:60;font:11px/1.2 monospace;letter-spacing:.06em;padding:4px 8px;border:1px solid #5ef6ff55;
  background:#0c0b12cc;color:#5ef6ff;border-radius:3px;cursor:pointer;user-select:none;display:none}
#sigiloChip.mudo{color:#ffd166;border-color:#ffd16677}
body:not(.desk) #sigiloChip.on{display:block}
#sigiloChip:hover{background:#1a1826ee}`;
document.head.appendChild(css);
const chip=document.createElement('div');chip.id='sigiloChip';chip.title='Clic: esconder a Capri al instante';document.body.appendChild(chip);
chip.onclick=()=>D.ocultar();
function pinta(){const partes=[];if(S.sigilo)partes.push('🕶 INVISIBLE EN CAPTURAS');if(S.silencio)partes.push('🔇 CALLADA · '+S.motivo);
  chip.textContent=partes.join('  ·  ');chip.classList.toggle('on',partes.length>0);chip.classList.toggle('mudo',!!S.silencio);
  chip.title='Clic o '+(S.atajo||'Ctrl+Alt+H').replace('Control','Ctrl')+': esconder a Capri al instante';}

let antes=null;
function llega(e){if(!e)return;const prev=S;S={...S,...e};pinta();sincroniza();
  if(antes===null){antes=S.silencio;return;}
  if(S.silencio&&!antes){if(S.callarVoz)try{speechSynthesis.cancel();}catch(_){}
    if(!S.oculta)line('s','(🔇 '+(S.presenta?.llamada&&S.motivo.startsWith('en llamada')?'Estás en una llamada':'Estás presentando')+' ('+S.motivo.replace(/^[^:]*: /,'')+'): me quedo callada y no hablo sola. Si me escribes te contesto en texto'+(S.sigilo?'; y en lo que compartes no salgo.':'.')+')');
    log('sigilo: modo silencio · '+S.motivo,'y');}
  else if(!S.silencio&&antes){if(prev.motivo&&!prev.oculta)line('s','(🔊 Ya terminaste: vuelvo a hablar normal.)');log('sigilo: fin del silencio','y');bump?.();}
  antes=S.silencio;}
D.onEstado(llega);D.get().then(llega).catch(()=>{});

// ---------- ajustes ----------
const h=[...document.querySelectorAll('#modal h3')].find(x=>/Fragmentos del mosaico/.test(x.textContent));
if(h){h.insertAdjacentHTML('beforebegin',`<h3>Sigilo (compartir pantalla)</h3>
  <label>Invisible al compartir pantalla (Meet, Zoom, Teams, OBS, capturas)<select id="sgOn"><option value="1">Sí</option><option value="0">No</option></select></label>
  <label>Callada cuando presento (PowerPoint, pantalla completa, una app compartiendo, OBS abierto)<select id="sgPres"><option value="1">Sí</option><option value="0">No</option></select></label>
  <label>Callada cuando estoy en llamada (otra app usa el micrófono)<select id="sgLlam"><option value="1">Sí</option><option value="0">No</option></select></label>
  <label>En silencio, también apagar su voz<select id="sgVoz"><option value="1">Sí (recomendado si compartes el audio)</option><option value="0">No, que hable si yo le hablo</option></select></label>
  <div class="row" style="justify-content:flex-start"><button class="btn" id="sgHide">🕶 Esconderla ya</button><button class="btn" id="sgMudo">🔇 Silencio a mano</button></div>
  <small id="sgInfo">Tú la sigues viendo y usando igual en tu monitor; en lo que compartes no aparece (ni la mini ni la completa). El sonido sí se escucha si compartes el audio de la PC, por eso se calla sola. Atajo para esconderla al instante: <b id="sgAtajo">Ctrl+Alt+H</b>.</small>`);
  const pon=(id,k)=>{$(id).onchange=()=>D.set({[k]:$(id).value==='1'}).then(llega);};
  pon('sgOn','sigilo');pon('sgPres','silencioPresenta');pon('sgLlam','silencioLlamada');pon('sgVoz','callarVoz');
  $('sgHide').onclick=()=>D.ocultar();
  $('sgMudo').onclick=()=>window.capriDesk.getCfg().then(c=>D.set({silencioManual:!c.silencioManual})).then(llega);}
function sincroniza(){if(!$('sgOn'))return;window.capriDesk.getCfg().then(c=>{$('sgOn').value=c.sigilo?'1':'0';$('sgPres').value=c.silencioPresenta?'1':'0';
  $('sgLlam').value=c.silencioLlamada?'1':'0';$('sgVoz').value=c.callarVoz?'1':'0';$('sgMudo').textContent=c.silencioManual?'🔊 Quitar silencio a mano':'🔇 Silencio a mano';
  $('sgAtajo').textContent=(S.atajo||'Ctrl+Alt+H').replace('Control','Ctrl');}).catch(()=>{});}
})();
