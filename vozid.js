// ================= HUELLA DE VOZ (2.13) =================
// Capri distingue quién le habla. Con unas frases aprende tu «huella de voz»: un vector de 512 números que resume
// cómo suenas (timbre, resonancia), sacado por una red neuronal (WeSpeaker CAM++, entrenada en VoxCeleb) que corre
// aquí mismo con onnxruntime-web, el mismo motor de la voz local. El audio nunca sale de tu PC para esto.
// Cada vez que le hablas, compara tu voz con la huella: si coincide eres su dueño; si no, te trata como invitado
// (amable, pero sin contarle nada privado ni mover tu PC). La huella se guarda con tus ajustes, así que con la bóveda
// activa queda cifrada. No es una cerradura: una grabación tuya o una voz clonada podrían engañarla.
(()=>{
const ORT='vendor/piper/',MODELO='vendor/vozid/wespeaker_campp.onnx',ID_MODELO='wespeaker-campp';
const FRASES=['Capri, soy yo. Esta es mi voz y quiero que la reconozcas.',
 'Hoy es un buen día para trabajar contigo en el proyecto Capricornio.',
 'Uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez.',
 'Si alguien más te habla, trátalo como invitado y no le cuentes nada mío.',
 'Abre la biblioteca y léeme lo último que estudiamos, por favor.'];
cfg.vidOn=cfg.vidOn??true;cfg.vidUmbral=cfg.vidUmbral||0.45;
let H=store.get('huellaVoz',null); // {v, modelo, muestras:[[512]], extra:[[512]], fecha}
if(H&&H.modelo!==ID_MODELO)H=null; // una huella de otro modelo no se puede comparar
const guarda=()=>store.set('huellaVoz',H);

// ---------- rasgos: fbank de 80 bandas igual que Kaldi (25 ms, cada 10 ms, ventana povey, preénfasis 0.97) ----------
const FL=400,FS=160,NF=512,NB=80,EPS=1.1920929e-7;
const WIN=Float64Array.from({length:FL},(_,i)=>Math.pow(.5-.5*Math.cos(2*Math.PI*i/(FL-1)),.85));
const mel=f=>1127*Math.log(1+f/700);
const BANCO=(()=>{const lo=mel(20),d=(mel(8000)-lo)/(NB+1),B=[];
  for(let b=0;b<NB;b++){const l=lo+b*d,c=l+d,r=c+d,w=[];let s=-1;
    for(let k=0;k<NF/2;k++){const m=mel(k*16000/NF);if(m>l&&m<r){if(s<0)s=k;w.push(m<=c?(m-l)/(c-l):(r-m)/(r-c));}}
    B.push([s,Float64Array.from(w)]);}return B;})();
const REV=Uint16Array.from({length:NF},(_,i)=>{let r=0;for(let b=1,j=i;b<NF;b<<=1,j>>=1)r=(r<<1)|(j&1);return r;});
const COS=Float64Array.from({length:NF/2},(_,i)=>Math.cos(2*Math.PI*i/NF)),SIN=Float64Array.from({length:NF/2},(_,i)=>-Math.sin(2*Math.PI*i/NF));
function fft(re,im){for(let i=0;i<NF;i++){const j=REV[i];if(j>i){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
  for(let len=2;len<=NF;len<<=1){const h=len>>1,st=NF/len;
    for(let i=0;i<NF;i+=len)for(let k=0;k<h;k++){const c=COS[k*st],s=SIN[k*st],a=i+k,b=a+h,xr=re[b]*c-im[b]*s,xi=re[b]*s+im[b]*c;
      re[b]=re[a]-xr;im[b]=im[a]-xi;re[a]+=xr;im[a]+=xi;}}}
function fbank(x){const n=1+Math.floor((x.length-FL)/FS);if(n<1)return null;
  const out=new Float32Array(n*NB),fr=new Float64Array(FL),re=new Float64Array(NF),im=new Float64Array(NF),pw=new Float64Array(NF/2);
  for(let t=0;t<n;t++){let m=0;for(let i=0;i<FL;i++){fr[i]=x[t*FS+i]*32768;m+=fr[i];}m/=FL;for(let i=0;i<FL;i++)fr[i]-=m;
    for(let i=FL-1;i>0;i--)fr[i]-=.97*fr[i-1];fr[0]-=.97*fr[0];
    re.fill(0);im.fill(0);for(let i=0;i<FL;i++)re[i]=fr[i]*WIN[i];fft(re,im);for(let k=0;k<NF/2;k++)pw[k]=re[k]*re[k]+im[k]*im[k];
    for(let b=0;b<NB;b++){const [s,w]=BANCO[b];let e=0;for(let j=0;j<w.length;j++)e+=w[j]*pw[s+j];out[t*NB+b]=Math.log(Math.max(e,EPS));}}
  for(let b=0;b<NB;b++){let m=0;for(let t=0;t<n;t++)m+=out[t*NB+b];m/=n;for(let t=0;t<n;t++)out[t*NB+b]-=m;}  // quita el promedio (el «color» del micrófono)
  return {data:out,n};}
// recorta silencio al inicio y al final; dice cuántos segundos de voz hay de verdad
function recorta(x,max=10){const B=160,nb=Math.floor(x.length/B);if(!nb)return {x,voz:0};const rms=new Float32Array(nb);let pk=0;
  for(let b=0;b<nb;b++){let s=0;for(let i=b*B;i<b*B+B;i++)s+=x[i]*x[i];rms[b]=Math.sqrt(s/B);pk=Math.max(pk,rms[b]);}
  const thr=Math.max(pk*.06,.003);let a=0,z=nb-1,voz=0;while(a<nb&&rms[a]<thr)a++;while(z>a&&rms[z]<thr)z--;for(let b=a;b<=z;b++)if(rms[b]>=thr)voz++;
  const i0=Math.max(0,(a-20)*B),i1=Math.min(x.length,(z+21)*B,i0+max*16000);return {x:x.subarray(i0,i1),voz:voz*B/16000,pico:pk};}

// ---------- red neuronal ----------
const script=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('no cargó '+src));document.head.appendChild(s);});
async function bajaModelo(){let c=null;try{c=await caches.open('capri-vozid');const r=await c.match(MODELO);if(r)return new Uint8Array(await r.arrayBuffer());}catch(e){}
  const r=await fetch(MODELO);if(!r.ok)throw new Error('no encontré el modelo de huella ('+r.status+')');const b=await r.arrayBuffer();
  try{await c?.put(MODELO,new Response(b.slice(0)));}catch(e){}return new Uint8Array(b);}
let sesP=null;
const sesion=()=>sesP||(sesP=(async()=>{if(!window.ort)await script(ORT+'ort.wasm.min.js');const e=ort.env.wasm;
    if(!e.wasmPaths){e.wasmPaths=new URL(ORT,location.href).href;e.numThreads=self.crossOriginIsolated?Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1)):1;}
    return ort.InferenceSession.create(await bajaModelo(),{executionProviders:['wasm'],graphOptimizationLevel:'all'});})().catch(e=>{sesP=null;throw e;}));
const norma=v=>{let s=0;for(const x of v)s+=x*x;s=Math.sqrt(s)||1;return Array.from(v,x=>x/s);};
const coseno=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;};
// pcm: Float32Array a 16 kHz → {e: huella normalizada, voz: segundos de voz}
async function huella(pcm,max=10){const r=recorta(pcm,max);if(r.voz<.3)return {e:null,voz:r.voz,pico:r.pico};const f=fbank(r.x);if(!f)return {e:null,voz:r.voz};
  const s=await sesion(),o=await s.run({feats:new ort.Tensor('float32',f.data,[1,f.n,NB])});return {e:norma(o[s.outputNames[0]].data),voz:r.voz,pico:r.pico};}
function centro(){if(!H?.muestras?.length)return null;const d=H.muestras[0].length,c=new Float64Array(d);
  for(const m of H.muestras)for(let i=0;i<d;i++)c[i]+=m[i];for(const m of H.extra||[])for(let i=0;i<d;i++)c[i]+=m[i]*.5;return norma(c);}

// ---------- ¿quién habla? ----------
let ultimo=null,duenoTs=0,escribio=0;
const pct=s=>Math.round(Math.max(0,s)*100)+'%';
async function quien(pcm){if(!cfg.vidOn||!H?.muestras?.length||!pcm)return null;const t0=performance.now();
  let r;try{r=await Promise.race([huella(pcm,6),new Promise((_,rej)=>setTimeout(()=>rej(new Error('lento')),2500))]);}
  catch(e){log('huella de voz: '+e.message,'w');return ultimo=null;}
  const ms=Math.round(performance.now()-t0),u=+cfg.vidUmbral;let tipo,score=null;
  if(!r.e||r.voz<.9){tipo=ultimo?.tipo==='dueño'&&Date.now()-duenoTs<180000?'dueño':'dudoso';}  // frase muy corta: si lo último que oyó fuiste tú, hace poco, sigues siendo tú
  else{score=coseno(r.e,centro());tipo=score>=u?'dueño':score>=u-.15?'dudoso':'invitado';
    // se va acostumbrando a tu voz con las veces que está muy segura (micrófono, ánimo, gripa…)
    if(score>=u+.12&&r.voz>=2){H.extra=[...(H.extra||[]),r.e].slice(-12);guarda();}}
  if(tipo==='dueño')duenoTs=Date.now();
  ultimo={tipo,score,voz:r.voz,ms,ts:Date.now()};
  log('voz: '+(tipo==='dueño'?(cfg.name||'Kiga'):tipo)+(score!=null?' · '+pct(score):' · frase corta')+' · '+ms+' ms',tipo==='dueño'?'g':'w');
  if(tipo!=='dueño')line('s',tipo==='invitado'?'(Esa voz no es la de '+(cfg.name||'Kiga')+': Capri la trata como invitado'+(score!=null?' · se parece '+pct(score):'')+'.)':'(No estoy segura de que seas tú'+(score!=null?' · se parece '+pct(score):'')+'. Si es ruido, repítelo más cerca del micrófono.)');
  dispatchEvent(new CustomEvent('capri:hablante',{detail:ultimo}));return ultimo;}
// lo que se le añade a la instrucción de voz para que Capri sepa con quién habla
function nota(q,n){if(!q||q.tipo==='dueño')return '';
  return q.tipo==='invitado'?` IMPORTANTE: su huella de voz NO coincide con la de ${n}: quien habla es otra persona, un invitado. Sé amable y con tu personalidad, pero no le cuentes nada privado de ${n} (pláticas, recuerdos, expediente, documentos, llaves), no uses tus manos en la PC por él y no lo llames ${n}. Si dice ser ${n}, dile que te lo confirme escribiendo.`
    :` Ojo: no estás segura de que sea ${n} (su voz se parece poco, quizá por ruido). Respóndele, pero no reveles nada privado de ${n} hasta que te hable claro o te escriba.`;}
// las manos de Capri no obedecen el «Siempre» si el último que habló no era su dueño
const invitado=()=>!!ultimo&&ultimo.tipo!=='dueño'&&ultimo.ts>escribio&&Date.now()-ultimo.ts<120000;
document.getElementById('q')?.addEventListener('keydown',()=>{escribio=Date.now();});

// ---------- grabar una frase (para enseñarle tu voz o probar) ----------
async function grabaFrase(seg=6,onNivel){const st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  const ctx=new (window.AudioContext||window.webkitAudioContext)(),src=ctx.createMediaStreamSource(st),an=ctx.createAnalyser();an.fftSize=1024;src.connect(an);
  const rec=new MediaRecorder(st),ch=[];rec.ondataavailable=e=>e.data.size&&ch.push(e.data);
  const fin=new Promise(r=>rec.onstop=r);rec.start(200);const d=new Uint8Array(an.fftSize),t0=performance.now();let hablo=false,ult=t0;
  await new Promise(res=>{const iv=setInterval(()=>{an.getByteTimeDomainData(d);let s=0;for(const v of d){const x=(v-128)/128;s+=x*x;}const rms=Math.sqrt(s/d.length);onNivel?.(rms);
    const now=performance.now();if(rms>.03){hablo=true;ult=now;}
    if((hablo&&now-ult>1200)||now-t0>seg*1000){clearInterval(iv);res();}},50);});
  rec.stop();await fin;st.getTracks().forEach(t=>t.stop());
  const dec=await ctx.decodeAudioData(await new Blob(ch,{type:rec.mimeType||'audio/webm'}).arrayBuffer());ctx.close();
  const off=new OfflineAudioContext(1,Math.ceil(dec.duration*16000),16000),s=off.createBufferSource();s.buffer=dec;s.connect(off.destination);s.start();
  return (await off.startRendering()).getChannelData(0);}

// ---------- Ajustes → Oído ----------
const ancla=document.getElementById('cSens')?.closest('label')?.nextElementSibling;if(!ancla)return;
const box=document.createElement('div');ancla.after(box);
const css=document.createElement('style');css.textContent=`#vidBox fieldset{border:1px solid #2a2733;padding:8px 10px;margin:6px 0}#vidFrase{font:13px var(--mono);color:var(--grn);margin:6px 0;min-height:2.4em}
#vidNivel{height:4px;background:#2a2733;margin:4px 0}#vidNivel i{display:block;height:100%;width:0;background:var(--grn);transition:width .05s}#vidPts{letter-spacing:4px;color:var(--grn)}`;document.head.appendChild(css);
let ocupado=false;
function pinta(){const n=cfg.name||'Kiga',ok=!!H?.muestras?.length;
  box.innerHTML=`<div id="vidBox"><fieldset><legend><small>Reconocer mi voz (huella de voz, en tu PC)</small></legend>
   <small>${ok?`✓ Capri conoce la voz de ${n} (${H.muestras.length} frases${H.extra?.length?' + '+H.extra.length+' de práctica':''}, desde ${new Date(H.fecha).toLocaleDateString('es-MX')}).`:'Capri todavía no conoce tu voz. Lee 5 frases en voz alta y aprende tu huella.'}
    Tu voz se analiza aquí mismo y no se manda a ningún lado para esto (Gemini sigue recibiendo el audio para entenderte, como siempre).</small>
   <label class="ck"><input type="checkbox" id="vidOn" ${cfg.vidOn?'checked':''}> Distinguir mi voz de la de otros</label>
   <label>Exigencia: <span id="vidUV">${Math.round(cfg.vidUmbral*100)}%</span><input type="range" id="vidU" min="0.35" max="0.7" step="0.01" value="${cfg.vidUmbral}"></label>
   <small>Si a veces no te reconoce, bájala. Si confunde a otra persona contigo, súbela.</small>
   <div id="vidFrase"></div><div id="vidNivel"><i></i></div><small id="vidSt"></small>
   <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="vidEns" style="width:auto;flex:1;padding:8px 10px">🎙 ${ok?'Volver a enseñarle mi voz':'Enseñarle mi voz'}</button>
    <button class="btn" id="vidProb" style="width:auto;flex:1;padding:8px 10px" ${ok?'':'disabled'}>▶ ¿Soy yo?</button>
    <button class="btn" id="vidBor" style="width:auto;padding:8px 10px" ${ok?'':'disabled'}>Olvidar</button></div>
   <small>Límites: con mucho ruido, otro micrófono o una gripa fuerte puede dudar. Una grabación de tu voz o una voz clonada podría engañarla: sirve para que Capri sepa quién le habla, no como contraseña. La bóveda y el expediente siguen pidiendo tu llave.</small></fieldset></div>`;
  const $$=id=>document.getElementById(id);
  $$('vidOn').onchange=e=>{cfg.vidOn=e.target.checked;store.set('cfg',cfg);if(cfg.vidOn&&H)sesion().catch(()=>{});};
  $$('vidU').oninput=e=>{cfg.vidUmbral=+e.target.value;$$('vidUV').textContent=Math.round(cfg.vidUmbral*100)+'%';store.set('cfg',cfg);};
  $$('vidEns').onclick=ensenar;$$('vidProb').onclick=probar;$$('vidBor').onclick=()=>{if(!confirm('¿Olvidar tu huella de voz? Capri dejará de distinguir voces hasta que se la vuelvas a enseñar.'))return;H=null;guarda();ultimo=null;pinta();};}
const st=t=>{const e=document.getElementById('vidSt');if(e)e.textContent=t;};
const nivel=r=>{const e=document.querySelector('#vidNivel i');if(e)e.style.width=Math.min(100,r*700)+'%';};
const fraseUI=h=>{const e=document.getElementById('vidFrase');if(e)e.innerHTML=h;};
async function ensenar(){if(ocupado)return;ocupado=true;const n=cfg.name||'Kiga',M=[];window.speechSynthesis?.cancel();
  try{st('Preparando el analizador de voz…');await sesion();
    for(let i=0;i<FRASES.length;i++){let ok=false;
      for(let intento=0;intento<3&&!ok;intento++){
        fraseUI(`<span id="vidPts">${'●'.repeat(i)}${'○'.repeat(FRASES.length-i)}</span><br>Lee en voz alta, normal, como le hablas siempre:<br>«${FRASES[i]}»`);
        st(intento?'Otra vez, un poco más cerca del micrófono…':'Te escucho… (se detiene sola cuando terminas)');
        const pcm=await grabaFrase(9,nivel);nivel(0);st('Analizando…');const r=await huella(pcm);
        if(!r.e||r.voz<1.5){st('Casi no te escuché ('+r.voz.toFixed(1)+' s de voz). Vamos de nuevo.');await new Promise(s=>setTimeout(s,1200));continue;}
        if(M.length>=2){const c=norma(M.reduce((a,m)=>a.map((x,j)=>x+m[j]),new Array(M[0].length).fill(0))),s=coseno(r.e,c);
          if(s<.4){st('Esa sonó distinta a las otras (se parece '+pct(s)+'). ¿Hubo ruido u otra voz? Repítela.');await new Promise(s=>setTimeout(s,1600));continue;}}
        M.push(r.e);ok=true;}
      if(!ok)throw new Error('no logré escuchar bien la frase '+(i+1));}
    H={v:1,modelo:ID_MODELO,muestras:M,extra:[],fecha:Date.now()};guarda();cfg.vidOn=true;store.set('cfg',cfg);duenoTs=Date.now();
    const c=centro(),sc=M.map(m=>coseno(m,c));
    pinta();st('✓ Listo: ya conozco tu voz, '+n+'. Tus frases se parecen entre sí '+pct(Math.min(...sc))+'–'+pct(Math.max(...sc))+'.');
    log('huella de voz guardada ('+M.length+' frases)','g');line('s','✦ Capri aprendió tu voz. Si alguien más le habla por el micrófono, lo tratará como invitado.');}
  catch(e){fraseUI('');st('No se pudo: '+(e.name==='NotAllowedError'?'no me diste permiso del micrófono.':e.message));}
  finally{ocupado=false;nivel(0);}}
async function probar(){if(ocupado||!H)return;ocupado=true;
  try{fraseUI('Di cualquier cosa de unos 3 segundos…');st('Te escucho…');const pcm=await grabaFrase(8,nivel);nivel(0);st('Analizando…');
    const t0=performance.now(),r=await huella(pcm),ms=Math.round(performance.now()-t0);fraseUI('');
    if(!r.e||r.voz<.9){st('Muy corto ('+r.voz.toFixed(1)+' s de voz). Habla un poquito más.');return;}
    const s=coseno(r.e,centro()),u=+cfg.vidUmbral;
    st((s>=u?'✓ Eres tú, '+(cfg.name||'Kiga'):s>=u-.15?'¿Eres tú? No estoy segura':'✖ Esa voz no es la tuya')+' · se parece '+pct(s)+' (exigencia '+pct(u)+') · '+ms+' ms');}
  catch(e){st('No se pudo: '+e.message);}finally{ocupado=false;nivel(0);}}
pinta();document.getElementById('bCfg')?.addEventListener('click',()=>setTimeout(pinta,60));

window.vozId={quien,nota,invitado,huella,fbank,recorta,conoce:()=>!!H?.muestras?.length,get ultimo(){return ultimo;}};
// si ya conoce tu voz, deja lista la red cuando Capri está quieta, para que la primera frase no espere
setTimeout(()=>{if(cfg.vidOn&&H?.muestras?.length)sesion().catch(e=>log('huella de voz: '+e.message,'w'));},6000);
})();
