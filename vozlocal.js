// ================= VOZ LOCAL (2.11) =================
// Capri habla con una voz neuronal que corre en tu PC (Piper): sin internet, sin Gemini, sin gastar cupo, y en el
// procesador, así que deja libre a tu GPU para el cerebro. La voz (un archivo .onnx de ~60-110 MB) se baja una sola vez
// y se queda guardada (app de escritorio: carpeta Voces junto a tus datos; navegador: su caché). La pronunciación la saca
// espeak-ng (piper_phonemize en WebAssembly) y el modelo corre con onnxruntime-web. voz.js decide cuándo se usa.
(()=>{
const DIR='vendor/piper/';
// [id, nombre, ruta en piper-voices, hablante preferido]
const VOCES=[['es_MX-claude-high','Claude · México, femenina (la más clara)','es/es_MX/claude/high/es_MX-claude-high.onnx'],
 ['es_AR-daniela-high','Daniela · Argentina, femenina','es/es_AR/daniela/high/es_AR-daniela-high.onnx'],
 ['es_ES-sharvard-medium','Sharvard · España, femenina','es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx','F'],
 ['es_MX-ald-medium','Ald · México, masculina','es/es_MX/ald/medium/es_MX-ald-medium.onnx']];
const FUENTES=['https://huggingface.co/rhasspy/piper-voices/resolve/main/','https://huggingface.co/diffusionstudio/piper-voices/resolve/main/'];
cfg.vlVoz=cfg.vlVoz||'es_MX-claude-high';cfg.vlTono=cfg.vlTono||1.08;cfg.vlVel=cfg.vlVel||1;
// según su ánimo habla un poco más rápido o más despacio, y más agudo o más grave (como hace Gemini con el «tono»)
const ANIMO={emocionada:[1.12,1.03],risa_malvada:[1.04,.98],enojada:[1.06,.96],pensando:[.9,1],hipnosis:[.85,.97],sorpresa:[1.08,1.04],presumida:[1,1.02],mirada_intensa:[.95,.97]};
// ---------- guardar las voces ----------
const DK=window.capriDesk?.voz;
const almacen={async lista(){if(DK)return DK.lista().catch(()=>[]);try{const c=await caches.open('capri-voces');return (await c.keys()).map(r=>r.url.split('/').pop());}catch(e){return [];}},
  async leer(n){if(DK)return new Uint8Array(await DK.leer(n));const r=await (await caches.open('capri-voces')).match('/voces/'+n);if(!r)throw new Error('no está');return new Uint8Array(await r.arrayBuffer());},
  async guardar(n,b){if(DK)return DK.guardar(n,b);await (await caches.open('capri-voces')).put('/voces/'+n,new Response(b));},
  async borrar(n){if(DK)return DK.borrar(n);await (await caches.open('capri-voces')).delete('/voces/'+n);}};
let bajadas=new Set();const refresca=async()=>{bajadas=new Set((await almacen.lista()).filter(n=>n.endsWith('.onnx')).map(n=>n.replace(/\.onnx$/,'')));return bajadas;};refresca();
async function bajar(url,av){const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);const tot=+r.headers.get('content-length')||0,rd=r.body.getReader(),ps=[];let n=0;
  for(;;){const {done,value}=await rd.read();if(done)break;ps.push(value);n+=value.length;av?.(n,tot);}
  const out=new Uint8Array(n);let o=0;for(const p of ps){out.set(p,o);o+=p.length;}return out;}
async function descargar(id,av=()=>{}){const v=VOCES.find(x=>x[0]===id);if(!v)throw new Error('voz desconocida');let err;
  for(const F of FUENTES){try{const js=await bajar(F+v[2]+'.json');JSON.parse(new TextDecoder().decode(js));
      const on=await bajar(F+v[2],(n,t)=>av(`Bajando ${v[1].split(' ·')[0]}: ${(n/1048576).toFixed(0)}${t?' de '+(t/1048576).toFixed(0):''} MB…`));
      await almacen.guardar(id+'.onnx.json',js);await almacen.guardar(id+'.onnx',on);await refresca();voz=null;return true;}
    catch(e){err=e;}}
  throw err;}
// una voz propia: el .onnx y su .onnx.json (por ejemplo, bajados en otra PC)
async function importar(files){const on=[...files].find(f=>/\.onnx$/i.test(f.name)),js=[...files].find(f=>/\.onnx\.json$/i.test(f.name)||/\.json$/i.test(f.name));
  if(!on||!js)throw new Error('elige los dos archivos: el .onnx y su .onnx.json');const c=JSON.parse(await js.text());if(!c.espeak?.voice||!c.audio?.sample_rate)throw new Error('ese .json no es de una voz Piper');
  await almacen.guardar('propia.onnx.json',new Uint8Array(await js.arrayBuffer()));await almacen.guardar('propia.onnx',new Uint8Array(await on.arrayBuffer()));await refresca();voz=null;return 'propia';}
// ---------- motor ----------
const script=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('no cargó '+src));document.head.appendChild(s);});
let ortP=null,fonoP=null,voz=null,vozP=null;
const ortCarga=()=>ortP||(ortP=(window.ort?Promise.resolve():script(DIR+'ort.wasm.min.js')).then(()=>{const e=ort.env.wasm;e.wasmPaths=new URL(DIR,location.href).href;
  // con aislamiento (la app de escritorio lo da) usa varios núcleos; si no, uno solo
  e.numThreads=self.crossOriginIsolated?Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1)):1;return ort;}));
const fonoCarga=()=>fonoP||(fonoP=Promise.all([fetch(DIR+'piper_phonemize.wasm').then(r=>r.arrayBuffer()),fetch(DIR+'piper_phonemize.data').then(r=>r.arrayBuffer()),window.createPiperPhonemize?0:script(DIR+'piper_phonemize.js')]));
// texto → números de fonemas (espeak-ng); cada vez es un módulo nuevo, pero el .wasm y los datos ya están en memoria
async function fonemas(text,lengua){const [wasm,data]=await fonoCarga();
  return new Promise((res,rej)=>{let ok=false;createPiperPhonemize({wasmBinary:wasm,getPreloadedPackage:()=>data.slice(0),noInitialRun:true,
      print:d=>{try{const j=JSON.parse(d);if(j.phoneme_ids){ok=true;res(j.phoneme_ids);}}catch(e){}},printErr:()=>{},locateFile:u=>DIR+u})
    .then(m=>{m.callMain(['-l',lengua,'--input',JSON.stringify([{text}]),'--espeak_data','/espeak-ng-data']);setTimeout(()=>{if(!ok)rej(new Error('espeak no devolvió fonemas'));},4000);}).catch(rej);});}
async function cargaVoz(){const id=cfg.vlVoz;if(voz?.id===id)return voz;if(vozP?.id===id)return vozP.p;
  const p=(async()=>{if(!bajadas.has(id))await refresca();if(!bajadas.has(id))throw new Error('la voz '+id+' no está bajada');
    const [o,c]=await Promise.all([ortCarga(),almacen.leer(id+'.onnx.json').then(b=>JSON.parse(new TextDecoder().decode(b)))]);
    const ses=await o.InferenceSession.create(await almacen.leer(id+'.onnx'),{executionProviders:['wasm'],graphOptimizationLevel:'all'});
    const v=VOCES.find(x=>x[0]===id),spk=c.speaker_id_map||{};const sid=Object.keys(spk).length?(spk[v?.[3]]??Object.values(spk)[0]??0):null;
    return voz={id,ses,c,sid};})();
  vozP={id,p};try{return await p;}finally{vozP=null;}}
const trozos=t=>{t=t.replace(/\s+/g,' ').trim();if(t.length<=260)return t?[t]:[];const out=[];let cur='';
  for(const f of t.match(/[^.!?…;]+[.!?…;]*\s*/g)||[t]){if((cur+f).length>260&&cur){out.push(cur.trim());cur='';}cur+=f;}if(cur.trim())out.push(cur.trim());return out;};
// limpia lo que Piper leería raro: <laugh>, emojis, ~, asteriscos
const limpia=t=>String(t).replace(/<[^>]{1,20}>/g,' ').replace(/[\u{1F000}-\u{1FFFF}☀-➿]/gu,'').replace(/[~*_#`>]|:3|[:;]\)/g,' ').replace(/\s+/g,' ').trim();
// texto → AudioBuffer (en el AudioContext de voz.js); rate = cuánto subirle el tono al tocarlo
async function sintetiza(text,ctx){const v=await cargaVoz(),o=await ortCarga(),inf=v.c.inference||{};const [velA,tonA]=ANIMO[curState]||[1,1];
  const tono=+cfg.vlTono*tonA,vel=+cfg.vlVel*velA,pcms=[];
  for(const t of trozos(limpia(text))){const ids=await fonemas(t,v.c.espeak.voice);if(!ids.length)continue;
    const feeds={input:new o.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]),input_lengths:new o.Tensor('int64',BigInt64Array.from([BigInt(ids.length)]),[1]),
      // length_scale: con el tono subido, el audio se toca más rápido; se compensa para que la velocidad sea la que elegiste
      scales:new o.Tensor('float32',Float32Array.from([inf.noise_scale??.667,(inf.length_scale??1)*tono/vel,inf.noise_w??.8]),[3])};
    if(v.sid!=null)feeds.sid=new o.Tensor('int64',BigInt64Array.from([BigInt(v.sid)]),[1]);
    pcms.push((await v.ses.run(feeds)).output.data);}
  if(!pcms.length)throw new Error('no hubo nada que decir');
  const n=pcms.reduce((a,p)=>a+p.length,0),sr=v.c.audio.sample_rate,buf=ctx.createBuffer(1,n,sr),ch=buf.getChannelData(0);let off=0;
  for(const p of pcms){let mx=0;for(const x of p)mx=Math.max(mx,Math.abs(x));const g=mx>0?Math.min(1.6,.92/mx):1;for(let i=0;i<p.length;i++)ch[off+i]=p[i]*g;off+=p.length;}
  return {buf,rate:tono};}
window.vozLocal={VOCES,bajadas:()=>bajadas,lista:()=>bajadas.has(cfg.vlVoz),descargar,importar,sintetiza,refresca,borrar:async id=>{await almacen.borrar(id+'.onnx');await almacen.borrar(id+'.onnx.json');if(voz?.id===id)voz=null;await refresca();},
  precalienta:()=>bajadas.has(cfg.vlVoz)?cargaVoz().then(()=>fonoCarga()).catch(()=>{}):null};
// si es tu voz, se prepara en cuanto Capri está quieta (así la primera frase no espera a que cargue el modelo)
// con Gemini como motor también se deja lista (más tarde), para que el respaldo sin internet no tarde
setTimeout(async()=>{await refresca();if(cfg.tts==='local')window.vozLocal.precalienta();},2500);
setTimeout(()=>{if(cfg.tts==='gemini')window.vozLocal.precalienta();},20000);
})();
