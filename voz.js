// ================= VOZ DE GEMINI =================
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
let playing=[],ends=0;
function tocar(buf,mode){const ctx=AC();if(ctx.state==='suspended')ctx.resume();const inp=cadena(ctx,mode,buf.duration+1);let t=Math.max(ctx.currentTime+.02,ends);const t0=t;
  if(mode==='glitch'){let off=0;while(off<buf.duration){const len=Math.min(buf.duration-off,.5+Math.random()*.8);
      const s=ctx.createBufferSource();s.buffer=buf;s.connect(inp);s.start(t,off,len);playing.push(s);t+=len;
      if(off+len<buf.duration&&Math.random()<.28){for(let k=0;k<2;k++){const r=ctx.createBufferSource();r.buffer=buf;r.connect(inp);r.start(t,Math.max(0,off+len-.07),.07);playing.push(r);t+=.07;}}
      off+=len;}}
  else{const s=ctx.createBufferSource();s.buffer=buf;s.connect(inp);s.start(t);playing.push(s);t+=buf.duration;}
  ends=t;return {start:t0,end:t};}
function parar(){for(const s of playing)try{s.stop();}catch(e){}playing=[];ends=0;cola=[];enVuelo=false;gen++;}
window.ttsBusy=()=>enVuelo||cola.length>0||(actx&&actx.currentTime<ends);

// ---------- hablar: junta frases mientras la anterior se genera, para pedir poquitas veces ----------
let cola=[],enVuelo=false,fuera=0,avisado=0,fxOn=false,gen=0,ultimo='todavía no ha hablado';
async function siguiente(){if(enVuelo||!cola.length)return;enVuelo=true;const text=cola.join(' ');cola=[];const mode=cfg.fx||'off',g=gen;
  try{const buf=await decode(await pedir(text,cfg.ttsVoice,styleNow(),cfg.ttsModel));if(g!==gen)return; // la callaron mientras se generaba
    ultimo='Gemini · '+cfg.ttsVoice+' ✔';if(!fxOn){fxOn=true;sfx('on',mode);}const {end}=tocar(buf,mode);
    clearTimeout(siguiente.t);siguiente.t=setTimeout(()=>{if(!window.ttsBusy()){fxOn=false;sfx('off',mode);}},(end-AC().currentTime)*1000+300);}
  catch(e){if(e.status===429||e.status===403)fuera=Date.now()+10*60e3;
    ultimo='navegador — '+(e.status?e.status+': ':'')+String(e.message).slice(0,140);log('voz Gemini: '+String(e.message).slice(0,60),'w');
    if(Date.now()-avisado>5*60e3){avisado=Date.now();const t='(La voz de Gemini no respondió'+(e.status===429?' (sin cupo por ahora)':'')+': '+String(e.message).slice(0,120)+'. Mientras, hablo con la del navegador.)';
      line('s',t);if(document.body.classList.contains('desk'))window.deskSay?.('mi voz de Gemini falló, uso la otra',3500);}
    if(g===gen)_speak(text,true);}
  if(g===gen){enVuelo=false;if(cola.length)siguiente();}}
const _speak=speakChunk;
speakChunk=(text,force)=>{if(cfg.tts!=='gemini'||!cfg.key||Date.now()<fuera)return _speak(text,force);
  if((!cfg.voice&&!force)||!text.trim())return;cola.push(text.replace(/[~:;]\)|:3|>:\)|~/g,'').trim());siguiente();};
if('speechSynthesis' in window){const c=speechSynthesis.cancel.bind(speechSynthesis);speechSynthesis.cancel=()=>{c();parar();};}

// ---------- laboratorio en Ajustes ----------
const row=$('cPreset')?.parentElement;if(!row)return;
const box=document.createElement('div');box.innerHTML=`<h3>Voz de Gemini <small style="font-weight:400">· laboratorio</small></h3>
 <label>Motor de voz<select id="cTts"><option value="nav">Voz del navegador (gratis, sin internet)</option><option value="gemini">Gemini (más natural, usa tu key de Google)</option></select></label>
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
  st(cfg.tts!=='gemini'?'⚠ El motor está en «Voz del navegador»: cámbialo a Gemini para que hable con '+cfg.ttsVoice+'.':!cfg.key?'⚠ Falta tu API key de Google.':'Última vez que habló: '+ultimo);};
load();['cTts','cTtsVoice','cTtsModel','cTtsStyle'].forEach(id=>$(id).addEventListener('change',()=>{set();load();}));
$('bCfg')?.addEventListener('click',()=>setTimeout(load,50));

async function prueba(voice){if(!cfg.key){st('Primero pega tu API key de Google arriba.');return false;}set();
  const t0=performance.now();st('Generando '+voice+'…');
  try{const buf=await decode(await pedir($('cTtsText').value||'Hola, choom.',voice,styleNow(),cfg.ttsModel));const mode=$('cFx').value||'off';
    speechSynthesis.cancel();sfx('on',mode);const {start,end}=tocar(buf,mode);st('▶ '+voice+' · tardó '+((performance.now()-t0)/1000).toFixed(1)+' s en generarse');
    await new Promise(r=>setTimeout(r,(end-AC().currentTime)*1000+150));sfx('off',mode);return true;}
  catch(e){st('No se pudo ('+(e.status||'')+'): '+String(e.message).slice(0,160)+(e.status===429?' — se acabó el cupo gratis por ahora.':''));return false;}}
$('cTtsTry').onclick=()=>prueba($('cTtsVoice').value);
$('cTtsAll').onclick=async()=>{for(const [n] of VOCES.slice(0,RECOM)){if(!(await prueba(n)))break;await new Promise(r=>setTimeout(r,500));}st('Listo. Elige la que más te guste en «Voz» y pon el motor en Gemini.');};
})();
