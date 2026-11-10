// ================= RVC (2.17 · 2.19) =================
// 2.19: dos motores. «En la página» (ONNX, sin instalar nada) o «Servidor con Applio» (tu .pth + .index tal cual salen del
// entrenamiento, con RMVPE, índice y GPU: la mejor calidad). Además la conversión sirve para cantar (canto.js).
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
cfg.rvcMotor=cfg.rvcMotor||'pagina';cfg.rvcUrl=cfg.rvcUrl||'http://127.0.0.1:5050';
cfg.rvcSrv=Object.assign({modelo:'',metodo:'rmvpe',indice:.5,protect:.33},cfg.rvcSrv||{});cfg.rvcPermisos=cfg.rvcPermisos||{};
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
async function trozo(o,x16,semis,f0fn){const vs=await cargaVec(),m=await cargaMod();
  const vin={[vs.inputNames[0]]:new o.Tensor('float32',x16,[1,1,x16.length])},vout=(await vs.run(vin))[vs.outputNames[0]];
  // ContentVec exportado suele dar [1, T, 768]; algunos dan [1, 768, T]
  const tc=vout.dims[2]===768||vout.dims[2]===256,T=tc?vout.dims[1]:vout.dims[2],C=tc?vout.dims[2]:vout.dims[1],F=T*2,ph=new Float32Array(F*C),src=vout.data;
  for(let t=0;t<T;t++)for(let c=0;c<C;c++){const v=tc?src[t*C+c]:src[c*T+t];ph[(2*t)*C+c]=v;ph[(2*t+1)*C+c]=v;} // ContentVec va a 50/s y RVC a 100/s
  const f0=f0fn?f0fn(yin(x16,F)):yin(x16,F),k=Math.pow(2,semis/12),pf=new Float32Array(F),pc=new BigInt64Array(F),mmin=1127*Math.log(1+50/700),mmax=1127*Math.log(1+1100/700);
  for(let i=0;i<F;i++){const f=f0[i]*k;pf[i]=f;let me=1127*Math.log(1+f/700);me=me>0?(me-mmin)*254/(mmax-mmin)+1:1;pc[i]=BigInt(Math.round(Math.min(255,Math.max(1,me))));}
  const n=m.s.inputNames,feeds={[n[0]]:new o.Tensor('float32',ph,[1,F,C]),[n[1]]:new o.Tensor('int64',BigInt64Array.from([BigInt(F)]),[1]),
    [n[2]]:new o.Tensor('int64',pc,[1,F]),[n[3]]:new o.Tensor('float32',pf,[1,F]),[n[4]]:new o.Tensor('int64',BigInt64Array.from([0n]),[1]),[n[5]]:new o.Tensor('float32',randn(192*F),[1,192,F])};
  const a=(await m.s.run(feeds))[m.s.outputNames[0]].data;return {a,sr:Math.round(a.length/F*100)};}
// AudioBuffer → AudioBuffer con la voz del modelo RVC (en la página). Trozos de 12 s que se enciman 0.3 s y se funden,
// para que en canciones largas no se oiga el corte. op.f0 cambia la melodía (cantar una letra), op.tono los semitonos.
async function conviertePagina(buf,ctx,op={}){const o=await ortCarga(),x=await remuestrea(buf.getChannelData(0),buf.sampleRate,16000),N=16000*12,S=16000*.3|0,partes=[];let sr=40000;
  const semis=op.tono??(+cfg.rvcTono||0);
  for(let i=0,k=0;i<x.length;i+=N-S,k++){const ini=i,p=x.slice(ini,Math.min(x.length,ini+N));
    if(p.length<1600&&partes.length)break; // ya lo cubrió el trozo anterior (se enciman 0.3 s)
    if(p.length<1600){partes.push({ini,a:new Float32Array(Math.round(p.length/16000*sr))});break;}
    const f0fn=op.f0?f=>op.f0(f,ini/160):null;
    const r=await trozo(o,p,semis,f0fn);sr=r.sr;partes.push({ini,a:r.a.slice(0,Math.round(p.length/16000*sr))});op.avance?.(Math.min(1,(ini+p.length)/x.length));
    if(ini+p.length>=x.length)break;}
  const n=Math.round(x.length/16000*sr),out=ctx.createBuffer(1,n,sr),ch=out.getChannelData(0),ov=Math.round(S/16000*sr);
  for(const {ini,a} of partes){const off=Math.round(ini/16000*sr);for(let j=0;j<a.length&&off+j<n;j++){
      // fundido: la orilla del trozo anterior baja mientras la del nuevo sube
      const w=off>0&&j<ov?j/ov:1;ch[off+j]=ch[off+j]*(1-w)+a[j]*w;}}
  let mx=0;for(const v of ch)mx=Math.max(mx,Math.abs(v));if(mx>0){const g=Math.min(4,.92/mx);for(let i=0;i<n;i++)ch[i]*=g;}return out;}
// ---------- servidor con Applio ----------
// WAV de 16 bits (1 o 2 canales) para mandarlo al servidor o para descargar una canción
function wav(chs,sr){const n=chs[0].length,c=chs.length,b=new ArrayBuffer(44+n*c*2),v=new DataView(b),w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};
  w(0,'RIFF');v.setUint32(4,36+n*c*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,c,true);v.setUint32(24,sr,true);
  v.setUint32(28,sr*c*2,true);v.setUint16(32,c*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*c*2,true);
  let o=44;for(let i=0;i<n;i++)for(let k=0;k<c;k++){const x=Math.max(-1,Math.min(1,chs[k][i]));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2;}return new Blob([b],{type:'audio/wav'});}
const bufWav=buf=>wav([...Array(buf.numberOfChannels)].map((_,k)=>buf.getChannelData(k)),buf.sampleRate);
const srvUrl=r=>String(cfg.rvcUrl||'http://127.0.0.1:5050').replace(/\/+$/,'')+r;
let srv={ok:false,modelos:[],separar:false,visto:0};
async function srvEstado(ms=2500){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);const r=await fetch(srvUrl('/estado'),{signal:c.signal});clearTimeout(t);
    srv={...(await r.json()),visto:Date.now()};}catch(e){srv={ok:false,modelos:[],separar:false,visto:Date.now(),error:e.name==='AbortError'?'no contesta':String(e.message||e)};}return srv;}
const permitido=n=>!!cfg.rvcPermisos[n];
async function convierteSrv(buf,ctx,op={}){const S=cfg.rvcSrv,m=op.modelo||S.modelo;if(!m)throw new Error('elige un modelo del servidor');if(!permitido(m))throw new Error('falta confirmar de dónde viene la voz de «'+m+'»');
  const q=new URLSearchParams({modelo:m,tono:String(op.tono??(+cfg.rvcTono||0)),metodo:op.metodo||S.metodo,indice:String(op.indice??S.indice),protect:String(op.protect??S.protect),
    autotune:op.autotune?'1':'0',fuerza:String(op.fuerza??1)});
  const r=await fetch(srvUrl('/convertir?'+q),{method:'POST',headers:{'Content-Type':'audio/wav'},body:bufWav(buf)});
  if(!r.ok){let e='HTTP '+r.status;try{e=(await r.json()).error||e;}catch(_){}throw new Error('servidor RVC: '+e);}
  return await ctx.decodeAudioData(await r.arrayBuffer());}
// separar voz y música de una canción (solo con el servidor y audio-separator instalado)
async function separa(file){const r=await fetch(srvUrl('/separar'),{method:'POST',headers:{'X-Nombre':(file.name||'cancion.wav').replace(/[^\w.-]/g,'_')},body:file});
  const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j.error||'HTTP '+r.status);
  const baja=async k=>(await fetch(srvUrl(`/separado/${j.id}/${k}.wav`))).arrayBuffer();return {voz:await baja('voz'),musica:await baja('musica')};}
const motor=()=>cfg.rvcMotor==='servidor'?'servidor':'pagina';
const listoSrv=()=>!!cfg.rvcSrv.modelo&&permitido(cfg.rvcSrv.modelo);
// para la voz de Capri: el motor elegido; si el servidor falla y la página está lista, se usa la página
async function convierte(buf,ctx,op={}){const mo=op.motor||motor();
  if(mo==='servidor'){try{return await convierteSrv(buf,ctx,op);}catch(e){if(!op.motor&&listo()&&!op.soloSrv){console.warn('[rvc] servidor falló, uso la página',e);return conviertePagina(buf,ctx,op);}throw e;}}
  return conviertePagina(buf,ctx,op);}
const listo=()=>hay.has(VEC)&&!!cfg.rvcVoz&&hay.has(archivo(cfg.rvcVoz));
let ultFallo=0;
window.vozRVC={activo:()=>cfg.rvcOn&&(motor()==='servidor'?listoSrv():listo()),convierte,refresca,wav,bufWav,srvEstado,separa,motor,
  listoPagina:listo,listoSrv,srv:()=>srv,modelosPagina:()=>cfg.rvcModelos,
  fallo:e=>{if(Date.now()-ultFallo>60000){ultFallo=Date.now();try{line('t','  ⚠ RVC no respondió ('+String(e?.message||e).slice(0,90)+'). Hablo con la voz de tu PC sin convertir.');}catch(_){}}}};
// ---------- bajar ContentVec ----------
async function bajar(url,av){const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);const tot=+r.headers.get('content-length')||0,rd=r.body.getReader(),ps=[];let n=0;
  for(;;){const {done,value}=await rd.read();if(done)break;ps.push(value);n+=value.length;av?.(n,tot);}const out=new Uint8Array(n);let o=0;for(const p of ps){out.set(p,o);o+=p.length;}return out;}
// ---------- interfaz (RELIC → Voz → RVC) ----------
// RELIC → Voz lo muda a su pestaña «RVC»; mientras, espera escondido
const casa=document.createElement('div');casa.hidden=true;document.body.appendChild(casa);
const box=document.createElement('div');box.id='rvcBox';box.className='rvz';casa.appendChild(box);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const st=t=>{const e=document.getElementById('rvSt');if(e)e.textContent=t;};
function pinta(){const M=cfg.rvcModelos,SV=motor()==='servidor',D=window.capriDesk?.rvc,SM=srv.modelos||[],sel=cfg.rvcSrv.modelo,selOk=permitido(sel);
  if(SV&&Date.now()-srv.visto>5000)srvEstado().then(pinta);
  box.innerHTML=`<h3>RVC <small style="font-weight:400">· cambia el timbre de la voz de tu PC</small></h3>
  <small>La voz de tu PC dice la frase y el modelo RVC la convierte a la voz con la que se entrenó. Solo modelos <b>legales</b>: tu voz, la de alguien que te dio permiso, o con licencia que lo permita.</small>
  <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">
   <button class="btn" data-mo="pagina" style="width:auto;flex:1;padding:8px 10px;${SV?'opacity:.55':'border-color:var(--yel)'}">En la página <small>(.onnx · sin instalar)</small></button>
   <button class="btn" data-mo="servidor" style="width:auto;flex:1;padding:8px 10px;${SV?'border-color:var(--yel)':'opacity:.55'}">Servidor con Applio <small>(.pth + .index · mejor)</small></button></div>
  ${SV?`<fieldset style="border:1px solid #2a2733;padding:8px 10px"><legend><small>Servidor RVC en tu PC (usa tu Applio)</small></legend>
   <small id="rvSrvSt">${srv.ok?`<span class="ok">✓ Conectado</span> · ${esc(srv.gpu||'')} · ${SM.length} modelo${SM.length===1?'':'s'}${srv.separar?' · separa voz/música':''}${srv.error?' · ⚠ '+esc(srv.error):''}`:`✗ No contesta en ${esc(cfg.rvcUrl)}${srv.error?' ('+esc(srv.error)+')':''}`}</small>
   ${D?`<div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">
     <button class="btn" id="rvSrvIni" style="width:auto;flex:1;padding:8px 10px">${srv.ok?'↻ Revisar':'▶ Iniciar servidor'}</button>
     <button class="btn" id="rvSrvDir" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Aquí pones tu .pth y tu .index">📂 Mis modelos</button>
     <button class="btn" id="rvSrvLog" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Lo que dijo el servidor">📄</button>
     ${srv.ok?'<button class="btn" id="rvSrvStop" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Apagar el servidor">⏹</button>':''}</div>
    <small>Busca Applio en tu carpeta de usuario, Escritorio, Descargas o C:\\Applio. ¿Está en otro lado? <a href="#" id="rvSrvElige">Elegir la carpeta de Applio</a>.</small>`
   :`<small>Arráncalo en tu PC con <b>iniciar_rvc_windows.bat</b> (o iniciar_rvc.sh) y pulsa <a href="#" id="rvSrvRev">revisar</a>. Pasos en capri-rvc.md.</small>`}
   <label>Dirección<input id="rvUrl" value="${esc(cfg.rvcUrl)}"></label>
   ${SM.length?`<label>Tu modelo<select id="rvSrvMod"><option value="">— elige —</option>${SM.map(m=>`<option value="${esc(m.nombre)}" ${m.nombre===sel?'selected':''}>${esc(m.nombre)} · ${m.mb} MB${m.index?' · con índice':' · sin índice'}${permitido(m.nombre)?'':' · sin confirmar'}</option>`).join('')}</select></label>`
     :srv.ok?'<small>No hay modelos todavía. Pon tu <b>.pth</b> (y su <b>.index</b>) en «📂 Mis modelos» o entrénalo en Applio (sale en Applio/logs) y pulsa revisar.</small>':''}
   ${sel&&!selOk?`<div class="rvz" style="border:1px dashed #c96a73;padding:8px">
     <label>¿De quién es esta voz y con qué permiso?<input id="rvSrvOri" placeholder="ej. mi propia voz · voz de Ana, con su permiso · licencia CC BY"></label>
     <label class="ck"><input type="checkbox" id="rvSrvOk"> Confirmo que es mi voz, que su dueña/dueño me dio permiso, o que su licencia lo permite. No es la voz de una actriz, personaje o persona sin su permiso.</label>
     <button class="btn" id="rvSrvConf" style="width:auto;padding:8px 10px">Confirmar</button></div>`:sel?`<small>Origen: ${esc(cfg.rvcPermisos[sel].origen)}</small>`:''}
   <label>Cómo mide el tono<select id="rvMet">${[['rmvpe','RMVPE (recomendado, sirve para cantar)'],['fcpe','FCPE (más rápido)'],['crepe','CREPE (fino, lento)'],['harvest','Harvest (viejo, voz grave)']].map(([v,n])=>`<option value="${v}" ${cfg.rvcSrv.metodo===v?'selected':''}>${n}</option>`).join('')}</select></label>
   <label>Índice (parecido al timbre exacto) <small id="rvIdxV">${cfg.rvcSrv.indice}</small><input type="range" id="rvIdx" min="0" max="1" step=".05" value="${cfg.rvcSrv.indice}"></label>
   <label>Proteger consonantes y respiración <small id="rvProV">${cfg.rvcSrv.protect}</small><input type="range" id="rvPro" min="0" max=".5" step=".01" value="${cfg.rvcSrv.protect}"></label>
  </fieldset>`:`  <fieldset style="border:1px solid #2a2733;padding:8px 10px"><legend><small>1 · Extractor ContentVec (una vez, ~360 MB)</small></legend>
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
`}
  <label>Ajuste de tono (semitonos) <small id="rvTonoV">${cfg.rvcTono>0?'+':''}${cfg.rvcTono}</small><input type="range" id="rvTono" min="-12" max="12" step="1" value="${cfg.rvcTono}"></label>
  <small>Si la voz de tu PC es femenina y el modelo también, déjalo en 0. De voz de hombre a voz de mujer, prueba +10 a +12.</small>
  <label class="ck"><input type="checkbox" id="rvOn" ${cfg.rvcOn?'checked':''} ${(SV?listoSrv():listo())?'':'disabled'}> Usar RVC cuando habla la voz de tu PC</label>
  <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn" id="rvTry" style="width:auto;flex:1;padding:8px 10px" ${(SV?listoSrv()&&srv.ok:listo())&&window.vozLocal?.lista()?'':'disabled'}>▶ Probar (tu PC → RVC)</button>
   ${M.length&&!SV?'<button class="btn" id="rvDel" style="width:auto;flex:0 0 auto;padding:8px 10px" title="Quitar este modelo">✕</button>':''}</div>
  <small>Cada frase tarda un poco más (el procesador hace dos pasos). Si la voz de tu PC no está bajada, bájala primero en «Motor».</small>
  <small id="rvSt"></small>`;
  const g=id=>document.getElementById(id),m=M.find(x=>x.id===cfg.rvcVoz);if(g('rvOrigen')&&m)g('rvOrigen').textContent='Origen: '+m.origen+' · cargado '+new Date(m.fecha).toLocaleDateString();
  if(g('rvVoz'))g('rvVoz').onchange=()=>{cfg.rvcVoz=g('rvVoz').value;mod=null;store.set('cfg',cfg);pinta();};
  if(g('rvVecGet'))g('rvVecGet').onclick=async()=>{g('rvVecGet').disabled=true;let err;for(const u of VEC_URLS){try{const b=await bajar(u,(n,t)=>st(`Bajando ContentVec: ${(n/1048576).toFixed(0)}${t?' de '+(t/1048576).toFixed(0):''} MB…`));
      await almacen.guardar(VEC,b);await refresca();st('✓ ContentVec listo.');pinta();return;}catch(e){err=e;}}
    st('No pude bajarlo ('+String(err?.message).slice(0,60)+'). Bájalo a mano (vec-768-layer-12.onnx) y cárgalo con 📁.');g('rvVecGet').disabled=false;};
  if(g('rvVecF'))g('rvVecF').onchange=async e=>{const f=e.target.files[0];if(!f)return;st('Guardando…');try{await almacen.guardar(VEC,new Uint8Array(await f.arrayBuffer()));vecS=null;await refresca();st('✓ ContentVec listo.');}catch(err){st('✗ '+err.message);}pinta();};
  if(g('rvModF'))g('rvModF').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
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
      const t1=performance.now(),out=await convierte(buf,ctx,{motor:motor()});st(`▶ tu PC ${((t1-t0)/1000).toFixed(1)} s + RVC ${((performance.now()-t1)/1000).toFixed(1)} s`);window.speechSynthesis?.cancel();window.vozDemo(out,1);}
    catch(e){st('No se pudo: '+String(e.message).slice(0,200));}};
  box.querySelectorAll('[data-mo]').forEach(b=>b.onclick=()=>{cfg.rvcMotor=b.dataset.mo;store.set('cfg',cfg);srv.visto=0;pinta();});
  if(SV){const rev=async()=>{st('Revisando el servidor…');await srvEstado();st('');pinta();};
    g('rvUrl').onchange=()=>{cfg.rvcUrl=g('rvUrl').value.trim()||'http://127.0.0.1:5050';store.set('cfg',cfg);rev();};
    if(g('rvSrvRev'))g('rvSrvRev').onclick=e=>{e.preventDefault();rev();};
    const ini=async elegir=>{if(srv.ok&&!elegir)return rev();st('Arrancando el servidor con tu Applio… (la primera vez tarda ~30 s en cargar)');
      const r=await D.iniciar(elegir);if(!r.ok){st(r.why==='no-applio'?'Esa carpeta no parece Applio (falta core.py o env\\python.exe). Instálalo primero: ver capri-rvc.md.':r.why==='cancelado'?'':'No arrancó: '+(r.msg||r.why));return;}
      for(let k=0;k<45;k++){await new Promise(z=>setTimeout(z,2000));await srvEstado(1500);if(srv.ok){st('✓ Servidor listo'+(r.dir?' · Applio en '+r.dir:''));pinta();return;}
        if(k%5===4){const l=await D.log();if(/Traceback|Error/i.test(l)&&!/✓ Applio cargado/.test(l)){st('El servidor tuvo un error. Último registro:\n'+l.slice(-500));return;}}}
      st('Sigue sin contestar. Mira el registro (📄).');};
    if(g('rvSrvIni'))g('rvSrvIni').onclick=()=>ini(false);
    if(g('rvSrvElige'))g('rvSrvElige').onclick=e=>{e.preventDefault();ini(true);};
    if(g('rvSrvDir'))g('rvSrvDir').onclick=async()=>{const d=await D.carpeta();st('Pon aquí tu .pth y su .index (pueden ir en una subcarpeta con el nombre de la voz): '+d);};
    if(g('rvSrvLog'))g('rvSrvLog').onclick=async()=>st((await D.log())||'(sin registro todavía)');
    if(g('rvSrvStop'))g('rvSrvStop').onclick=async()=>{await D.detener();cfg.rvcOn=cfg.rvcOn&&!!listo();setTimeout(rev,800);};
    if(g('rvSrvMod'))g('rvSrvMod').onchange=()=>{cfg.rvcSrv.modelo=g('rvSrvMod').value;store.set('cfg',cfg);pinta();};
    if(g('rvSrvConf'))g('rvSrvConf').onclick=()=>{const o=g('rvSrvOri').value.trim();if(!o||!g('rvSrvOk').checked){st('Escribe de dónde viene la voz y marca la casilla.');return;}
      cfg.rvcPermisos[sel]={origen:o,fecha:Date.now()};store.set('cfg',cfg);st('✓ Confirmado.');pinta();};
    g('rvMet').onchange=()=>{cfg.rvcSrv.metodo=g('rvMet').value;store.set('cfg',cfg);};
    g('rvIdx').oninput=()=>{cfg.rvcSrv.indice=+g('rvIdx').value;g('rvIdxV').textContent=cfg.rvcSrv.indice;store.set('cfg',cfg);};
    g('rvPro').oninput=()=>{cfg.rvcSrv.protect=+g('rvPro').value;g('rvProV').textContent=cfg.rvcSrv.protect;store.set('cfg',cfg);};}
  window.dispatchEvent(new Event('capri:rvc'));}
refresca().then(pinta);
})();
