// RELIC (2.12): el chip de Capri visto por dentro. Un cerebro holográfico (relic3d.js) cuyas zonas son apartados:
//   01 lóbulo frontal → CONSTRUCTOS: las personalidades del mosaico que cargas con .md/.txt (cargar, despertar, dormir, quitar)
//   02 lóbulo parietal → APRENDIZAJE Y VELOCIDAD: cuánto ha aprendido y qué tan rápido piensa cada cerebro (medido en cada respuesta)
//   03 lóbulo temporal → RECUERDOS: lo que guarda de ti, para buscar u olvidar
//   04 tronco y chip → MEJORAS DEL CHIP: módulos instalados, ajustes de rendimiento y puertos de expansión (plan tipo Flipper Zero)
// Todo es local (localStorage), igual que el resto de Capri.
(()=>{
const VER='2.12';
const css=document.createElement('style');css.textContent=`
#vRelic{padding:0;overflow:hidden}
.rl{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,440px);height:100%}
.rlst{position:relative;min-height:420px;background:radial-gradient(ellipse at 50% 62%,rgba(94,246,255,.12),transparent 55%),radial-gradient(ellipse at 50% 40%,rgba(255,77,94,.08),transparent 60%),#040305;overflow:hidden}
.rlst .rh{position:absolute;pointer-events:none;z-index:2;font:10px var(--mono);letter-spacing:.14em;text-transform:uppercase}
.rlst .tl{left:22px;top:16px}.rlst .tl b{display:block;font:700 22px/1 var(--sans);letter-spacing:.06em;color:var(--hr);text-transform:none}.rlst .tl span{color:#c9b9bc}
.rlst .tr{right:22px;top:20px;color:var(--hr);font:600 12px var(--sans);letter-spacing:.35em}
.rlst .bl{left:22px;bottom:16px;color:#c9b9bc}.rlst .bl canvas{display:block;margin-top:6px;width:150px;height:30px}
.rlst .br{right:22px;bottom:16px;text-align:right;color:#a99}.rlst .br b{display:block;font:700 15px var(--sans);color:var(--hg);letter-spacing:.06em}
.rlst .cn{position:absolute;width:22px;height:22px;border:1px solid var(--hc);pointer-events:none;z-index:2;opacity:.7}
.rlst .cn.a{left:10px;top:10px;border-right:0;border-bottom:0}.rlst .cn.b{right:10px;top:10px;border-left:0;border-bottom:0}.rlst .cn.c{left:10px;bottom:10px;border-right:0;border-top:0}.rlst .cn.d{right:10px;bottom:10px;border-left:0;border-top:0}
.rlst .hint{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);font:9px var(--mono);letter-spacing:.18em;color:#7d4a50;pointer-events:none;z-index:2;white-space:nowrap}
.rlst .fb{position:absolute;inset:0;display:grid;place-items:center;color:#a0565e;font:12px var(--mono)}
#rlHost{position:absolute;inset:0}
.rlp{border-left:1px solid var(--hr2);background:rgba(10,4,6,.92);display:flex;flex-direction:column;min-height:0}
.rlz{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--hr2)}
.rlz button{background:none;border:0;border-bottom:2px solid transparent;color:#c96a73;font:600 10px/1.25 var(--sans);letter-spacing:.06em;text-transform:uppercase;padding:10px 4px 8px;cursor:pointer}
.rlz button i{display:block;font:9px var(--mono);font-style:normal;color:#7d4a50;letter-spacing:.2em}
.rlz button:hover{color:#ffd0d4}.rlz button.on{color:var(--zc,var(--hc));border-bottom-color:var(--zc,var(--hc));background:rgba(255,255,255,.02)}
.rlb{flex:1;overflow:auto;padding:16px 18px 22px}
.rlb h4{margin:0;font:600 18px var(--sans);letter-spacing:.06em;color:var(--zc,var(--hc));text-transform:uppercase}
.rlb .zt{font:10px var(--mono);letter-spacing:.2em;color:#a0565e;text-transform:uppercase;margin-bottom:10px}
.rlb p.d{margin:0 0 12px;color:#e7c3c7;font-size:12px}
.rlb .sec{font:10px var(--mono);letter-spacing:.2em;color:#c96a73;text-transform:uppercase;margin:16px 0 8px;display:flex;gap:8px;align-items:center}
.rlb .sec::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--hr2),transparent)}
.rlb .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rlb .hbtn{padding:7px 10px;font-size:11px}
.rlb select,.rlb input[type=text],.rlb textarea{background:#0d0507;border:1px solid #3b1418;color:#ffe4e6;font:12px var(--mono);padding:6px 8px;outline:0}
.rlb textarea{width:100%;min-height:54px;resize:vertical;box-sizing:border-box}
.drop{border:1px dashed var(--hr2);padding:14px;text-align:center;color:#c96a73;font:11px var(--mono);cursor:pointer;margin-bottom:10px}
.drop.on,.drop:hover{border-color:var(--hc);color:var(--hc);background:rgba(94,246,255,.04)}
.cst{border:1px solid #3b1418;background:linear-gradient(135deg,#160709,#0a0406);padding:10px 12px;margin-bottom:8px;position:relative;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}
.cst.off{opacity:.55}.cst .nm{font:600 14px var(--sans);color:#ffe4e6;letter-spacing:.04em}.cst .nm em{font:9px var(--mono);font-style:normal;letter-spacing:.18em;margin-left:8px;padding:1px 5px;border:1px solid}
.cst .nm em.on{color:var(--hr);border-color:var(--hr)}.cst .nm em.of{color:#7d6a6c;border-color:#4a3a3c}
.cst .mt{font:10px var(--mono);color:#a0565e;margin:3px 0 8px}.cst pre{white-space:pre-wrap;max-height:180px;overflow:auto;font:11px var(--mono);color:#d9a3a9;background:#080304;padding:8px;margin:8px 0 0;border:1px solid #2a0d11}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.tile{border:1px solid #3b1418;padding:8px 10px;background:rgba(20,6,9,.7)}.tile small{display:block;font:9px var(--mono);letter-spacing:.16em;color:#a0565e;text-transform:uppercase}
.tile b{font:700 20px var(--sans);color:var(--zc,var(--hc))}.tile span{font:10px var(--mono);color:#c99;margin-left:4px}
.lvl{border:1px solid var(--zc,var(--hc));padding:10px 12px;margin-bottom:10px}.lvl b{font:700 26px var(--sans);color:var(--zc,var(--hc))}.lvl small{font:10px var(--mono);color:#c99;letter-spacing:.14em;text-transform:uppercase;margin-left:8px}
.bar{height:6px;background:#1e0a0d;margin-top:8px;position:relative}.bar i{position:absolute;inset:0 auto 0 0;background:var(--zc,var(--hc));box-shadow:0 0 8px var(--zc,var(--hc))}
.spk{width:100%;height:70px;display:block;border:1px solid #2a0d11;background:#080304}
.tb{width:100%;border-collapse:collapse;font:11px var(--mono)}.tb td,.tb th{border-bottom:1px solid #2a0d11;padding:5px 4px;text-align:left}.tb th{color:#a0565e;font-weight:400;letter-spacing:.1em;text-transform:uppercase;font-size:9px}.tb td b{color:var(--zc,var(--hc))}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.chips button{background:none;border:1px solid #3b1418;color:#c96a73;font:10px var(--mono);padding:3px 7px;cursor:pointer}.chips button.on{border-color:var(--zc);color:var(--zc)}
.mem{display:flex;gap:8px;align-items:flex-start;padding:8px 4px;border-bottom:1px solid #1d0b0e}.mem .dt{flex:1}.mem b{display:block;font:9px var(--mono);letter-spacing:.14em;color:#a0565e;text-transform:uppercase}
.mem span{color:#ffe4e6;font-size:12px}.mem button{background:none;border:1px solid #3b1418;color:#c96a73;cursor:pointer;font:10px var(--mono);padding:2px 6px}.mem button:hover{border-color:var(--zc);color:var(--zc)}
.chipcard{border:1px solid var(--zc);padding:12px 14px;display:flex;gap:14px;align-items:center;background:linear-gradient(135deg,rgba(107,255,176,.07),transparent);clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)}
.chipcard svg{width:64px;height:64px;flex:0 0 auto}.chipcard b{font:700 18px var(--sans);color:var(--zc);letter-spacing:.08em}.chipcard small{display:block;font:10px var(--mono);color:#c99;letter-spacing:.1em}
.mods{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.mod{border:1px solid #2a3a30;padding:7px 9px;font:11px var(--mono);color:#cfe;background:rgba(6,14,10,.6)}.mod b{display:block;font:600 12px var(--sans);color:#e6fff1;letter-spacing:.03em}
.mod em{font-style:normal;font-size:9px;letter-spacing:.16em;padding:0 4px;border:1px solid}.mod em.a{color:var(--zc);border-color:var(--zc)}.mod em.i{color:#9ab;border-color:#456}.mod em.p{color:var(--hg);border-color:var(--hg)}.mod em.x{color:#777;border-color:#444}
.mod.port{border-style:dashed;border-color:#3b3a20;background:rgba(14,12,4,.5)}.mod.port b{color:#f6eab0}
.mod p{margin:4px 0 0;color:#9bb;font-size:10px}.mod .row{margin-top:6px}
.mod select{font-size:10px;padding:2px 4px}
.rlb label.sw{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #1d0b0e;font-size:12px;color:#ffd0d4}
@media (max-width:980px){#vRelic{overflow:auto}.rl{grid-template-columns:1fr;height:auto}.rlst{height:420px;min-height:420px}.rlp{border-left:0;border-top:1px solid var(--hr2)}.rlb{overflow:visible}.rlst .bl,.rlst .hint{display:none}}
`;document.head.appendChild(css);

const ZON=[{k:'constructos',n:'Constructos',l:'Lóbulo frontal',c:'#ff4d5e'},{k:'aprendizaje',n:'Aprendizaje y velocidad',l:'Lóbulo parietal',c:'#5ef6ff'},
  {k:'recuerdos',n:'Recuerdos',l:'Lóbulo temporal',c:'#f3c84b'},{k:'chip',n:'Mejoras del chip',l:'Tronco · chip Relic',c:'#6bffb0'}];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=ms=>ms==null||isNaN(ms)?'—':ms<1000?Math.round(ms)+' ms':(ms/1000).toFixed(ms<10000?2:1)+' s';
const hace=ts=>{if(!ts)return 'nunca';const m=(Date.now()-ts)/60000;return m<1?'hace un momento':m<60?'hace '+Math.round(m)+' min':m<1440?'hace '+Math.round(m/60)+' h':'hace '+Math.round(m/1440)+' días';};
let zona=store.get('relicZona',0),v=null,body=null,mounted=false,memCat='todo',memQ='',ver=new Set();

function montar(el){if(v)return;v=el;
  v.innerHTML=`<div class="rl"><div class="rlst"><div id="rlHost"></div>
   <i class="cn a"></i><i class="cn b"></i><i class="cn c"></i><i class="cn d"></i>
   <div class="rh tl"><b>NEURO-SCAN // RELIC</b><span>Engrama de Capri · enlace neural activo</span></div><div class="rh tr">CRIMSON</div>
   <div class="rh bl">Actividad sináptica<canvas id="rlBars" width="150" height="30"></canvas></div>
   <div class="rh br"><b id="rlSync">SINCRONÍA --</b><span id="rlRot">ROT 000° · FRAME 0000</span></div>
   <div class="hint">arrastra para girar · rueda para acercar · toca una zona del cerebro</div></div>
   <div class="rlp"><div class="rlz">${ZON.map((z,i)=>`<button data-z="${i}" style="--zc:${z.c}"><i>ZONA 0${i+1}</i>${z.n}</button>`).join('')}</div><div class="rlb" id="rlBody"></div></div></div>`;
  body=v.querySelector('#rlBody');
  v.querySelector('.rlz').onclick=e=>{const b=e.target.closest('[data-z]');if(b)abrir(+b.dataset.z);};
  monta3D();hudLoop();}
function monta3D(){const R=window.Relic3D,h=v?.querySelector('#rlHost');if(!R||!h||mounted)return;
  if(!R.attach(h)){h.innerHTML='<div class="fb">Tu equipo no pudo abrir el cerebro 3D (WebGL). Los apartados de la derecha funcionan igual.</div>';return;}
  mounted=true;R.onPick(z=>abrir(z,true));R.select(zona);cuentas();}
addEventListener('relic3d:ready',monta3D);

function abrir(z,del3D){zona=z;store.set('relicZona',z);if(!del3D)window.Relic3D?.select(z);render();}
function render(){if(!body||!v.classList.contains('on'))return;const z=ZON[zona];v.querySelectorAll('.rlz button').forEach(b=>b.classList.toggle('on',+b.dataset.z===zona));
  body.style.setProperty('--zc',z.c);body.innerHTML=`<h4>${z.n}</h4><div class="zt">Zona 0${zona+1} · ${z.l}</div>`+[pConstructos,pAprendizaje,pRecuerdos,pChip][zona]();
  [aConstructos,aAprendizaje,aRecuerdos,aChip][zona]();cuentas();}

// ---------- engramas por zona (las luces del cerebro) ----------
function aprendido(){const ci=window.cerebroInfo?.()||{},ap=window.aprendeInfo?.()||{},sa=window.saberInfo?.()||{},ta=window.tallerInfo?.()||{},cr=window.crimsonInfo?.()||{};
  const it=[['Recuerdos de ti',M().hechos.length],['Pláticas en memoria buscable',ci.mems||0],['Lecciones de entrenamiento',ap.lecciones||0],['Notas verificadas',sa.datos||0],
    ['Tarjetas de repaso',sa.tarjetas||0],['Habilidades y notas del taller',(ta.propias||0)+(ta.lecciones||0)],['Crimson Nightmare (de ti)',(cr.perfil||0)+(cr.caps||0)],['Constructos integrados',frags.length]];
  const total=it.reduce((s,x)=>s+x[1],0),nivel=Math.floor(Math.sqrt(total/4))+1,base=(nivel-1)**2*4,sig=nivel**2*4;return {it,total,nivel,pct:(total-base)/(sig-base)};}
function modulos(){const ci=window.cerebroInfo?.()||{},sa=window.saberInfo?.(),cr=window.crimsonInfo?.(),turbo=document.getElementById('ceTurbo')?.value==='1';
  return [['Cerebro adaptativo','Piensa también con tu GPU (Ollama).',ci.ok?'a':'i',ci.ok?'ACTIVO':'SIN OLLAMA'],
   ['Turbo GPU','Precalienta el modelo y ajusta el contexto.',turbo&&ci.ok?'a':'i',turbo?'ENCENDIDO':'APAGADO'],
   ['Coprocesador Claude','Tercer cerebro para lo difícil.',ci.claude&&ci.claude!=='off'&&ci.claudeKey?'a':'i',ci.claude&&ci.claude!=='off'?(ci.claudeKey?'ACTIVO':'SIN KEY'):'APAGADO'],
   ['Voz local','Habla con Piper en tu PC, sin Gemini.',window.vozLocal?.lista?.()?'a':'i',window.vozLocal?.lista?.()?'LISTA':'SIN VOZ'],
   ['Bóveda cifrada','Todo cifrado con tu llave (AES-256).',window.Boveda?.activa?.()?'a':'i',window.Boveda?.activa?.()?'ACTIVA':'SIN LLAVE'],
   ['Lectura completa','Lee documentos largos por partes.','a','INSTALADO'],
   ['Núcleo de certeza','Cita fuentes y dice «no sé».',sa?'a':'i',sa?(sa.auto?'ESTUDIA SOLA':'INSTALADO'):'—'],
   ['Crimson Nightmare','Aprende de ti, para los tuyos.',cr?.learn?'a':'i',cr?.learn?'APRENDIENDO':'EN PAUSA']];}
function cuentas(){const R=window.Relic3D;if(!R||!mounted)return;R.setCounts([frags.filter(f=>!f.off).length,aprendido().total,M().hechos.length,modulos().filter(m=>m[2]==='a').length]);}

// ---------- 01 CONSTRUCTOS ----------
const FREQ={rara:'Rara vez',normal:'Normal',seguido:'Seguido'};
function pConstructos(){const last=store.get('fragLast',0),fq=store.get('fragFreq','normal');
  return `<p class="d">Las personalidades del mosaico. Cárgalas desde archivos <b>.md</b> o <b>.txt</b> (el nombre lo toma de «**Nombre:**» o del título). Las activas pueden asomarse cuando platicas y Capri las suprime; las dormidas se quedan guardadas pero no salen. Si un constructo es largo, Capri no lo manda entero: usa el principio y las partes que vienen al caso, para no quedarse pensando.</p>
  <div class="drop" id="rcDrop">⇪ Arrastra aquí tus .md / .txt o <u>elige archivos</u></div><input type="file" id="rcFile" accept=".txt,.md,text/plain,text/markdown" multiple style="display:none">
  <div class="row" style="justify-content:space-between;margin-bottom:6px"><label style="font-size:12px;color:#ffd0d4">Qué tan seguido se asoman <select id="rcFreq">${Object.entries(FREQ).map(([k,n])=>`<option value="${k}"${k===fq?' selected':''}>${n}</option>`).join('')}</select></label>
   <small style="font:10px var(--mono);color:#a0565e">Último asomo: ${hace(last)}</small></div>
  <div class="sec">Constructos integrados · ${frags.length} (${frags.filter(f=>!f.off).length} activos)</div>
  ${frags.length?frags.map((f,i)=>`<div class="cst${f.off?' off':''}"><div class="nm">◆ ${esc(f.name)}<em class="${f.off?'of':'on'}">${f.off?'DORMIDO':'ACTIVO'}</em></div>
   <div class="mt">${Math.round(f.text.length/1000)||'<1'}k caracteres${f.cut?' · recortado de '+Math.round(f.cut/1000)+'k':''}${f.text.length>(window.fragTope||8000)?' · se lee por partes':''}${f.ts?' · integrado '+hace(f.ts):''}</div>
   <div class="row"><button class="hbtn${f.off?'':' c'}" data-act="tog" data-i="${i}">${f.off?'Activar':'Dormir'}</button><button class="hbtn" data-act="wake" data-i="${i}">Despertar ahora</button>
   <button class="hbtn" data-act="ver" data-i="${i}">${ver.has(f.name)?'Ocultar':'Ver'}</button><button class="hbtn" data-act="del" data-i="${i}">Quitar</button></div>
   ${ver.has(f.name)?`<pre>${esc(f.text.slice(0,1500))}${f.text.length>1500?'\n…':''}</pre>`:''}</div>`).join(''):'<p class="d" style="color:#a0565e">Ningún constructo todavía. Nadie más vive aquí… por ahora.</p>'}
  <p class="d" style="font-size:11px;color:#a0565e">Se guardan solo en esta PC. Para que Capri lea un documento entero (no como personalidad), súbelo a la BIBLIOTECA.</p>`;}
function aConstructos(){const fi=body.querySelector('#rcFile'),dr=body.querySelector('#rcDrop');
  const carga=async fs=>{for(const f of fs){if(!/\.(md|txt|markdown)$/i.test(f.name)&&!/^text\//.test(f.type)){alert('«'+f.name+'» no es .md ni .txt');continue;}await addFrag(f);}
    window.Relic3D?.pulse(0,3000);render();dispatchEvent(new Event('capri:constructos'));};
  dr.onclick=()=>fi.click();fi.onchange=e=>{carga([...e.target.files]);e.target.value='';};
  dr.ondragover=e=>{e.preventDefault();dr.classList.add('on');};dr.ondragleave=()=>dr.classList.remove('on');
  dr.ondrop=e=>{e.preventDefault();dr.classList.remove('on');carga([...e.dataTransfer.files]);};
  body.querySelector('#rcFreq').onchange=e=>store.set('fragFreq',e.target.value);
  body.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const f=frags[+b.dataset.i];if(!f)return;const a=b.dataset.act;
    if(a==='tog'){f.off=!f.off;store.set('frags',frags);}
    else if(a==='wake'){fragForce=f;if(!confirm('«'+f.name+'» se va a asomar en tu próximo mensaje. ¿Ir con Capri?')){render();return;}hudGo('capri',true);}
    else if(a==='ver'){ver.has(f.name)?ver.delete(f.name):ver.add(f.name);}
    else if(a==='del'){if(!confirm('¿Quitar el constructo «'+f.name+'»?'))return;frags.splice(+b.dataset.i,1);store.set('frags',frags);}
    renderFrags();render();});}

// ---------- 02 APRENDIZAJE Y VELOCIDAD ----------
const fam=c=>/^GPU/i.test(c)?'GPU':/^Claude/i.test(c)?'Claude':'Gemini';
const FCOL={Gemini:'#5ef6ff',GPU:'#6bffb0',Claude:'#f3c84b'};
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const med=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);return b[b.length>>1];};
function velocidad(){const L=store.get('relicMet',[]),ok=L.filter(m=>!m.falla&&m.pri>0),u=ok.slice(-20);
  const cps=u.reduce((s,m)=>s+(m.chars||0),0)/Math.max(.001,u.reduce((s,m)=>s+Math.max(0,m.total-m.pri),0)/1000);
  const por={};for(const m of ok.slice(-100)){const f=fam(m.cer);(por[f]=por[f]||{n:0,pri:[],tot:[],mod:m.cer}).n++;por[f].pri.push(m.pri);por[f].tot.push(m.total);por[f].mod=m.cer;}
  return {L,ok,pri:med(u.map(m=>m.pri)),tot:med(u.map(m=>m.total)),cps:u.length?cps:null,fallas:L.slice(-50).filter(m=>m.falla).length,por};}
const ritmo=ms=>ms==null?'sin medir':ms<1200?'relámpago':ms<2500?'rápida':ms<5000?'normal':'lenta';
function pAprendizaje(){const a=aprendido(),s=velocidad(),hoy=M().hechos.filter(h=>new Date(h.ts).toDateString()===new Date().toDateString()).length,B=window.cerebroMedidas?.()||[];
  return `<p class="d">Qué tan rápido piensa Capri (se mide sola en cada respuesta) y cuánto ha aprendido de ti y de lo que estudian juntos.</p>
  <div class="sec">Velocidad de pensamiento</div>
  <div class="tiles"><div class="tile"><small>1ª palabra</small><b>${fmt(s.pri)}</b><span>${ritmo(s.pri)}</span></div><div class="tile"><small>Respuesta completa</small><b>${fmt(s.tot)}</b></div>
   <div class="tile"><small>Velocidad al escribir</small><b>${s.cps?Math.round(s.cps):'—'}</b><span>letras/s ≈ ${s.cps?Math.round(s.cps/4):'—'} tokens/s</span></div><div class="tile"><small>Cortes / errores</small><b>${s.fallas}</b><span>de las últimas ${Math.min(50,s.L.length)}</span></div></div>
  <div class="sec">Últimas respuestas (1ª palabra)</div><canvas class="spk" id="raSpk" width="400" height="70"></canvas>
  <div class="row" style="margin-top:4px;font:10px var(--mono);color:#a99">${Object.entries(FCOL).map(([k,c])=>`<span><i style="display:inline-block;width:8px;height:8px;background:${c};margin-right:4px"></i>${k}</span>`).join('')}</div>
  ${Object.keys(s.por).length?`<table class="tb" style="margin-top:8px"><tr><th>Cerebro</th><th>Resp.</th><th>1ª palabra</th><th>Completa</th></tr>${Object.entries(s.por).map(([f,p])=>`<tr><td style="color:${FCOL[f]}">${esc(f==='Gemini'?p.mod:p.mod.replace(/^(GPU|Claude) · /,f+' · '))}</td><td>${p.n}</td><td><b>${fmt(med(p.pri))}</b></td><td>${fmt(med(p.tot))}</td></tr>`).join('')}</table>`:'<p class="d" style="color:#a0565e;margin-top:8px">Aún no hay medidas: platica con Capri y aquí aparecen.</p>'}
  <div class="row" style="margin-top:10px"><button class="hbtn c" id="raBench"${window.cerebroMedir?'':' disabled'}>⚡ Medir mi GPU</button><button class="hbtn" id="raReset">Borrar medidas</button></div>
  ${B.length?`<div style="font:10px var(--mono);color:#c99;margin-top:8px">${B.slice(-3).reverse().map(R=>esc(new Date(R.ts).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' · '+(window.cerebroResumen?.(R)||''))).join('<br>')}</div>`:''}
  <div class="sec">Aprendizaje</div>
  <div class="lvl"><b>NIVEL ${a.nivel}</b><small>${a.total} engramas · ${hoy} recuerdo(s) nuevo(s) hoy</small><div class="bar"><i style="width:${Math.round(a.pct*100)}%"></i></div></div>
  <table class="tb">${a.it.map(([n,c])=>`<tr><td>${n}</td><td style="text-align:right"><b>${c}</b></td></tr>`).join('')}</table>
  <p class="d" style="font-size:11px;color:#a0565e;margin-top:8px">Llevan juntos ${ago(Date.now()-M().desde)}. Las lecciones salen de tus 👍/👎; la memoria buscable y el autoentrenamiento se configuran en AJUSTES → Cerebro de tu GPU.</p>`;}
function aAprendizaje(){const c=body.querySelector('#raSpk'),s=velocidad(),u=s.ok.slice(-40);if(c){const g=c.getContext('2d'),W=c.width=c.clientWidth*devicePixelRatio,H=c.height=70*devicePixelRatio;
  g.clearRect(0,0,W,H);const mx=Math.max(3000,...u.map(m=>m.pri));g.strokeStyle='rgba(255,77,94,.25)';g.setLineDash([3,4]);
  for(const ms of [1000,2500,5000])if(ms<mx){const y=H-ms/mx*(H-8);g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();g.fillStyle='rgba(255,140,150,.5)';g.font=9*devicePixelRatio+'px monospace';g.fillText(ms/1000+' s',3,y-2);}
  const bw=W/40;u.forEach((m,i)=>{const h=Math.max(2,m.pri/mx*(H-8));g.fillStyle=FCOL[fam(m.cer)];g.globalAlpha=.85;g.fillRect(i*bw+1,H-h,bw-2,h);});g.globalAlpha=1;}
  const b=body.querySelector('#raBench');if(b)b.onclick=async()=>{b.disabled=true;b.textContent='⚡ Midiendo…';try{const R=await window.cerebroMedir();if(R?.nota&&!R.modelo)alert('Medí el dibujo ('+R.fps+' fps), pero '+R.nota+': abre Ollama en tu PC para medir el modelo.');}catch(e){alert('No se pudo medir: '+e.message);}render();};
  body.querySelector('#raReset').onclick=()=>{if(confirm('¿Borrar las medidas de velocidad?')){store.set('relicMet',[]);render();}};}

// ---------- 03 RECUERDOS ----------
function pRecuerdos(){M();const hs=mem.hechos,cnt=c=>hs.filter(h=>h.c===c).length,ci=window.cerebroInfo?.()||{};
  const q=memQ.toLowerCase(),list=hs.filter(h=>(memCat==='todo'||h.c===memCat)&&(!q||h.t.toLowerCase().includes(q))).slice().sort((a,b)=>b.ts-a.ts);
  return `<p class="d">Lo que Capri guarda de ti entre pláticas (se lo dices tú; ella lo anota sola). Los de «su día» se olvidan a la semana; lo demás se queda (hasta 120).</p>
  <div class="tiles"><div class="tile"><small>Recuerdos</small><b>${hs.length}</b><span>/120</span></div><div class="tile"><small>Memoria buscable</small><b>${ci.mems||0}</b><span>pláticas</span></div></div>
  <div class="sec">Buscar</div><input type="text" id="rrQ" placeholder="buscar en sus recuerdos…" value="${esc(memQ)}" style="width:100%;box-sizing:border-box;margin-bottom:8px">
  <div class="chips"><button data-c="todo" class="${memCat==='todo'?'on':''}">Todo ${hs.length}</button>${Object.entries(MEMCATS).filter(([k])=>cnt(k)).map(([k,n])=>`<button data-c="${k}" class="${memCat===k?'on':''}">${n} ${cnt(k)}</button>`).join('')}</div>
  <div id="rrL">${list.length?list.map(h=>`<div class="mem"><div class="dt"><b>${esc(MEMCATS[h.c]||h.c)} · ${new Date(h.ts).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'2-digit'})}</b><span>${esc(h.t)}</span></div>
    <button data-ask="${hs.indexOf(h)}" title="Platicar de esto">💬</button><button data-del="${hs.indexOf(h)}" title="Olvidar">✕</button></div>`).join(''):'<p class="d" style="color:#a0565e">'+(hs.length?'Nada coincide.':'Todavía no guarda recuerdos de ti. Platícale de tu vida.')+'</p>'}</div>
  <div class="row" style="margin-top:12px"><button class="hbtn c" id="rrDiario">Abrir DIARIO</button>${window.openHilos?'<button class="hbtn" id="rrHilos">Hilos de memoria</button>':''}</div>`;}
function aRecuerdos(){const q=body.querySelector('#rrQ');q.oninput=()=>{memQ=q.value;const p=q.selectionStart;render();const n=body.querySelector('#rrQ');n.focus();n.setSelectionRange(p,p);};
  body.querySelector('.chips').onclick=e=>{const b=e.target.closest('[data-c]');if(b){memCat=b.dataset.c;render();}};
  body.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const h=mem.hechos[+b.dataset.del];if(!h||!confirm('¿Que Capri olvide esto?\n'+h.t))return;mem.hechos=mem.hechos.filter(x=>x!==h);store.set('mem',mem);render();});
  body.querySelectorAll('[data-ask]').forEach(b=>b.onclick=()=>{const h=mem.hechos[+b.dataset.ask];if(!h)return;hudGo('capri',true);setTimeout(()=>send('¿Te acuerdas de esto? '+h.t),380);});
  body.querySelector('#rrDiario').onclick=()=>hudGo('diario');const hl=body.querySelector('#rrHilos');if(hl)hl.onclick=()=>window.openHilos();}

// ---------- 04 MEJORAS DEL CHIP ----------
// puertos de expansión: la idea de Kiga de llevar a Capri a un aparato propio, tipo Flipper Zero. Por ahora es el plan; cada puerto guarda su estado y tus notas.
const PUERTOS=[['cuerpo','Cuerpo portátil','Capri en un aparato de bolsillo (Raspberry Pi Zero / ESP32 con pantalla y botones), con su cerebro en tu PC o en el aparato.'],
 ['python','Cerebro Python','Servidor propio (FastAPI): memoria entre dispositivos y hablar contigo con la app cerrada.'],
 ['ir','Infrarrojo','Aprender y mandar señales de los controles remotos de tus aparatos.'],
 ['nfc','NFC / RFID','Leer y guardar tus propias tarjetas y llaveros.'],
 ['subghz','Sub-GHz','Escuchar tus propios sensores y timbres inalámbricos (433/915 MHz).'],
 ['gpio','GPIO y sensores','Pines para conectar sensores, luces y módulos de tus proyectos.'],
 ['ble','Bluetooth','Hablar con tus relojes, bocinas y aparatos cercanos.'],
 ['usb','USB de laboratorio','Herramientas para tu laboratorio de ciberseguridad, solo en tus propios equipos.']];
const EST={idea:['IDEA','x'],plan:['PLANEADO','p'],prog:['EN PROGRESO','p'],listo:['INSTALADO','a']};
function pChip(){const mods=modulos(),pu=store.get('relicPuertos',{}),mis=store.get('relicMejoras',[]),modo=document.getElementById('ceModo')?.value,turbo=document.getElementById('ceTurbo')?.value;
  const act=mods.filter(m=>m[2]==='a').length,prog=Object.values(pu).filter(p=>p.e==='prog'||p.e==='listo').length+mis.filter(m=>m.e==='prog'||m.e==='listo').length;
  return `<div class="chipcard"><svg viewBox="0 0 64 64"><rect x="14" y="14" width="36" height="36" fill="none" stroke="#6bffb0" stroke-width="2"/><rect x="22" y="22" width="20" height="20" fill="rgba(107,255,176,.25)" stroke="#6bffb0"/>
    ${[18,26,34,42].map(p=>`<path d="M${p+2} 14 V6 M${p+2} 50 V58 M14 ${p+2} H6 M50 ${p+2} H58" stroke="#6bffb0" stroke-width="2"/>`).join('')}<text x="32" y="36" text-anchor="middle" font-size="7" fill="#e6fff1" font-family="monospace">RELIC</text></svg>
   <div><b>CHIP RELIC · v${VER}</b><small>${act}/${mods.length} módulos activos · ${prog} mejora(s) en marcha</small><small>Constructo: Capri · Proyecto Capricornio</small></div></div>
  <div class="sec">Rendimiento</div>
  <label class="sw">Quién contesta <select id="rkModo"${modo?'':' disabled'}><option value="auto"${modo==='auto'?' selected':''}>Auto (GPU + Gemini)</option><option value="local"${modo==='local'?' selected':''}>Siempre tu GPU</option><option value="gemini"${modo==='gemini'?' selected':''}>Solo Gemini</option></select></label>
  <label class="sw">Turbo GPU <select id="rkTurbo"${turbo?'':' disabled'}><option value="1"${turbo==='1'?' selected':''}>Encendido</option><option value="0"${turbo==='0'?' selected':''}>Apagado</option></select></label>
  <div class="row" style="margin-top:8px"><button class="hbtn c" id="rkBench"${window.cerebroMedir?'':' disabled'}>⚡ Medir velocidad</button><button class="hbtn" id="rkVel">Ver métricas</button></div>
  <div class="sec">Módulos instalados</div>
  <div class="mods">${mods.map(m=>`<div class="mod"><b>${m[0]}</b><em class="${m[2]}">${m[3]}</em><p>${m[1]}</p></div>`).join('')}</div>
  <div class="sec">Puertos de expansión · plan tipo Flipper Zero</div>
  <p class="d" style="font-size:11px">Lo que el chip podría llegar a tener. Marca en qué va cada uno y apunta tus ideas; Capri lo guarda aquí.</p>
  <div class="mods">${PUERTOS.map(([k,n,d])=>{const p=pu[k]||{e:'idea'};return `<div class="mod port"><b>${n}</b><em class="${EST[p.e][1]}">${EST[p.e][0]}</em><p>${d}</p>
    <div class="row"><select data-pu="${k}">${Object.entries(EST).map(([e,[l]])=>`<option value="${e}"${e===p.e?' selected':''}>${l}</option>`).join('')}</select></div>
    ${p.nota?`<p style="color:#f6eab0">✎ ${esc(p.nota)}</p>`:''}<div class="row"><button class="hbtn" style="padding:3px 7px;font-size:9px" data-nota="${k}">${p.nota?'Editar nota':'+ Nota'}</button></div></div>`;}).join('')}</div>
  <div class="sec">Mis mejoras</div>
  ${mis.map((m,i)=>`<div class="mem"><div class="dt"><b>${EST[m.e]?.[0]||'IDEA'} · ${new Date(m.ts).toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</b><span>${esc(m.t)}</span></div>
    <select data-me="${i}">${Object.entries(EST).map(([e,[l]])=>`<option value="${e}"${e===m.e?' selected':''}>${l}</option>`).join('')}</select><button data-mx="${i}" title="Quitar">✕</button></div>`).join('')||'<p class="d" style="color:#a0565e">Todavía no apuntas mejoras propias.</p>'}
  <textarea id="rkNew" placeholder="Nueva mejora: p. ej. «que Capri responda en menos de 1 s con un modelo más chico»"></textarea>
  <div class="row" style="margin-top:6px"><button class="hbtn c" id="rkAdd">+ Añadir mejora</button><button class="hbtn" id="rkAsk">Pedirle ideas a Capri</button></div>`;}
function aChip(){const pass=(id,sel)=>{const s=body.querySelector(sel),o=document.getElementById(id);if(s&&o)s.onchange=()=>{o.value=s.value;o.dispatchEvent(new Event('change'));setTimeout(render,200);};};
  pass('ceModo','#rkModo');pass('ceTurbo','#rkTurbo');
  body.querySelector('#rkBench').onclick=()=>{abrir(1);setTimeout(()=>body.querySelector('#raBench')?.click(),50);};
  body.querySelector('#rkVel').onclick=()=>abrir(1);
  const pu=store.get('relicPuertos',{}),sv=()=>{store.set('relicPuertos',pu);render();};
  body.querySelectorAll('[data-pu]').forEach(s=>s.onchange=()=>{pu[s.dataset.pu]={...(pu[s.dataset.pu]||{}),e:s.value};sv();});
  body.querySelectorAll('[data-nota]').forEach(b=>b.onclick=()=>{const k=b.dataset.nota,p=pu[k]||{e:'idea'},n=prompt('Nota para «'+PUERTOS.find(x=>x[0]===k)[1]+'»:',p.nota||'');if(n===null)return;pu[k]={...p,nota:n.trim().slice(0,300)};sv();});
  const mis=store.get('relicMejoras',[]),sm=()=>{store.set('relicMejoras',mis);render();};
  body.querySelectorAll('[data-me]').forEach(s=>s.onchange=()=>{mis[+s.dataset.me].e=s.value;sm();});
  body.querySelectorAll('[data-mx]').forEach(b=>b.onclick=()=>{mis.splice(+b.dataset.mx,1);sm();});
  body.querySelector('#rkAdd').onclick=()=>{const t=body.querySelector('#rkNew').value.trim();if(!t)return;mis.push({t:t.slice(0,400),e:'idea',ts:Date.now()});window.Relic3D?.pulse(3,2500);sm();};
  body.querySelector('#rkAsk').onclick=()=>{const ya=[...PUERTOS.filter(([k])=>pu[k]&&pu[k].e!=='idea').map(p=>p[1]),...mis.map(m=>m.t)];hudGo('capri',true);
    setTimeout(()=>send('Estoy viendo las mejoras de tu chip Relic. Quiero que seas más rápida y llevarte algún día a un aparato propio tipo Flipper Zero.'+(ya.length?' Ya tengo en la lista: '+ya.join('; ')+'.':'')+' ¿Qué mejoras me propones y por dónde empezamos?'),380);};}

// ---------- HUD del escáner: barras sinápticas, sincronía, rotación ----------
let hudT=0;
function hudLoop(){clearInterval(hudT);const bars=Array.from({length:30},()=>Math.random());
  hudT=setInterval(()=>{if(!v?.classList.contains('on')||document.hidden)return;const st=window.Relic3D?.stats?.()||{rot:0,frame:0,act:.2};
    const c=v.querySelector('#rlBars'),g=c.getContext('2d');g.clearRect(0,0,150,30);
    for(let i=0;i<bars.length;i++){bars[i]=bars[i]*.55+Math.random()*(.25+st.act*.75)*.45;const h=Math.max(2,bars[i]*28);g.fillStyle=i%4===1||i%7===3?'#ff4d5e':'#5ef6ff';g.fillRect(i*5,30-h,3,h);}
    const re=+(document.querySelector('.mt[data-k="relic"] b')?.textContent)||0;
    v.querySelector('#rlSync').textContent='SINCRONÍA '+(re?re.toFixed(1):'--')+'%';
    v.querySelector('#rlRot').textContent='ROT '+String(Math.round(st.rot)).padStart(3,'0')+'° · FRAME '+String(st.frame%10000).padStart(4,'0');},120);}

// ---------- vida: el cerebro reacciona a lo que pasa ----------
addEventListener('capri:recuerdo',()=>{window.Relic3D?.pulse(2,3000);if(zona===2)render();else cuentas();});
addEventListener('capri:fragmento',()=>window.Relic3D?.pulse(0,4000));
addEventListener('capri:constructos',()=>{if(zona===0)render();else cuentas();});
addEventListener('capri:medida',()=>{window.Relic3D?.pulse(1,1500);if(zona===1)render();});
addEventListener('hud:view',e=>{const {v:vv,el}=e.detail||{};if(vv!=='relic'||!el)return;montar(el);monta3D();render();});
window.relicAbrir=z=>{hudGo('relic');setTimeout(()=>abrir(z),60);};
})();
