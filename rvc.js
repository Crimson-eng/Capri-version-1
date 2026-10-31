// ================= RVC (2.17) =================
// Conversión de voz: la voz de tu PC (Piper) dice la frase y un modelo RVC le cambia el timbre por el de la voz
// con la que se entrenó. Corre en la página con onnxruntime-web (sin Python):
//   1) ContentVec (vec-768-layer-12.onnx, se baja una vez) saca «qué se dijo» del audio a 16 kHz
//   2) el tono (f0) se mide aquí mismo con YIN, a 100 cuadros por segundo
//   3) el sintetizador del modelo RVC v2 exportado a ONNX junta las dos cosas con el timbre nuevo
// Solo modelos legales: tu voz, la de alguien que dio permiso, o con licencia que lo permita. Capri lo pide al cargarlos.
(()=>{
const DIR='vendor/piper/';
const VEC='contentvec-768.onnx';
const VEC_URLS=['https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/vec-768-layer-12.onnx'];
cfg.rvcModelos=cfg.rvcModelos||[];cfg.rvcTono=cfg.rvcTono??0;cfg.rvcOn=!!cfg.rvcOn;
// ---------- guardar (misma carpeta Voces que Piper) ----------
const DK=window.capriDesk?.voz;
const almacen={async lista(){if(DK)return DK.lista().catch(()=>[]);try{const c=await caches.open('capri-voces');return (await c.keys()).map(r=>r.url.split('/').pop());}catch(e){return [];}},
  async leer(n){if(DK)return new Uint8Array(await DK.leer(n));const r=await (await caches.open('capri-voces')).match('/voces/'+n);if(!r)throw new Error('no está');return new Uint8Array(await r.arrayBuffer());},
  async guardar(n,b){if(DK)return DK.guardar(n,b);await (await caches.open('capri-voces')).put('/voces/'+n,new Response(b));},
  async borrar(n){if(DK)return DK.borrar(n);await (await caches.open('capri-voces')).delete('/voces/'+n);}};
let hay=new Set();const refresca=async()=>{hay=new Set(await almacen.lista());return hay;};
const archivo=id=>'rvc_'+id+'.onnx';
// ---------- motor ----------
const script=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('no cargó '+src));document.head.appendChild(s);});
const ortCarga=async()=>{if(!window.ort)await script(DIR+'ort.wasm.min.js');const e=ort.env.wasm;if(!e.wasmPaths)e.wasmPaths=new URL(DIR,location.href).href;
  if(!e.numThreads)e.numThreads=self.crossOriginIsolated?Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1)):1;return ort;};
let vecS=null,vecP=null,mod=null,modP=null;
const sesion=async b=>(await ortCarga()).InferenceSession.create(b,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
const cargaVec=()=>vecS?Promise.resolve(vecS):vecP||(vecP=almacen.leer(VEC).then(sesion).then(s=>vecS=s).finally(()=>vecP=null));
async function cargaMod(){const id=cfg.rvcVoz;if(mod?.id===id)return mod;if(modP?.id===id)return modP.p;
  const p=almacen.leer(archivo(id)).then(sesion).then(s=>mod={id,s});modP={id,p};try{return await p;}finally{modP=null;}}
async function remuestrea(ch,de,a){if(de===a)return ch;const n=Math.ceil(ch.length*a/de),off=new OfflineAudioContext(1,n,a),b=off.createBuffer(1,ch.length,de);b.getChannelData(0).set(ch);
  const s=off.createBufferSource();s.buffer=b;s.connect(off.destination);s.start();return (await off.startRendering()).getChannelData(0);}
// tono con YIN (de Cheveigné y Kawahara): 0 = sin voz. x a 16 kHz, un valor cada 160 muestras (100 por segundo)
function yin(x0,n,sr=16000,hop=160,W=768,fmin=50,fmax=1100,th=.15){const tmin=Math.floor(sr/fmax),tmax=Math.min(Math.floor(sr/fmin),W>>1),L=W-tmax,out=new Float32Array(n),d=new Float32Array(tmax+2);
  const P=W,x=new Float32Array(x0.length+2*P+n*hop);x.set(x0,P); // con orillas en cero, sin revisar límites en el ciclo
  for(let f=0;f<n;f++){const c=P+f*hop-(W>>1);let e=0;for(let j=0;j<W;j++){const v=x[c+j];e+=v*v;}if(e<W*1e-5){out[f]=0;continue;}
    // diferencia normalizada acumulada (d[t] queda ya normalizada)
    let run=0;d[0]=1;for(let t=1;t<=tmax+1;t++){let s2=0;for(let j=c,k=c+t,e2=c+L;j<e2;j++,k++){const v=x[j]-x[k];s2+=v*v;}run+=s2;d[t]=run?s2*t/run:1;}
    let tau=-1;for(let t=tmin;t<=tmax;t++)if(d[t]<th){while(t<tmax&&d[t+1]<d[t])t++;tau=t;break;}
    if(tau<1){out[f]=0;continue;}
    const a=d[tau-1],b=d[tau],c2=d[tau+1],den=a+c2-2*b,sh=den>0?(a-c2)/(2*den):0;out[f]=sr/(tau+Math.max(-1,Math.min(1,sh)));}
  // quita saltos sueltos de un cuadro
  for(let f=1;f<n-1;f++)if(out[f]&&!out[f-1]&&!out[f+1])out[f]=0;return out;}
const randn=n=>{const r=new Float32Array(n);for(let i=0;i<n;i+=2){const u=Math.random()||1e-9,v=Math.random(),m=Math.sqrt(-2*Math.log(u));r[i]=m*Math.cos(2*Math.PI*v);if(i+1<n)r[i+1]=m*Math.sin(2*Math.PI*v);}return r;};
// un trozo (máx. ~12 s) de audio a 16 kHz → audio con la voz del modelo
async function trozo(o,x16,semis){const vs=await cargaVec(),m=await cargaMod();
  const vin={[vs.inputNames[0]]:new o.Tensor('float32',x16,[1,1,x16.length])},vout=(await vs.run(vin))[vs.outputNames[0]];
  // ContentVec exportado suele dar [1, T, 768]; algunos dan [1, 768, T]
  const tc=vout.dims[2]===768||vout.dims[2]===256,T=tc?vout.dims[1]:vout.dims[2],C=tc?vout.dims[2]:vout.dims[1],F=T*2,ph=new Float32Array(F*C),src=vout.data;
  for(let t=0;t<T;t++)for(let c=0;c<C;c++){const v=tc?src[t*C+c]:src[c*T+t];ph[(2*t)*C+c]=v;ph[(2*t+1)*C+c]=v;} // ContentVec va a 50/s y RVC a 100/s
  const f0=yin(x16,F),k=Math.pow(2,semis/12),pf=new Float32Array(F),pc=new BigInt64Array(F),mmin=1127*Math.log(1+50/700),mmax=1127*Math.log(1+1100/700);
  for(let i=0;i<F;i++){const f=f0[i]*k;pf[i]=f;let me=1127*Math.log(1+f/700);me=me>0?(me-mmin)*254/(mmax-mmin)+1:1;pc[i]=BigInt(Math.round(Math.min(255,Math.max(1,me))));}
  const n=m.s.inputNames,feeds={[n[0]]:new o.Tensor('float32',ph,[1,F,C]),[n[1]]:new o.Tensor('int64',BigInt64Array.from([BigInt(F)]),[1]),
    [n[2]]:new o.Tensor('int64',pc,[1,F]),[n[3]]:new o.Tensor('float32',pf,[1,F]),[n[4]]:new o.Tensor('int64',BigInt64Array.from([0n]),[1]),[n[5]]:new o.Tensor('float32',randn(192*F),[1,192,F])};
  const a=(await m.s.run(feeds))[m.s.outputNames[0]].data;return {a,sr:Math.round(a.length/F*100)};}
// AudioBuffer (la voz de tu PC) → AudioBuffer con la voz del modelo RVC
async function convierte(buf,ctx){const o=await ortCarga(),x=await remuestrea(buf.getChannelData(0),buf.sampleRate,16000),N=16000*12,partes=[];let sr=40000;
  for(let i=0;i<x.length;i+=N){const p=x.slice(i,Math.min(x.length,i+N));if(p.length<1600){partes.push(new Float32Array(Math.round(p.length/16000*sr)));continue;}
    const r=await trozo(o,p,+cfg.rvcTono||0);sr=r.sr;partes.push(r.a.slice(0,Math.round(p.length/16000*sr)));}
  const n=partes.reduce((s,p)=>s+p.length,0),out=ctx.createBuffer(1,n,sr),ch=out.getChannelData(0);let off=0,mx=0;for(const p of partes){ch.set(p,off);off+=p.length;}
  for(const v of ch)mx=Math.max(mx,Math.abs(v));if(mx>0){const g=Math.min(4,.92/mx);for(let i=0;i<n;i++)ch[i]*=g;}return out;}
const listo=()=>hay.has(VEC)&&!!cfg.rvcVoz&&hay.has(archivo(cfg.rvcVoz));
window.vozRVC={activo:()=>cfg.rvcOn&&listo(),convierte,refresca};
// ---------- bajar ContentVec ----------
async function bajar(url,av){const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);const tot=+r.headers.get('content-length')||0,rd=r.body.getReader(),ps=[];let n=0;
  for(;;){const {done,value}=await rd.read();if(done)break;ps.push(value);n+=value.length;av?.(n,tot);}const out=new Uint8Array(n);let o=0;for(const p of ps){out.set(p,o);o+=p.length;}return out;}
// ---------- interfaz (RELIC → Voz → RVC) ----------
// RELIC → Voz lo muda a su pestaña «RVC»; mientras, espera escondido
const casa=document.createElement('div');casa.hidden=true;document.body.appendChild(casa);
const box=document.createElement('div');box.id='rvcBox';box.className='rvz';casa.appendChild(box);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const st=t=>{const e=document.getElementById('rvSt');if(e)e.textContent=t;};
function pinta(){const M=cfg.rvcModelos;
  box.innerHTML=`<h3>RVC <small style="font-weight:400">· cambia el timbre de la voz de tu PC</small></h3>
  <small>La voz de tu PC dice la frase y el modelo RVC la convierte a la voz con la que se entrenó. Solo modelos <b>legales</b>: tu voz, la de alguien que te dio permiso, o con licencia que lo permita.</small>
  <fieldset style="border:1px solid #2a2733;padding:8px 10px"><legend><small>1 · Extractor ContentVec (una vez, ~360 MB)</small></legend>
   ${hay.has(VEC)?'<small class="ok">✓ Listo</small>':`<div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="rvVecGet" style="width:auto;flex:1;padding:8px 10px">⬇ Bajar ContentVec</button>
    <label class="btn" style="width:auto;flex:0 0 auto;padding:8px 10px;margin:0;cursor:pointer">📁 Desde archivo<input type="file" id="rvVecF" accept=".onnx" hidden></label></div>
    <small>Es vec-768-layer-12.onnx (para modelos RVC v2).</small>`}</fieldset>
  <fieldset style="border:1px solid #2a2733;padding:8px 10px"><legend><small>2 · Modelos RVC (.onnx)</small></legend>
   ${M.length?`<label>Modelo<select id="rvVoz">${M.map(m=>`<option value="${esc(m.id)}" ${m.id===cfg.rvcVoz?'selected':''}>${esc(m.nombre)}${hay.has(archivo(m.id))?'':' (falta el archivo)'}</option>`).join('')}</select></label>
    <small id="rvOrigen"></small>`:'<small>Aún no cargas ninguno.</small>'}
   <details style="margin-top:6px"><summary><small>+ Cargar un modelo</small></summary><div class="rvz" style="margin-top:6px">
    <label>Nombre<input id="rvNom" placeholder="ej. Mi voz v1"></label>
    <label>¿De dónde viene? (dueño de la voz y licencia)<input id="rvOri" placeholder="ej. mi propia voz · o · voz de Ana, con su permiso · o · licencia CC BY"></label>
    <label class="ck"><input type="checkbox" id="rvOk"> Confirmo que es mi voz, que su dueña/dueño me dio permiso, o que su licencia permite usarlo. No es la voz de una actriz, personaje o persona sin su permiso.</label>
    <label class="btn" style="width:auto;padding:8px 10px;margin:0;cursor:pointer">📁 Elegir el .onnx del modelo<input type="file" id="rvModF" accept=".onnx" hidden></label>
    <small>RVC v2 exportado a ONNX. Si tienes un .pth, conviértelo con «RVC WebUI → exportar Onnx» o con entrenar/rvc_a_onnx.sh.</small></div></details></fieldset>
  <label>Ajuste de tono (semitonos) <small id="rvTonoV">${cfg.rvcTono>0?'+':''}${cfg.rvcTono}</small><input type="range" id="rvTono" min="-12" max="12" step="1" value="${cfg.rvcTono}"></label>
  <small>Si la voz de tu PC es femenina y el modelo también, déjalo en 0. De voz de hombre a voz de mujer, prueba +10 a +12.</small>
  <label class="ck"><input type="checkbox" id="rvOn" ${cfg.rvcOn?'checked':''} ${listo()?'':'disabled'}> Usar RVC cuando habla la voz de tu PC</label>
  <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="rvTry" style="width:auto;flex:1;padding:8px 10px" ${listo()&&window.vozLocal?.lista()?'':'disabled'}>▶ Probar (tu PC → RVC)</button>
   ${M.length?'<button class="btn" id="rvDel" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Quitar este modelo">✕</button>':''}</div>
  <small>Cada frase tarda un poco más (el procesador hace dos pasos). Si la voz de tu PC no está bajada, bájala primero en «Motor».</small>
  <small id="rvSt"></small>`;
  const g=id=>document.getElementById(id),m=M.find(x=>x.id===cfg.rvcVoz);if(g('rvOrigen')&&m)g('rvOrigen').textContent='Origen: '+m.origen+' · cargado '+new Date(m.fecha).toLocaleDateString();
  if(g('rvVoz'))g('rvVoz').onchange=()=>{cfg.rvcVoz=g('rvVoz').value;mod=null;store.set('cfg',cfg);pinta();};
  if(g('rvVecGet'))g('rvVecGet').onclick=async()=>{g('rvVecGet').disabled=true;let err;for(const u of VEC_URLS){try{const b=await bajar(u,(n,t)=>st(`Bajando ContentVec: ${(n/1048576).toFixed(0)}${t?' de '+(t/1048576).toFixed(0):''} MB…`));
      await almacen.guardar(VEC,b);await refresca();st('✓ ContentVec listo.');pinta();return;}catch(e){err=e;}}
    st('No pude bajarlo ('+String(err?.message).slice(0,60)+'). Bájalo a mano (vec-768-layer-12.onnx) y cárgalo con 📁.');g('rvVecGet').disabled=false;};
  if(g('rvVecF'))g('rvVecF').onchange=async e=>{const f=e.target.files[0];if(!f)return;st('Guardando…');try{await almacen.guardar(VEC,new Uint8Array(await f.arrayBuffer()));vecS=null;await refresca();st('✓ ContentVec listo.');}catch(err){st('✗ '+err.message);}pinta();};
  g('rvModF').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
    if(!g('rvOk').checked||!g('rvOri').value.trim()){st('Primero di de dónde viene la voz y marca la casilla de permiso.');return;}
    try{st('Revisando el modelo…');const b=new Uint8Array(await f.arrayBuffer()),s=await sesion(b.slice());
      if(s.inputNames.length!==6)throw new Error('no parece un RVC exportado a ONNX (esperaba 6 entradas: phone, phone_lengths, pitch, pitchf, ds, rnd)');
      const id=(g('rvNom').value.trim()||f.name.replace(/\.onnx$/i,'')).normalize('NFD').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,40)+'_'+Date.now().toString(36);
      await almacen.guardar(archivo(id),b);cfg.rvcModelos.push({id,nombre:g('rvNom').value.trim()||f.name,origen:g('rvOri').value.trim(),fecha:Date.now()});cfg.rvcVoz=id;mod=null;store.set('cfg',cfg);await refresca();st('✓ Modelo cargado.');pinta();}
    catch(err){st('✗ '+(err?.message?String(err.message).slice(0,200):'no se pudo abrir ese .onnx (¿está completo y es un RVC exportado?)'));}};
  g('rvTono').oninput=()=>{cfg.rvcTono=+g('rvTono').value;g('rvTonoV').textContent=(cfg.rvcTono>0?'+':'')+cfg.rvcTono;store.set('cfg',cfg);};
  g('rvOn').onchange=()=>{cfg.rvcOn=g('rvOn').checked;store.set('cfg',cfg);};
  if(g('rvDel'))g('rvDel').onclick=async()=>{if(!confirm('¿Quitar este modelo RVC?'))return;await almacen.borrar(archivo(cfg.rvcVoz));cfg.rvcModelos=cfg.rvcModelos.filter(x=>x.id!==cfg.rvcVoz);cfg.rvcVoz=cfg.rvcModelos[0]?.id||'';mod=null;store.set('cfg',cfg);await refresca();pinta();};
  if(g('rvTry'))g('rvTry').onclick=async()=>{const t0=performance.now();st('Generando con tu PC y convirtiendo…');
    try{const ctx=window.vozCtx(),{buf}=await window.vozLocal.sintetiza(document.getElementById('cTtsText')?.value||'¡Ehhh, choom! ¿Damos un paseo?',ctx,{sinRVC:true});
      const t1=performance.now(),out=await convierte(buf,ctx);st(`▶ tu PC ${((t1-t0)/1000).toFixed(1)} s + RVC ${((performance.now()-t1)/1000).toFixed(1)} s`);window.speechSynthesis?.cancel();window.vozDemo(out,1);}
    catch(e){st('No se pudo: '+String(e.message).slice(0,200));}};}
refresca().then(pinta);
})();
