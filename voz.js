// ================= VOZ DE GEMINI (y voz local, 2.11) =================
// Capri puede hablar con una voz de Gemini (TTS) en lugar de la del navegador: misma API key, 30 voces y el tono
// se pide con palabras, así que cambia según su ánimo. Como llega audio de verdad, los efectos cyber (eco
// metálico, glitch) se le ponen a la voz misma con Web Audio. Si no hay internet o se acaba el cupo, vuelve sola
// a la voz del navegador. El laboratorio para probar voces está en Ajustes → Voz de Capri.
(()=>{
const VOCES=[['Leda','juvenil'],['Sadachbia','viva'],['Laomedeia','animada'],['Autonoe','brillante'],['Despina','suave'],['Enceladus','con aire, susurrada'],
 ['Zephyr','brillante'],['Puck','alegre'],['Charon','informativa'],['Kore','firme'],['Fenrir','excitable'],['Orus','firme'],['Aoede','fresca'],['Callirrhoe','relajada'],
 ['Iapetus','clara'],['Umbriel','relajada'],['Algieba','tersa'],['Erinome','clara'],['Algenib','rasposa'],['Rasalgethi','informativa'],['Achernar','suave'],
 ['Alnilam','firme'],['Schedar','pareja'],['Gacrux','madura'],['Pulcherrima','directa'],['Achird','amigable'],['Zubenelgenubi','casual'],['Sadaltager','conocedora'],
 ['Sulafat','cálida'],['Vindemiatrix','gentil']];
const RECOM=6; // las primeras 6 son las que más le van a Capri
const ANIMO={presumida:'presumida y coqueta, con picardía',risa_malvada:'riéndose de forma traviesa y un poco malvada',enojada:'enojada y cortante',
 emocionada:'muy emocionada, rápida',glitch_entrada:'entrecortada, como con interferencia',glitch_fuerte:'robótica y entrecortada, como con interferencia',
 observando:'tranquila y curiosa',pensando:'pensativa, despacio',sorpresa:'sorprendida',mirada_intensa:'seria e intensa',hipnosis:'susurrando, hipnótica',
 escuchando:'atenta y suave',sonrisa_traviesa:'juguetona y traviesa'};
if(!cfg.ttsV2){cfg.ttsV2=true;cfg.tts='gemini';cfg.ttsVoice='Leda';store.set('cfg',cfg);} // Kiga eligió Leda: Gemini queda prendido de entrada
cfg.tts=cfg.tts||'gemini';cfg.ttsVoice=cfg.ttsVoice||'Leda';cfg.ttsModel=cfg.ttsModel||'gemini-3.8-flash-tts';cfg.ttsStyle=cfg.ttsStyle||'';
const styleNow=extra=>['chica joven, español de México',ANIMO[curState]||ANIMO.sonrisa_traviesa,cfg.ttsStyle,extra].filter(Boolean).join(', ');

// ---------- pedir el audio ----------
function findAudio(o){let hit=null;(function walk(x){if(!x||typeof x!=='object')return;
  if(x.type==='audio'&&typeof x.data==='string')hit={data:x.data,mime:x.mime_type||x.mimeType||''};
  else if(x.inlineData?.data&&/^audio/.test(x.inlineData.mimeType||''))hit={data:x.inlineData.data,mime:x.inlineData.mimeType};
  else if(x.output_audio?.data)hit={data:x.output_audio.data,mime:x.output_audio.mime_type||''};
  for(const v of Array.isArray(x)?x:Object.values(x))walk(v);})(o);return hit;}
async function pedir(text,voice,style,model){
  const H={'Content-Type':'application/json','x-goog-api-key':cfg.key};
  let r=await fetch(API+'interactions',{method:'POST',headers:H,body:JSON.stringify({model,
    input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style}]}]}],
    response_format:{type:'audio'},generation_config:{speech_config:[{voice}]}})}).catch(()=>null);
  if(r?.ok){const a=findAudio(await r.json().catch(()=>null));if(a)return a;}
  else if(r&&(r.status===429||r.status===403)){const j=await r.json().catch(()=>({}));const e=new Error(j.error?.message||'Error '+r.status);e.status=r.status;throw e;}
  // plan B: generateContent con salida de audio, primero con su modelo y luego con el TTS anterior por si ese nombre no existe en su cuenta
  let err=null;
  for(const m of [model,'gemini-2.5-flash-preview-tts']){
    r=await fetch(API+'models/'+encodeURIComponent(m)+':generateContent',{method:'POST',headers:H,body:JSON.stringify({
      contents:[{role:'user',parts:[{text:'Dilo con tono '+style+': '+text}]}],
      generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})}).catch(e=>{err=e;return null;});
    if(!r)continue;const j=await r.json().catch(()=>({}));
    if(r.ok){const a=findAudio(j);if(a)return a;err=new Error('Gemini no devolvió audio');continue;}
    err=new Error(j.error?.message||'Error '+r.status);err.status=r.status;if(r.status===429)throw err;}
  throw err||new Error('sin respuesta');}
let actx=null;const AC=()=>actx||(actx=new (window.AudioContext||window.webkitAudioContext)());
async function decode({data,mime}){const bin=atob(data),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
  const ctx=AC();if(u8[0]===82&&u8[1]===73&&u8[2]===70&&u8[3]===70)return ctx.decodeAudioData(u8.buffer); // "RIFF" = WAV
  const rate=+((mime.match(/rate=(\d+)/)||[])[1]||24000),n=u8.length>>1,buf=ctx.createBuffer(1,n,rate),ch=buf.getChannelData(0),dv=new DataView(u8.buffer);
  for(let i=0;i<n;i++)ch[i]=dv.getInt16(i*2,true)/32768;return buf;}

// ---------- efectos sobre la voz ----------
let impulse=null;
function metal(ctx){if(impulse)return impulse;const L=Math.floor(ctx.sampleRate*.32),b=ctx.createBuffer(2,L,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<L;i++){const t=i/ctx.sampleRate;d[i]=(Math.random()*2-1)*Math.exp(-t*14)*.6;}
    for(const ms of [7,11,17,23,31])for(let k=0;k<6;k++){const i=Math.floor((ms*(k+1)+c*1.3)*ctx.sampleRate/1000);if(i<L)d[i]+=.5*Math.pow(.62,k);}}
  return impulse=b;}
function cadena(ctx,mode,dur){const out=ctx.createGain();out.gain.value=1;if(mode==='off'){out.connect(ctx.destination);return out;}
  if(mode==='mosaico'){const M=+cfg.mosaico,hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=110;
    const neon=ctx.createBiquadFilter();neon.type='peaking';neon.frequency.value=3300;neon.Q.value=1;neon.gain.value=1+3*M; // brillo «eléctrico»
    const dry=ctx.createGain(),wet=ctx.createGain(),cv=ctx.createConvolver();cv.buffer=metal(ctx);wet.gain.value=.1*M;
    out.connect(hp);hp.connect(neon);neon.connect(dry);neon.connect(cv);cv.connect(wet);const end=ctx.createGain();dry.connect(end);wet.connect(end);
    if(SOBRECARGA.includes(curState)){const ws=ctx.createWaveShaper(),cu=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;cu[i]=Math.tanh((1.5+2*M)*x)*.8;}ws.curve=cu;end.connect(ws);ws.connect(ctx.destination);}
    else end.connect(ctx.destination);
    return out;}
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=140;out.connect(hp);
  const dry=ctx.createGain();dry.gain.value=.85;const wet=ctx.createGain();wet.gain.value=mode==='glitch'?.34:.24;const cv=ctx.createConvolver();cv.buffer=metal(ctx);
  const chip=ctx.createBiquadFilter();chip.type='peaking';chip.frequency.value=2800;chip.Q.value=1.2;chip.gain.value=4;
  hp.connect(chip);chip.connect(dry);chip.connect(cv);cv.connect(wet);
  const end=ctx.createGain();dry.connect(end);wet.connect(end);
  if(mode==='glitch'){const ws=ctx.createWaveShaper(),cu=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;cu[i]=Math.tanh(2.2*x)*.85;}ws.curve=cu;
    const g=ctx.createGain();end.connect(ws);ws.connect(g);g.connect(ctx.destination);const t0=ctx.currentTime;
    for(let t=.3;t<dur;t+=.09)if(Math.random()<.07){g.gain.setValueAtTime(1,t0+t);g.gain.setValueAtTime(.12,t0+t+.005);g.gain.setValueAtTime(1,t0+t+.05);}}
  else end.connect(ctx.destination);
  return out;}
// mosaico (2.14): una voz principal y, detrás, ecos de otras psiques del biochip que emergen y Capri suprime;
// micro-cortes de estática y fluctuaciones de frecuencia. Con su ánimo cambia: enojada se sobrecarga, intensa se enfría.
cfg.mosaico=cfg.mosaico??.5;cfg.mosGlitch=cfg.mosGlitch??.35;
const SOBRECARGA=['enojada','glitch_fuerte','glitch_entrada','risa_malvada'],FRIA=['mirada_intensa','hipnosis','pensando'];
function mosaico(ctx,buf,rate,t0,inp){const M=+cfg.mosaico,G=+cfg.mosGlitch,D=buf.duration/rate,fria=FRIA.includes(curState),sobre=SOBRECARGA.includes(curState);
  // la voz principal, con micro-cortes y fluctuaciones
  const main=ctx.createBufferSource();main.buffer=buf;main.playbackRate.value=rate;const gl=ctx.createGain();main.connect(gl);gl.connect(inp);playing.push(main);
  for(let t=.25;t<D-.1;t+=.08){const r=Math.random();
    if(r<.035*G){const d=.006+Math.random()*.02;gl.gain.setValueAtTime(1,t0+t);gl.gain.setValueAtTime(.04,t0+t+.002);gl.gain.setValueAtTime(1,t0+t+d);}
    else if(r<.05*G){const c=(Math.random()<.5?-1:1)*(40+Math.random()*80);main.detune.setValueAtTime(0,t0+t);main.detune.linearRampToValueAtTime(c,t0+t+.03);main.detune.linearRampToValueAtTime(0,t0+t+.11);}}
  main.start(t0);
  // los ecos: la misma frase un poquito desafinada, retrasada, a los lados y más oscura
  const n=M<=0?0:M<.4?1:M<.75?2:3;
  for(let k=0;k<n;k++){const s=ctx.createBufferSource();s.buffer=buf;s.playbackRate.value=rate;s.detune.value=(k%2?1:-1)*(fria?90:45)*(1+k*.6);
    const lp=ctx.createBiquadFilter();lp.type=k===1?'bandpass':'lowpass';lp.frequency.value=fria?1400:k===1?2400:3200;lp.Q.value=k===1?.9:.7;
    const g=ctx.createGain(),peak=(fria?.2:.13)*M*(sobre?1.3:1);g.gain.value=0;
    // emergen y se apagan solos, cada uno a su ritmo
    for(let t=0;t<D;t+=.25+Math.random()*.5)g.gain.setTargetAtTime(Math.random()<.45?peak*(.4+Math.random()*.6):0,t0+t,.12);
    const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;s.connect(lp);lp.connect(g);
    if(pan){pan.pan.value=[-.55,.55,0][k];g.connect(pan);pan.connect(inp);}else g.connect(inp);
    s.start(t0+.014+k*.013);s.stop(t0+D+.05);playing.push(s);}
  return t0+D;}
let playing=[],ends=0;
// rate > 1 sube el tono (la voz local se genera más lenta para compensar)
function tocar(buf,mode,rate=1){const ctx=AC();if(ctx.state==='suspended')ctx.resume();const D=buf.duration/rate,inp=cadena(ctx,mode,D+1);let t=Math.max(ctx.currentTime+.02,ends);const t0=t;
  const src=()=>{const s=ctx.createBufferSource();s.buffer=buf;s.playbackRate.value=rate;s.connect(inp);playing.push(s);return s;};
  if(mode==='glitch'){let off=0;while(off<buf.duration){const len=Math.min(buf.duration-off,(.5+Math.random()*.8)*rate);
      src().start(t,off,len);t+=len/rate;
      if(off+len<buf.duration&&Math.random()<.28){for(let k=0;k<2;k++){src().start(t,Math.max(0,off+len-.07*rate),.07*rate);t+=.07;}}
      off+=len;}}
  else if(mode==='mosaico')t=mosaico(ctx,buf,rate,t,inp);
  else{src().start(t);t+=D;}
  ends=t;return {start:t0,end:t};}
window.vozCtx=AC;
window.vozGeminiBuf=async text=>decode(await pedir(text,cfg.ttsVoice,styleNow(),cfg.ttsModel));
// para el laboratorio de vozlab.js: tocar un audio con los efectos elegidos y saber cuándo termina
window.vozDemo=(buf,rate=1,mode=cfg.fx||'off')=>{const r=tocar(buf,mode,rate);return {fin:r.end,ahora:()=>AC().currentTime,ctx:AC()};};
function parar(){for(const s of playing)try{s.stop();}catch(e){}playing=[];ends=0;cola=[];enVuelo=false;gen++;}
window.ttsBusy=()=>enVuelo||cola.length>0||(actx&&actx.currentTime<ends);

// ---------- hablar: junta frases mientras la anterior se genera, para pedir poquitas veces ----------
let cola=[],enVuelo=false,fuera=0,avisado=0,fxOn=false,gen=0,ultimo='todavía no ha hablado';
const VL=()=>window.vozLocal;
// qué motor toca ahora: el que elegiste; si es Gemini y no se puede (sin key, sin cupo, sin red), la voz de tu PC si ya la bajaste
const motor=()=>cfg.tts==='local'?(VL()?.lista()?'local':'nav'):cfg.tts==='gemini'?(cfg.key&&Date.now()>=fuera&&navigator.onLine!==false?'gemini':VL()?.lista()?'local':'nav'):'nav';
function suena(buf,mode,rate,g){if(g!==gen)return;if(!fxOn){fxOn=true;sfx('on',mode);}const {end}=tocar(buf,mode,rate);
  clearTimeout(siguiente.t);siguiente.t=setTimeout(()=>{if(!window.ttsBusy()){fxOn=false;sfx('off',mode);}},(end-AC().currentTime)*1000+300);}
async function local(text,mode,g){const t0=performance.now();const {buf,rate}=await VL().sintetiza(text,AC());suena(buf,mode,rate,g);
  ultimo='tu PC · '+cfg.vlVoz+' ✔ ('+((performance.now()-t0)/1000).toFixed(1)+' s)';}
// Gemini: junta lo que se acumuló (menos peticiones). Tu PC: frase por frase, para que empiece a hablar cuanto antes
async function siguiente(){if(enVuelo||!cola.length)return;enVuelo=true;const m=motor(),text=m==='local'?cola.shift():cola.splice(0).join(' ');const mode=cfg.fx||'off',g=gen;
  try{if(m==='local')await local(text,mode,g);
    else if(m==='gemini'){const buf=await decode(await pedir(text,cfg.ttsVoice,styleNow(),cfg.ttsModel));if(g!==gen)return; // la callaron mientras se generaba
      ultimo='Gemini · '+cfg.ttsVoice+' ✔';suena(buf,mode,1,g);}
    else if(g===gen)_speak(text,true);}
  catch(e){if(m==='gemini'&&(e.status===429||e.status===403))fuera=Date.now()+10*60e3;
    const otra=m==='gemini'&&VL()?.lista()?'local':'nav';
    ultimo=(otra==='local'?'tu PC':'navegador')+' — '+(m==='local'?'voz local: ':'')+(e.status?e.status+': ':'')+String(e.message).slice(0,140);log('voz '+(m==='local'?'local':'Gemini')+': '+String(e.message).slice(0,60),'w');
    if(Date.now()-avisado>5*60e3){avisado=Date.now();const t=m==='local'?'(Mi voz de tu PC falló: '+String(e.message).slice(0,120)+'. Mientras, hablo con la del navegador.)':
        '(La voz de Gemini no respondió'+(e.status===429?' (sin cupo por ahora)':'')+': '+String(e.message).slice(0,120)+'. Mientras, hablo con '+(otra==='local'?'mi voz de tu PC':'la del navegador')+'.)';
      line('s',t);if(document.body.classList.contains('desk'))window.deskSay?.(m==='local'?'mi voz local falló, uso la otra':'mi voz de Gemini falló, uso la otra',3500);}
    if(g===gen){if(otra==='local')await local(text,mode,g).catch(()=>{if(g===gen)_speak(text,true);});else _speak(text,true);}}
  if(g===gen){enVuelo=false;if(cola.length)siguiente();}}
const _speak=speakChunk;
speakChunk=(text,force)=>{if(motor()==='nav')return _speak(text,force);
  if((!cfg.voice&&!force)||!text.trim())return;cola.push(text.replace(/[~:;]\)|:3|>:\)|~/g,'').trim());siguiente();};
if('speechSynthesis' in window){const c=speechSynthesis.cancel.bind(speechSynthesis);speechSynthesis.cancel=()=>{c();parar();};}

// ---------- laboratorio en Ajustes ----------
const row=$('cPreset')?.parentElement;if(!row)return;
const box=document.createElement('div');box.innerHTML=`<h3>Voz de Gemini <small style="font-weight:400">· laboratorio</small></h3>
 <label>Motor de voz<select id="cTts"><option value="gemini">Gemini (la más natural; si no hay internet o cupo, usa la de tu PC)</option><option value="local">Voz de tu PC (sin internet ni Gemini, gratis)</option><option value="nav">Voz del navegador (la más básica)</option></select></label>
 <div id="vlBox"></div>
 <label>Voz<select id="cTtsVoice"><optgroup label="Recomendadas para Capri">${VOCES.slice(0,RECOM).map(([n,d])=>`<option value="${n}">${n} — ${d}</option>`).join('')}</optgroup><optgroup label="Todas">${VOCES.slice(RECOM).map(([n,d])=>`<option value="${n}">${n} — ${d}</option>`).join('')}</optgroup></select></label>
 <label>Modelo<select id="cTtsModel"><option value="gemini-3.8-flash-tts">3.8 Flash (la mejor)</option><option value="gemini-3.8-flash-lite-tts">3.8 Flash-Lite (más barata)</option></select></label>
 <label>Tono extra (opcional)<input id="cTtsStyle" placeholder="ej. más sarcástica, voz un poco ronca, acento norteño"></label>
 <label>Frase de prueba<input id="cTtsText" value="¡Ehhh, choom! &lt;laugh&gt; La hermosa yo estrenando voz. ¿Damos un paseo? Vamos a divertirnos un rato."></label>
 <small>Su tono cambia solo con su ánimo; los efectos cyber de arriba se le ponen a esta voz. Puedes meter &lt;laugh&gt;, &lt;sigh&gt; o &lt;short pause&gt; en la frase. Cada prueba gasta un poquito de tu cupo de Google.</small>
 <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="cTtsTry" style="width:auto;flex:1;padding:8px 10px">▶ Probar esta voz</button><button class="btn" id="cTtsAll" style="width:auto;flex:1;padding:8px 10px">♫ Comparar las 6 recomendadas</button></div>
 <small id="cTtsSt"></small>`;
row.after(box);
const st=t=>{$('cTtsSt').textContent=t;};
const set=()=>{cfg.tts=$('cTts').value;cfg.ttsVoice=$('cTtsVoice').value;cfg.ttsModel=$('cTtsModel').value;cfg.ttsStyle=$('cTtsStyle').value.trim();store.set('cfg',cfg);};
const load=()=>{$('cTts').value=cfg.tts;$('cTtsVoice').value=cfg.ttsVoice;$('cTtsModel').value=cfg.ttsModel;$('cTtsStyle').value=cfg.ttsStyle;
  st(cfg.tts==='nav'?'⚠ El motor está en «Voz del navegador», la más básica.':cfg.tts==='local'?(VL()?.lista()?'Última vez que habló: '+ultimo:'⚠ Baja primero la voz de tu PC (abajo).'):!cfg.key?'⚠ Falta tu API key de Google.':'Última vez que habló: '+ultimo);pintaVL();};
load();['cTts','cTtsVoice','cTtsModel','cTtsStyle'].forEach(id=>$(id).addEventListener('change',()=>{set();load();}));
$('bCfg')?.addEventListener('click',()=>setTimeout(load,50));

async function prueba(voice){if(!cfg.key){st('Primero pega tu API key de Google arriba.');return false;}set();
  const t0=performance.now();st('Generando '+voice+'…');
  try{const buf=await decode(await pedir($('cTtsText').value||'Hola, choom.',voice,styleNow(),cfg.ttsModel));const mode=$('cFx').value||'off';
    speechSynthesis.cancel();sfx('on',mode);const {start,end}=tocar(buf,mode);st('▶ '+voice+' · tardó '+((performance.now()-t0)/1000).toFixed(1)+' s en generarse');
    await new Promise(r=>setTimeout(r,(end-AC().currentTime)*1000+150));sfx('off',mode);return true;}
  catch(e){st('No se pudo ('+(e.status||'')+'): '+String(e.message).slice(0,160)+(e.status===429?' — se acabó el cupo gratis por ahora.':''));return false;}}
// ---------- voz de tu PC ----------
function pintaVL(){const b=$('vlBox');if(!b||!VL())return;const L=VL(),B=L.bajadas(),ids=[...L.VOCES.map(v=>v[0]),...(B.has('propia')?['propia']:[])];
  if(!ids.includes(cfg.vlVoz))cfg.vlVoz=ids[0];
  b.innerHTML=`<fieldset style="border:1px solid #2a2733;padding:8px 10px;margin:6px 0"><legend><small>Voz de tu PC (Piper)</small></legend>
   <label>Voz<select id="vlVoz">${ids.map(id=>{const v=L.VOCES.find(x=>x[0]===id);return `<option value="${id}" ${id===cfg.vlVoz?'selected':''}>${v?v[1]:'Tu voz propia (archivo)'}${B.has(id)?' ✓':''}</option>`;}).join('')}</select></label>
   <div class="row" style="justify-content:flex-start;gap:8px">${B.has(cfg.vlVoz)?`<button class="btn" id="vlTry" style="width:auto;flex:1;padding:8px 10px">▶ Probar voz de tu PC</button><button class="btn" id="vlDel" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Borrar esta voz">✕</button>`
     :`<button class="btn" id="vlGet" style="width:auto;flex:1;padding:8px 10px">⬇ Bajar esta voz (una sola vez, ~60-110 MB)</button>`}
     <label class="btn" style="width:auto;flex:0 0 auto;padding:8px 10px;margin:0;cursor:pointer" title="Si ya tienes el .onnx y su .onnx.json">📁 Desde archivo<input type="file" id="vlFile" accept=".onnx,.json" multiple hidden></label></div>
   <small>Habla con tu procesador, sin internet y sin gastar nada; tu GPU queda libre para el cerebro. Tono, velocidad, pausas y cómo suena se afinan abajo, en «Afinar su voz».</small></fieldset>`;
  $('vlVoz').onchange=()=>{cfg.vlVoz=$('vlVoz').value;store.set('cfg',cfg);pintaVL();};
  if($('vlGet'))$('vlGet').onclick=async()=>{$('vlGet').disabled=true;try{await L.descargar(cfg.vlVoz,t=>st(t));st('✓ Voz lista. Ya puedes probarla.');}
    catch(e){st('No pude bajarla ('+String(e.message).slice(0,80)+'). ¿Hay internet? También puedes bajar el .onnx y el .onnx.json de huggingface.co/rhasspy/piper-voices y cargarlos con 📁.');}pintaVL();};
  if($('vlDel'))$('vlDel').onclick=async()=>{if(!confirm('¿Borrar esta voz de tu PC?'))return;await L.borrar(cfg.vlVoz);pintaVL();};
  $('vlFile').onchange=async e=>{try{cfg.vlVoz=await L.importar(e.target.files);store.set('cfg',cfg);st('✓ Tu voz quedó guardada.');}catch(err){st('✗ '+err.message);}pintaVL();};
  if($('vlTry'))$('vlTry').onclick=async()=>{const t0=performance.now();st('Generando con tu PC…');
    try{const {buf,rate}=await L.sintetiza($('cTtsText').value||'Hola, choom.',AC());const mode=$('cFx').value||'off';speechSynthesis.cancel();sfx('on',mode);
      const {end}=tocar(buf,mode,rate);st('▶ '+cfg.vlVoz+' · tardó '+((performance.now()-t0)/1000).toFixed(1)+' s (la primera vez carga el modelo)');
      await new Promise(r=>setTimeout(r,(end-AC().currentTime)*1000+150));sfx('off',mode);}
    catch(e){st('No se pudo: '+String(e.message).slice(0,160));}};}
VL()?.refresca().then(pintaVL);
$('cTtsTry').onclick=()=>prueba($('cTtsVoice').value);
$('cTtsAll').onclick=async()=>{for(const [n] of VOCES.slice(0,RECOM)){if(!(await prueba(n)))break;await new Promise(r=>setTimeout(r,500));}st('Listo. Elige la que más te guste en «Voz» y pon el motor en Gemini.');};
})();
