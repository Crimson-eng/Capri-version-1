// ================= GRABADORA PARA ENTRENAR SU VOZ (2.15) =================
// Para que la voz de tu PC suene humana de verdad hay que entrenarla con grabaciones de una persona real:
// tú, o alguien que te dé permiso. Aquí se graba el guion (entrenar/guion.txt) frase por frase, se guarda en
// tu PC (IndexedDB) y se exporta un .zip con los audios, metadata.csv y el script de entrenamiento (Piper).
// Nunca se graba la voz de alguien sin su permiso, ni se usan audios de actrices o personajes.
(()=>{
const anchor=$('vfSt');if(!anchor)return;
const SR=22050,DB='capri-grabadora';
// ---------- guardar tomas ----------
let dbP=null;const db=()=>dbP||(dbP=new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('tomas');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));
const tx=async(m,f)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('tomas',m),s=t.objectStore('tomas'),r=f(s);t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});};
const pon=(i,v)=>tx('readwrite',s=>s.put(v,i)),toma=i=>tx('readonly',s=>s.get(i)),todas=()=>tx('readonly',s=>s.getAllKeys()),borraTodo=()=>tx('readwrite',s=>s.clear());
// ---------- audio ----------
function wav(f32){const b=new ArrayBuffer(44+f32.length*2),v=new DataView(b),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');v.setUint32(4,36+f32.length*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,f32.length*2,true);
  for(let i=0;i<f32.length;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,f32[i]))*32767,true);return b;}
async function a22k(chunks,sr){const n=chunks.reduce((a,c)=>a+c.length,0),all=new Float32Array(n);let o=0;for(const c of chunks){all.set(c,o);o+=c.length;}
  if(sr===SR)return all;const len=Math.ceil(n*SR/sr),off=new OfflineAudioContext(1,len,SR),b=off.createBuffer(1,n,sr);b.getChannelData(0).set(all);
  const s=off.createBufferSource();s.buffer=b;s.connect(off.destination);s.start();return (await off.startRendering()).getChannelData(0);}
// quita el silencio de las orillas (deja 0.15 s) y dice si quedó muy bajito o saturado
function limpia(p){let mx=0;for(const x of p)mx=Math.max(mx,Math.abs(x));const th=Math.max(.01,mx*.06),m=Math.floor(SR*.15);let a=0,b=p.length-1;
  while(a<b&&Math.abs(p[a])<th)a++;while(b>a&&Math.abs(p[b])<th)b--;
  return {pcm:p.slice(Math.max(0,a-m),Math.min(p.length,b+m)),mx,sat:[...p].filter(x=>Math.abs(x)>.985).length};}
// ---------- interfaz ----------
const css=`#grab{position:fixed;inset:0;z-index:9999;background:rgba(5,3,10,.94);display:none;align-items:center;justify-content:center;font-family:inherit}
#grab.show{display:flex}#grab .in{width:min(720px,94vw);max-height:94vh;overflow:auto;background:#0d0b12;border:1px solid #ff4d5e;padding:18px 20px;color:#e9e6ef}
#grab h2{margin:0 0 6px;color:#ff4d5e;font-size:1.1em;letter-spacing:.08em}#grab .fr{font-size:1.45em;line-height:1.35;min-height:3.2em;margin:14px 0;padding:12px;border-left:3px solid #5ef6ff;background:#14121b}
#grab button{background:#14121b;border:1px solid #3a3545;color:#e9e6ef;padding:8px 12px;cursor:pointer;font:inherit}#grab button:disabled{opacity:.4;cursor:default}
#grab button.rec{border-color:#ff4d5e;color:#ff4d5e}#grab .row2{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}
#grab .bar{height:8px;background:#1d1a26;position:relative}#grab .bar i{position:absolute;left:0;top:0;bottom:0;background:#5ef6ff;width:0}
#grab small{opacity:.75}#grab .ok{color:#2dff8f}#grab .warn{color:#fff200}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const ov=document.createElement('div');ov.id='grab';ov.innerHTML=`<div class="in">
 <h2>🎙 ENTRENAR UNA VOZ PROPIA</h2>
 <small>Graba el guion frase por frase (unos 20-30 min en total, puedes hacerlo en varios días). Al final exportas un .zip y lo entrenas en tu PC con el script que va adentro.</small>
 <div id="gPerm" style="margin:10px 0;padding:10px;border:1px solid #3a3545">
  <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="gOk"> <span>La voz que voy a grabar es <b>mía</b>, o su dueña/dueño me dio <b>permiso</b> de usarla para Capri. No voy a usar audios de actrices, personajes ni de nadie sin su permiso.</span></label>
  <div class="row2"><label>¿De quién es la voz? <input id="gQuien" placeholder="tu nombre o el de quien graba" style="width:220px"></label></div></div>
 <div class="row2"><small>Consejos: cuarto callado, siempre el mismo micrófono a un palmo de la boca, sin música ni ventilador. Habla natural, con la actitud de Capri.</small></div>
 <div class="row2"><span id="gPos"></span><span style="flex:1"></span><small id="gTot"></small></div>
 <div class="bar"><i id="gProg"></i></div>
 <div class="fr" id="gFr"></div>
 <div class="bar" title="nivel del micrófono"><i id="gLvl" style="background:#2dff8f"></i></div>
 <div class="row2" style="margin-top:10px">
  <button id="gPrev">◀</button><button id="gRec" class="rec">● Grabar (espacio)</button><button id="gPlay" disabled>▶ Escuchar</button><button id="gNext">▶▶ Siguiente (Enter)</button>
  <span style="flex:1"></span><button id="gFalta" title="Ir a la primera frase sin grabar">Ir a la que falta</button></div>
 <div class="row2"><small id="gSt"></small><span style="flex:1"></span><button id="gQuita" style="display:none" title="Quitar esta frase tuya (y su grabación)">✕ Quitar esta frase</button></div>
 <details style="margin-top:8px"><summary><small>✎ Agregar tus propias frases</small></summary>
  <textarea id="gMias" rows="4" style="width:100%;margin-top:6px" placeholder="Una frase por línea, como tú quieras que hable Capri. Ej.: ¿Otra vez despierto a esta hora, choom?"></textarea>
  <div class="row2"><button id="gAdd">➕ Agregar al final</button><button id="gTxt">📄 Desde un .txt</button><input type="file" id="gTxtF" accept=".txt" hidden><small id="gMiasN"></small></div>
  <small>Lee cada frase <b>exactamente</b> como está escrita (números con letra: «tres», no «3»). Tus frases se suman al guion; mientras más variadas (preguntas, exclamaciones, frases largas y cortas), mejor aprende todos los sonidos.</small></details>
 <div class="row2" style="margin-top:12px;border-top:1px solid #2a2733;padding-top:10px">
  <button id="gExp">⬇ Exportar para entrenar (.zip)</button><button id="gDel">🗑 Borrar todas</button><span style="flex:1"></span><button id="gClose">Cerrar</button></div>
 <small>Las grabaciones se quedan en esta PC hasta que las borres. El .zip trae LEEME.txt con los pasos para entrenar (Windows con WSL y tarjeta NVIDIA).</small></div>`;
document.body.appendChild(ov);
const b=document.createElement('div');b.className='row';b.style.cssText='justify-content:flex-start;gap:8px;margin-top:6px';
b.innerHTML=`<button class="btn" id="vfGrab" style="width:auto;flex:1;padding:8px 10px">🎙 Entrenar una voz propia (grabar con tu voz o la de alguien con permiso)</button>`;
anchor.after(b);
const g=id=>document.getElementById(id),msg=(t,c='')=>{g('gSt').className=c;g('gSt').textContent=t;};
let base=[],guion=[],i=0,hechas=new Set(),durs={},grabando=null,audioPrev=null;
// tus frases van después del guion; en la base de datos llevan su propia numeración (10000+) para que no choquen
cfg.grabPropias=cfg.grabPropias||[];
const K=n=>n<base.length?n:10000+(n-base.length);
const arma=()=>{guion=[...base,...cfg.grabPropias];};
async function cargaGuion(){if(!base.length){const t=await (await fetch('entrenar/guion.txt')).text();base=t.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));}arma();}
async function refresca(){hechas=new Set(await todas());let s=0;for(const k of hechas){if(durs[k]==null){const r=await toma(k);durs[k]=r?.dur||0;}s+=durs[k];}
  g('gTot').textContent=`${hechas.size} de ${guion.length} frases · ${(s/60).toFixed(1)} min grabados`;g('gProg').style.width=(hechas.size/guion.length*100)+'%';}
function pinta(){const h=hechas.has(K(i)),propia=i>=base.length;g('gPos').textContent=`Frase ${i+1} de ${guion.length}`+(propia?' · tuya':'')+(h?' ✓':'');g('gFr').textContent=guion[i]||'';g('gPlay').disabled=!h;
  g('gQuita').style.display=propia?'':'none';
  g('gRec').textContent=grabando?'■ Parar (espacio)':h?'● Volver a grabar (espacio)':'● Grabar (espacio)';}
const ir=n=>{if(grabando)return;i=Math.max(0,Math.min(guion.length-1,n));pinta();msg('');};
async function abre(){await cargaGuion();nMias();g('gQuien').value=cfg.grabQuien||'';g('gOk').checked=!!cfg.grabOk;await refresca();
  i=guion.findIndex((_,k)=>!hechas.has(K(k)));if(i<0)i=0;pinta();ov.classList.add('show');}
g('vfGrab').onclick=()=>abre().catch(e=>alert('No pude abrir la grabadora: '+e.message));
g('gClose').onclick=()=>{if(grabando)para(true);ov.classList.remove('show');};
g('gOk').onchange=g('gQuien').onchange=()=>{cfg.grabOk=g('gOk').checked;cfg.grabQuien=g('gQuien').value.trim();store.set('cfg',cfg);};
g('gPrev').onclick=()=>ir(i-1);g('gNext').onclick=()=>ir(i+1);
g('gFalta').onclick=()=>{const k=guion.findIndex((_,n)=>!hechas.has(K(n)));if(k<0)msg('¡Ya grabaste todo el guion! Exporta el .zip.','ok');else ir(k);};
// ---------- grabar ----------
async function graba(){if(!g('gOk').checked||!g('gQuien').value.trim()){msg('Primero marca la casilla de permiso y escribe de quién es la voz.','warn');return;}
  window.speechSynthesis?.cancel();let s;
  try{s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});}
  catch(e){msg('No pude usar el micrófono: '+e.message,'warn');return;}
  const ctx=new (window.AudioContext||window.webkitAudioContext)(),src=ctx.createMediaStreamSource(s),pr=ctx.createScriptProcessor(4096,1,1),chunks=[];
  pr.onaudioprocess=e=>{const d=e.inputBuffer.getChannelData(0);chunks.push(new Float32Array(d));let m=0;for(const x of d)m=Math.max(m,Math.abs(x));g('gLvl').style.width=Math.min(100,m*110)+'%';g('gLvl').style.background=m>.95?'#ff4d5e':'#2dff8f';};
  src.connect(pr);pr.connect(ctx.destination);grabando={s,ctx,pr,src,chunks,idx:i,key:K(i),t0:Date.now()};pinta();msg('Grabando… lee la frase y luego pulsa espacio.');}
async function para(cancelar){const r=grabando;if(!r)return;grabando=null;r.pr.disconnect();r.src.disconnect();r.s.getTracks().forEach(t=>t.stop());g('gLvl').style.width='0';
  const sr=r.ctx.sampleRate;r.ctx.close();pinta();if(cancelar)return;
  if(Date.now()-r.t0<600){msg('Muy cortita, vuelve a intentarlo.','warn');return;}
  const {pcm,mx,sat}=limpia(await a22k(r.chunks,sr)),dur=pcm.length/SR;
  if(mx<.05){msg('Casi no se escuchó nada. ¿Es el micrófono correcto? Acércate un poco.','warn');return;}
  await pon(r.key,{wav:wav(pcm),texto:guion[r.idx],dur,quien:g('gQuien').value.trim(),fecha:Date.now()});durs[r.key]=dur;await refresca();pinta();
  msg(sat>20?'Guardada, pero se saturó (muy fuerte). Aléjate un poco y vuelve a grabarla.':mx<.15?'Guardada, pero quedó bajita. Acércate un poco al micrófono.':'✓ Guardada ('+dur.toFixed(1)+' s). Enter para la siguiente.',sat>20||mx<.15?'warn':'ok');}
g('gRec').onclick=()=>grabando?para():graba();
g('gPlay').onclick=async()=>{const r=await toma(K(i));if(!r)return;audioPrev?.pause();audioPrev=new Audio(URL.createObjectURL(new Blob([r.wav],{type:'audio/wav'})));audioPrev.play();};
addEventListener('keydown',e=>{if(!ov.classList.contains('show')||e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  if(e.code==='Space'){e.preventDefault();g('gRec').click();}else if(e.key==='Enter'){e.preventDefault();if(!grabando)ir(i+1);}
  else if(e.key==='ArrowLeft')ir(i-1);else if(e.key==='ArrowRight')ir(i+1);else if(e.key==='Escape')g('gClose').click();},true);
// ---------- exportar ----------
const script=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('no cargó '+src));document.head.appendChild(s);});
g('gExp').onclick=async()=>{await refresca();if(hechas.size<20){msg('Graba por lo menos unas 20 frases antes de exportar (lo ideal es todo el guion).','warn');return;}
  msg('Armando el .zip…');try{if(!window.JSZip)await script('vendor/lectores/jszip.min.js');const z=new JSZip(),csv=[];let s=0;
    for(const k of [...hechas].sort((a,b)=>a-b)){const r=await toma(k),n=(k<10000?'capri_'+String(k+1).padStart(4,'0'):'propia_'+String(k-9999).padStart(4,'0'))+'.wav';z.file('wavs/'+n,r.wav);csv.push(n+'|'+r.texto.replace(/\|/g,' '));s+=r.dur;}
    z.file('metadata.csv',csv.join('\n')+'\n');
    for(const f of ['entrenar_voz.sh','LEEME.txt'])z.file(f,await (await fetch('entrenar/'+f)).text());
    z.file('PERMISO.txt',`Voz de: ${g('gQuien').value.trim()}\nFecha: ${new Date().toLocaleString()}\nQuien grabó confirmó que la voz es suya o que tiene permiso de su dueña/dueño para usarla en Capri.\n`);
    const blob=await z.generateAsync({type:'blob'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='capri-voz-entrenar.zip';document.body.appendChild(a);a.click();a.remove();
    msg(`✓ Listo: ${hechas.size} frases, ${(s/60).toFixed(1)} min. Abre LEEME.txt dentro del .zip para entrenar.`,'ok');}
  catch(e){msg('No pude armar el .zip: '+e.message,'warn');}};
const nMias=()=>{g('gMiasN').textContent=cfg.grabPropias.length?cfg.grabPropias.length+' frases tuyas en la lista':'';};
function agrega(txt){const nuevas=txt.split(/\r?\n/).map(s=>s.replace(/\|/g,' ').replace(/\s+/g,' ').trim()).filter(s=>s.length>1&&!s.startsWith('#'));
  if(!nuevas.length){msg('No encontré frases (una por línea).','warn');return;}
  cfg.grabPropias.push(...nuevas);store.set('cfg',cfg);arma();nMias();refresca();ir(base.length+cfg.grabPropias.length-nuevas.length);
  msg('✓ '+nuevas.length+' frase'+(nuevas.length>1?'s':'')+' tuya'+(nuevas.length>1?'s':'')+' agregada'+(nuevas.length>1?'s':'')+'. Ya estás en la primera.','ok');}
g('gAdd').onclick=()=>{agrega(g('gMias').value);g('gMias').value='';};
g('gTxt').onclick=()=>g('gTxtF').click();g('gTxtF').onchange=async e=>{const f=e.target.files[0];if(f)agrega(await f.text());e.target.value='';};
// quitar una frase tuya: se borra su grabación y las de después se recorren para que cada audio siga con su texto
g('gQuita').onclick=async()=>{const j=i-base.length;if(j<0||grabando)return;if(!confirm('¿Quitar esta frase y su grabación?'))return;
  const n=cfg.grabPropias.length,recs=[];for(let k=j+1;k<n;k++)recs.push(await toma(10000+k));
  await tx('readwrite',st=>{st.delete(10000+j);for(let k=j+1;k<n;k++){st.delete(10000+k);const r=recs[k-j-1];if(r)st.put(r,10000+k-1);}});
  cfg.grabPropias.splice(j,1);store.set('cfg',cfg);durs={};arma();nMias();await refresca();ir(Math.min(i,guion.length-1));msg('Frase quitada.');};
g('gDel').onclick=async()=>{if(!confirm('¿Borrar TODAS las grabaciones? No se puede deshacer.'))return;await borraTodo();durs={};await refresca();pinta();msg('Grabaciones borradas.');};
})();
