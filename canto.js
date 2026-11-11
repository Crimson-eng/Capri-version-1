// ================= CANTO (2.19) =================
// Capri canta con la voz de tu modelo RVC (rvc.js): el modelo copia la melodía de quien canta y le pone el timbre de Capri.
//  1) Canción: la voz de la canción (a capela) + la música → se convierte la voz y se mezcla con la música, con eco de neón.
//     Con el servidor (Applio + audio-separator) también separa la voz de la música de una canción completa.
//  2) Tú cantas: grabas tu voz cantando (con audífonos, si pones la música de fondo) y sale cantada por Capri.
//  3) Letra con melodía (experimental): la voz de tu PC dice la letra y a cada sílaba se le pone una nota (Do Re Mi…).
// Las canciones listas se guardan en su «repertorio» (carpeta Voces, canto_*.wav). En el chat: «canta», «canta NOMBRE», «canta: letra».
// Solo canciones/voces que puedas usar: tu voz o con permiso. Cantar una canción con derechos de autor es para uso personal; no la publiques sin permiso.
(()=>{
const R=()=>window.vozRVC;
cfg.canto=Object.assign({tono:0,auto:false,reverb:.35,vVoz:1,vMus:.8,notas:'Do Re Mi Fa Sol Fa Mi Re Do',lento:.75,vib:.5},cfg.canto||{});cfg.cantos=cfg.cantos||[];
const guarda=()=>store.set('cfg',cfg);
const DK=window.capriDesk?.voz;
const almacen={async leer(n){if(DK)return new Uint8Array(await DK.leer(n));const r=await (await caches.open('capri-voces')).match('/voces/'+n);if(!r)throw new Error('no está');return new Uint8Array(await r.arrayBuffer());},
  async guardar(n,b){if(DK)return DK.guardar(n,b);await (await caches.open('capri-voces')).put('/voces/'+n,new Response(b));},
  async borrar(n){if(DK)return DK.borrar(n);await (await caches.open('capri-voces')).delete('/voces/'+n);}};
const ctx=()=>window.vozCtx();
const dec=async ab=>await ctx().decodeAudioData(ab instanceof ArrayBuffer?ab:await ab.arrayBuffer());
// ---------- mezcla: voz convertida + música + eco de neón ----------
function impulso(c,seg=2.2){const sr=c.sampleRate,n=Math.floor(sr*seg),b=c.createBuffer(2,n,sr);
  for(let k=0;k<2;k++){const d=b.getChannelData(k);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3.2)*(i<sr*.012?0:1);}return b;}
async function mezcla(voz,mus,op=cfg.canto){const sr=44100,dur=Math.max(voz.duration,mus?.duration||0)+(op.reverb>0?1.5:.1);
  const off=new OfflineAudioContext(2,Math.ceil(sr*dur),sr),M=off.createGain();M.connect(off.destination);
  const v=off.createBufferSource();v.buffer=voz;const hp=off.createBiquadFilter();hp.type='highpass';hp.frequency.value=90;
  const pres=off.createBiquadFilter();pres.type='peaking';pres.frequency.value=3200;pres.Q.value=.9;pres.gain.value=3; // brillo de neón
  const comp=off.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=3.5;comp.attack.value=.004;comp.release.value=.18;
  const gv=off.createGain();gv.gain.value=+op.vVoz;v.connect(hp);hp.connect(pres);pres.connect(comp);comp.connect(gv);gv.connect(M);
  if(op.reverb>0){const cv=off.createConvolver();cv.buffer=impulso(off);const gw=off.createGain();gw.gain.value=+op.reverb*.55;
    const pre=off.createDelay(.2);pre.delayTime.value=.035;comp.connect(pre);pre.connect(cv);cv.connect(gw);gw.connect(M);}
  v.start(0);
  if(mus){const m=off.createBufferSource();m.buffer=mus;const gm=off.createGain();gm.gain.value=+op.vMus;m.connect(gm);gm.connect(M);m.start(0);}
  const out=await off.startRendering();
  let mx=0;for(let k=0;k<2;k++)for(const x of out.getChannelData(k))mx=Math.max(mx,Math.abs(x));
  if(mx>.98)for(let k=0;k<2;k++){const d=out.getChannelData(k);for(let i=0;i<d.length;i++)d[i]*=.98/mx;}
  return out;}
// ---------- la voz de la canción → la voz de Capri ----------
const mono=buf=>{if(buf.numberOfChannels===1)return buf;const b=ctx().createBuffer(1,buf.length,buf.sampleRate),d=b.getChannelData(0);
  for(let k=0;k<buf.numberOfChannels;k++){const s=buf.getChannelData(k);for(let j=0;j<d.length;j++)d[j]+=s[j]/buf.numberOfChannels;}return b;};
// a capela muy larga: el servidor recibe trozos de ~30 s (así no se cuelga con canciones de 4 min)
async function convierteVoz(buf,op={}){const r=R();if(!r)throw new Error('falta rvc.js');const mo=r.motor();
  if(mo==='servidor'?!r.listoSrv():!r.listoPagina())throw new Error(mo==='servidor'?'elige y confirma tu modelo en la pestaña RVC (servidor)':'carga tu modelo y ContentVec en la pestaña RVC');
  const tono=+cfg.canto.tono||0;
  if(mo!=='servidor')return r.convierte(mono(buf),ctx(),{motor:'pagina',tono,avance:op.avance});
  const L=Math.floor(buf.sampleRate*30),partes=[];
  for(let i=0;i<buf.length;i+=L){const n=Math.min(L,buf.length-i),b=ctx().createBuffer(1,n,buf.sampleRate);
    // a mono
    const d=b.getChannelData(0);for(let k=0;k<buf.numberOfChannels;k++){const s=buf.getChannelData(k);for(let j=0;j<n;j++)d[j]+=s[i+j]/buf.numberOfChannels;}
    partes.push(await r.convierte(b,ctx(),{motor:'servidor',tono,autotune:!!cfg.canto.auto,fuerza:.8}));op.avance?.((i+n)/buf.length);}
  const sr=partes[0].sampleRate,tot=partes.reduce((a,p)=>a+p.length,0),out=ctx().createBuffer(1,tot,sr),ch=out.getChannelData(0);let o=0;
  for(const p of partes){ch.set(p.getChannelData(0),o);o+=p.length;}return out;}
// ---------- letra con melodía ----------
const SOLF={do:0,re:2,mi:4,fa:5,sol:7,la:9,si:11},ABC={c:0,d:2,e:4,f:5,g:7,a:9,b:11};
function notas(txt){const out=[];for(const t of String(txt).trim().split(/[\s,;|]+/)){if(!t)continue;if(t==='_'||t==='-'){out.push(out.at(-1)??60);continue;}
    const m=t.toLowerCase().match(/^(do|re|mi|fa|sol|la|si|[a-g])([#b♯♭]?)(-?\d)?$/);if(!m)continue;
    let n=SOLF[m[1]]??ABC[m[1]];if(/[#♯]/.test(m[2]))n++;else if(/[b♭]/.test(m[2]))n--;
    out.push(12*((m[3]!=null?+m[3]:4)+1)+n);}return out;}
const hz=midi=>440*Math.pow(2,(midi-69)/12);
// sílabas aproximadas: tramos con voz separados por silencios cortos (100 cuadros por segundo)
function silabas(buf){const x=buf.getChannelData(0),sr=buf.sampleRate,h=Math.round(sr/100),n=Math.floor(x.length/h),e=new Float32Array(n);let mx=0;
  for(let f=0;f<n;f++){let s=0;for(let j=f*h;j<(f+1)*h;j++)s+=x[j]*x[j];e[f]=Math.sqrt(s/h);mx=Math.max(mx,e[f]);}
  const th=mx*.12,seg=[];let a=-1;
  for(let f=0;f<=n;f++){const on=f<n&&e[f]>th;if(on&&a<0)a=f;if(!on&&a>=0){if(f-a>=4)seg.push([a,f]);a=-1;}}
  // si un tramo es muy largo (palabra completa), se parte en dos o tres notas
  const out=[];for(const [s,t] of seg){const k=Math.max(1,Math.round((t-s)/28));for(let i=0;i<k;i++)out.push([s+Math.floor((t-s)*i/k),s+Math.floor((t-s)*(i+1)/k)]);}
  return out;}
function melodia(buf,ns){const seg=silabas(buf),n=Math.ceil(buf.duration*100)+4,tgt=new Float32Array(n);let prev=0;const vib=+cfg.canto.vib;
  seg.forEach(([s,t],i)=>{const f=hz(ns[i%ns.length]);for(let k=s;k<t&&k<n;k++){const j=k-s;
      let v=f;if(prev&&j<4)v=prev+(f-prev)*(j/4);                                   // se desliza a la nota
      if(j>15)v*=Math.pow(2,vib*.5*Math.sin(2*Math.PI*5.5*(j-15)/100)/12);           // vibrato al sostener
      tgt[k]=v;}prev=f;});
  return (f0,ini)=>{const o=new Float32Array(f0.length);for(let i=0;i<f0.length;i++){const k=Math.round(ini)+i;o[i]=f0[i]>0?(tgt[k]||f0[i]):0;}return o;};}
async function cantaLetra(letra,op={}){const r=R(),vl=window.vozLocal;if(!vl?.lista())throw new Error('primero baja la voz de tu PC (RELIC → Voz → Motor)');
  const ns=notas(cfg.canto.notas);if(!ns.length)throw new Error('escribe notas, por ejemplo: Do Re Mi Sol');
  const {buf}=await vl.sintetiza(letra,ctx(),{sinRVC:true,vlVel:+cfg.canto.lento,vlPausa:.12,vlVida:0});
  if(r?.listoPagina())return r.convierte(buf,ctx(),{motor:'pagina',tono:0,f0:melodia(buf,ns),avance:op.avance});
  // solo con el servidor: no se puede dictar la melodía, pero el autotune la vuelve «canto robot»
  if(r?.listoSrv())return r.convierte(buf,ctx(),{motor:'servidor',tono:+cfg.canto.tono||0,autotune:true,fuerza:1});
  throw new Error('para cantar una letra hace falta tu modelo RVC (pestaña RVC)');}
// ---------- tocar ----------
let sonando=null;
function toca(buf,nombre){para();const c=ctx();if(c.state==='suspended')c.resume();const s=c.createBufferSource();s.buffer=buf;s.connect(c.destination);s.start();sonando=s;
  let antes='observando';try{antes=curState;setState('emocionada');}catch(e){}
  s.onended=()=>{if(sonando===s){sonando=null;try{setState(antes&&antes!=='emocionada'?antes:'observando');}catch(e){}pinta();}};
  if(nombre)try{line('t','  ♪ '+nombre);}catch(e){}pinta();}
function para(){try{sonando?.stop();}catch(e){}sonando=null;}
const descarga=(buf,nombre)=>{const a=document.createElement('a');a.href=URL.createObjectURL(R().bufWav(buf));a.download=(nombre||'capri-canta').replace(/[^\w\- ]+/g,'_')+'.wav';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);};
async function guardaCanto(buf,nombre){const id=Date.now().toString(36),b=new Uint8Array(await R().bufWav(buf).arrayBuffer());
  await almacen.guardar('canto_'+id+'.wav',b);cfg.cantos.unshift({id,nombre:nombre||'Canción '+(cfg.cantos.length+1),dur:Math.round(buf.duration),fecha:Date.now()});guarda();}
async function tocaGuardado(c){const b=await almacen.leer('canto_'+c.id+'.wav');toca(await dec(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),c.nombre);}
// ---------- grabar tu voz cantando ----------
let rec=null;
async function graba(conMusica){const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:true,autoGainControl:false}});
  const mr=new MediaRecorder(s),ch=[];mr.ondataavailable=e=>e.data.size&&ch.push(e.data);
  let fondo=null;if(conMusica&&pista.mus){const c=ctx();fondo=c.createBufferSource();fondo.buffer=pista.mus;fondo.connect(c.destination);fondo.start();}
  rec={mr,s,fondo,t0:Date.now()};mr.start();
  return new Promise(res=>{mr.onstop=async()=>{s.getTracks().forEach(t=>t.stop());try{fondo?.stop();}catch(e){}rec=null;res(await dec(new Blob(ch,{type:mr.mimeType})));};});}
// ---------- interfaz (RELIC → Voz → Cantar) ----------
const casa=document.createElement('div');casa.hidden=true;document.body.appendChild(casa);
const box=document.createElement('div');box.id='cantoBox';box.className='rvz';casa.appendChild(box);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pista={voz:null,mus:null,vozN:'',musN:'',res:null,resN:''};let ocupado=false;
const st=t=>{const e=document.getElementById('caSt');if(e)e.textContent=t;};
const dur=b=>b?` · ${Math.floor(b.duration/60)}:${String(Math.round(b.duration%60)).padStart(2,'0')}`:'';
function pinta(){const r=R(),C=cfg.canto,mo=r?.motor(),ok=mo==='servidor'?r?.listoSrv():r?.listoPagina(),sep=mo==='servidor'&&r?.srv().separar;
  box.innerHTML=`<h3>Cantar <small style="font-weight:400">· Capri canta con tu modelo RVC</small></h3>
  ${ok?`<small class="ok">✓ Modelo listo (${mo==='servidor'?'servidor: '+esc(cfg.rvcSrv.modelo):'en la página'})</small>`:`<small>⚠ Primero prepara tu modelo en la pestaña <b>RVC</b> (en la página o con el servidor de Applio).</small>`}
  <small>El modelo copia la <b>melodía</b> de quien canta y le pone la voz de Capri: mientras más limpia la voz (sin música ni eco), mejor sale.</small>
  <fieldset style="border:1px solid #2a2733;padding:8px 10px"><legend><small>1 · La canción</small></legend>
   <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">
    <label class="btn" style="width:auto;flex:1;padding:8px 10px;margin:0;cursor:pointer">🎤 Voz (a capela)<input type="file" id="caVozF" accept="audio/*" hidden></label>
    <label class="btn" style="width:auto;flex:1;padding:8px 10px;margin:0;cursor:pointer">🎵 Música (sin voz)<input type="file" id="caMusF" accept="audio/*" hidden></label></div>
   <small>${pista.voz?'Voz: '+esc(pista.vozN)+dur(pista.voz):'Sin voz todavía'} · ${pista.mus?'Música: '+esc(pista.musN)+dur(pista.mus):'sin música (canta a capela)'}</small>
   ${sep?`<label class="btn" style="width:auto;padding:8px 10px;margin:0;cursor:pointer">✂ Canción completa → separar voz y música<input type="file" id="caSepF" accept="audio/*" hidden></label>`
     :`<small>¿Solo tienes la canción completa? Sepárala en Applio/UVR o instala el separador en el servidor (capri-rvc.md).</small>`}
   <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">
    <button class="btn" id="caRec" style="width:auto;flex:1;padding:8px 10px">${rec?'⏹ Parar de grabar':'⏺ Grabarme cantando'}</button>
    ${pista.mus?`<label class="ck" style="flex:1"><input type="checkbox" id="caRecMus" checked> con la música de fondo (usa audífonos)</label>`:''}</div></fieldset>
  <fieldset style="border:1px solid #2a2733;padding:8px 10px"><legend><small>2 · Cómo la canta</small></legend>
   <label>Tono (semitonos) <small id="caTonoV">${C.tono>0?'+':''}${C.tono}</small><input type="range" id="caTono" min="-12" max="12" step="1" value="${C.tono}"></label>
   <small>Voz de hombre → Capri: +12 (o +7 si queda muy aguda). Voz de mujer: 0.</small>
   ${mo==='servidor'?`<label class="ck"><input type="checkbox" id="caAuto" ${C.auto?'checked':''}> Autotune (afina cada nota)</label>`:''}
   <label>Eco de neón <small id="caRevV">${Math.round(C.reverb*100)}%</small><input type="range" id="caRev" min="0" max="1" step=".05" value="${C.reverb}"></label>
   <label>Volumen voz / música <small id="caVolV">${Math.round(C.vVoz*100)}% / ${Math.round(C.vMus*100)}%</small>
    <span style="display:flex;gap:8px"><input type="range" id="caVV" min="0" max="1.5" step=".05" value="${C.vVoz}" style="flex:1"><input type="range" id="caVM" min="0" max="1.5" step=".05" value="${C.vMus}" style="flex:1"></span></label>
   <button class="btn" id="caGo" ${ok&&pista.voz&&!ocupado?'':'disabled'} style="width:100%;padding:9px 10px">✦ Que Capri la cante</button></fieldset>
  ${pista.res?`<fieldset style="border:1px solid var(--yel);padding:8px 10px"><legend><small>Lista${dur(pista.res)}</small></legend>
   <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">
    <button class="btn" id="caPlay" style="width:auto;flex:1;padding:8px 10px">${sonando?'⏹ Parar':'▶ Escuchar'}</button>
    <button class="btn" id="caDl" style="width:auto;flex:0 0 auto;padding:8px 10px">⬇ WAV</button></div>
   <label>Nombre<input id="caNom" value="${esc(pista.resN)}" placeholder="ej. Mi canción"></label>
   <button class="btn" id="caSave" style="width:auto;padding:8px 10px">♪ Guardar en su repertorio</button></fieldset>`:''}
  <details><summary><small>Letra con melodía (experimental)</small></summary><div class="rvz" style="margin-top:6px">
   <small>La voz de tu PC dice la letra y a cada sílaba le toca la siguiente nota. Suena tipo vocaloid; para cantar de verdad, usa una voz cantada.</small>
   <label>Letra<textarea id="caLet" rows="3" placeholder="Soy el fantasma en tu chip, la chispa en tu red…">${esc(C.letra||'')}</textarea></label>
   <label>Notas (Do Re Mi… o C4 E4 G4; «_» repite)<input id="caNot" value="${esc(C.notas)}"></label>
   <label>Lentitud <small id="caLenV">${C.lento}</small><input type="range" id="caLen" min=".4" max="1.2" step=".05" value="${C.lento}"></label>
   <label>Vibrato <small id="caVibV">${C.vib}</small><input type="range" id="caVib" min="0" max="1.5" step=".1" value="${C.vib}"></label>
   <button class="btn" id="caLetGo" ${ok&&!ocupado?'':'disabled'} style="width:auto;padding:8px 10px">♪ Cantar la letra</button></div></details>
  <fieldset style="border:1px solid #2a2733;padding:8px 10px"><legend><small>Repertorio (${cfg.cantos.length})</small></legend>
   ${cfg.cantos.length?cfg.cantos.map(c=>`<div class="row" style="justify-content:space-between;gap:6px"><small style="flex:1">${esc(c.nombre)} · ${Math.floor(c.dur/60)}:${String(c.dur%60).padStart(2,'0')}</small>
     <button class="btn" data-cp="${c.id}" style="width:auto;padding:4px 10px">▶</button><button class="btn" data-cx="${c.id}" style="width:auto;padding:4px 10px">✕</button></div>`).join('')
     :'<small>Vacío. Lo que guardes aquí lo canta cuando le escribes «canta» o «canta NOMBRE».</small>'}</fieldset>
  <small>Usa tu voz o voces con permiso. Una canción con derechos de autor cantada por Capri es para escucharla tú; no la publiques sin permiso.</small>
  <small id="caSt" style="white-space:pre-wrap"></small>`;
  const g=id=>document.getElementById(id),C2=cfg.canto;
  const carga=k=>async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;st('Leyendo '+f.name+'…');try{pista[k]=await dec(f);pista[k+'N']=f.name;if(k==='voz'&&!pista.resN)pista.resN=f.name.replace(/\.[^.]+$/,'');st('');}catch(err){st('No pude leer ese audio ('+String(err.message||err).slice(0,80)+'). Prueba WAV o MP3.');}pinta();};
  g('caVozF').onchange=carga('voz');g('caMusF').onchange=carga('mus');
  if(g('caSepF'))g('caSepF').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;st('Separando voz y música en tu PC… (1-3 min la primera vez)');
    try{const s=await R().separa(f);pista.voz=await dec(s.voz);pista.mus=await dec(s.musica);pista.vozN=f.name+' (voz)';pista.musN=f.name+' (música)';pista.resN=f.name.replace(/\.[^.]+$/,'');st('✓ Separada.');}
    catch(err){st('No se pudo separar: '+String(err.message||err).slice(0,200));}pinta();};
  g('caRec').onclick=async()=>{if(rec){rec.mr.stop();return;}
    try{const p=graba(g('caRecMus')?.checked);st('⏺ Grabando… canta y pulsa «Parar» al terminar.');pinta();const b=await p;pista.voz=b;pista.vozN='tu grabación';pista.resN=pista.resN||'Mi canción';st('✓ Grabado'+dur(b)+'.');}
    catch(err){st('No pude usar el micrófono: '+String(err.message||err).slice(0,120));}pinta();};
  const rng=(id,k,lbl,fmt)=>{g(id).oninput=()=>{C2[k]=+g(id).value;if(lbl)g(lbl).textContent=fmt(C2[k]);guarda();};};
  rng('caTono','tono','caTonoV',v=>(v>0?'+':'')+v);rng('caRev','reverb','caRevV',v=>Math.round(v*100)+'%');
  const vv=()=>g('caVolV').textContent=Math.round(C2.vVoz*100)+'% / '+Math.round(C2.vMus*100)+'%';
  g('caVV').oninput=()=>{C2.vVoz=+g('caVV').value;vv();guarda();};g('caVM').oninput=()=>{C2.vMus=+g('caVM').value;vv();guarda();};
  if(g('caAuto'))g('caAuto').onchange=()=>{C2.auto=g('caAuto').checked;guarda();};
  rng('caLen','lento','caLenV',v=>v);rng('caVib','vib','caVibV',v=>v);
  g('caNot').onchange=()=>{C2.notas=g('caNot').value;guarda();};g('caLet').onchange=()=>{C2.letra=g('caLet').value;guarda();};
  const corre=async(fn,msg)=>{ocupado=true;pinta();const t0=performance.now();st(msg);
    try{const v=await fn(p=>st(msg+' '+Math.round(p*100)+'%'));st('Mezclando…');pista.res=await mezcla(v,pista.mus&&fn===conv?pista.mus:null);
      st(`✓ Lista en ${((performance.now()-t0)/1000).toFixed(0)} s.`);ocupado=false;toca(pista.res);}
    catch(err){ocupado=false;st('No se pudo: '+String(err.message||err).slice(0,220));}pinta();};
  const conv=av=>convierteVoz(pista.voz,{avance:av});
  g('caGo').onclick=()=>corre(conv,'Convirtiendo la voz…');
  g('caLetGo').onclick=()=>{const t=g('caLet').value.trim();if(!t){st('Escribe la letra.');return;}C2.letra=t;C2.notas=g('caNot').value;guarda();pista.resN=pista.resN||t.slice(0,30);corre(av=>cantaLetra(t,{avance:av}),'Cantando la letra…');};
  if(g('caPlay'))g('caPlay').onclick=()=>{if(sonando){para();pinta();}else toca(pista.res);};
  if(g('caDl'))g('caDl').onclick=()=>descarga(pista.res,g('caNom').value.trim());
  if(g('caSave'))g('caSave').onclick=async()=>{try{st('Guardando…');await guardaCanto(pista.res,g('caNom').value.trim());st('✓ Guardada en su repertorio.');}catch(err){st('No se guardó: '+String(err.message||err).slice(0,120));}pinta();};
  box.querySelectorAll('[data-cp]').forEach(b=>b.onclick=async()=>{const c=cfg.cantos.find(x=>x.id===b.dataset.cp);try{await tocaGuardado(c);}catch(err){st('No encontré el audio: '+err.message);}});
  box.querySelectorAll('[data-cx]').forEach(b=>b.onclick=async()=>{const c=cfg.cantos.find(x=>x.id===b.dataset.cx);if(!c||!confirm('¿Quitar «'+c.nombre+'» del repertorio?'))return;
    await almacen.borrar('canto_'+c.id+'.wav').catch(()=>{});cfg.cantos=cfg.cantos.filter(x=>x!==c);guarda();pinta();});}
addEventListener('capri:rvc',()=>{if(!ocupado&&!rec)pinta();});
pinta();
// ---------- en el chat ----------
const _send=send;
send=async v=>{const raw=(v||'').trim(),k=raw.toLowerCase().replace(/[¡!¿?.]+/g,'').trim();
  const m=raw.match(/^(?:canta|cántame|cantame)\s*:\s*([\s\S]+)/i);
  if(m&&!busy){line('u',raw);line('t','  ♪ Calentando la voz…');try{toca(await cantaLetra(m[1].trim()),'(letra)');}catch(e){line('t','  ✗ '+e.message+'. Prepárala en RELIC → Voz → Cantar.');}return;}
  const c=k.match(/^(?:canta|cántame|cantame|cantanos|cántanos)(?:\s+algo|\s+una canci[oó]n)?(?:\s+(.+))?$/);
  if(c&&!busy){line('u',raw);if(!cfg.cantos.length){line('t','  Todavía no me sé ninguna. Enséñame una en RELIC → Voz → Cantar (una voz cantada + tu modelo RVC) y la guardo en mi repertorio.');return;}
    const q=(c[1]||'').trim(),it=q?cfg.cantos.find(x=>x.nombre.toLowerCase().includes(q)):cfg.cantos[Math.floor(Math.random()*cfg.cantos.length)];
    if(!it){line('t','  Esa no me la sé. Mi repertorio: '+cfg.cantos.map(x=>x.nombre).join(', '));return;}
    try{await tocaGuardado(it);}catch(e){line('t','  ✗ No encontré el audio de «'+it.nombre+'».');}return;}
  if(/^(para|deja de cantar|c[aá]llate|silencio)$/.test(k)&&sonando){para();line('u',raw);return;}
  await _send(v);if(k==='help')line('t','  canta [nombre] — Capri canta algo de su repertorio\n  canta: letra… — canta la letra con las notas de RELIC → Voz → Cantar');};
window.capriCanto={notas,silabas,melodia,mezcla,cantaLetra,toca,para};
})();
