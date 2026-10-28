// ================= MENTE ASOCIATIVA (2.10) =================
// Como una persona: cuando lo que platicas o los apuntes que subes se parecen a un paciente que viste, Capri te lo suelta
// a su modo («oye, ¿te acuerdas del px de hace 3 días? esto se relaciona por…»). Las pláticas viejas que le vienen a la
// mente las pone cerebro.js (ocurrencia); aquí van los pacientes, y eso pasa SOLO en tu equipo: el expediente no va a la IA
// ni a la memoria de pláticas. La frase se arma aquí, se muestra en pantalla y no entra al historial.
(()=>{
const css=document.createElement('style');css.textContent='.out .t.asoc{border-left-color:var(--cyan);color:#cfeff0}';document.head.appendChild(css);
const dichos=new Map();   // paciente → cuándo y por qué ya te lo recordó (para no repetirlo a cada rato)
const hace=d=>d==null?'hace poco':d===0?'hoy':d===1?'ayer':d===2?'antier':d<7?`hace ${d} días`:d<14?'la semana pasada':`hace ${Math.round(d/7)} semanas`;
const y=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' y '+a.at(-1);
const quien=r=>'exp. '+r.nexp+(r.ini?' · '+r.ini:'');
const azar=a=>a[Math.floor(Math.random()*a.length)];
const PLATICA=[
  (r,h)=>`Oye, ¿te acuerdas del px que viste ${h}${r.dx?' ('+r.dx+')':''}? Esto se relaciona por ${y(r.por)}.`,
  (r,h)=>`Espera… esto me suena. El px de ${h}${r.dx?', el de '+r.dx:''}: coincide en ${y(r.por)}. ¿Lo comparamos?`,
  (r,h)=>`No es por presumir mi memoria de chip, pero el px de ${h}${r.dx?' con '+r.dx:''} va por aquí: ${y(r.por)}.`,
  (r,h)=>`Esto me recordó al px de ${h}${r.dx?' ('+r.dx+')':''}. Se conectan por ${y(r.por)}; igual y te sirve para su nota.`];
const APUNTES=[
  (r,h,n)=>`Oye, ¿te acuerdas del px de ${h}${r.dx?' con '+r.dx:''}? Estos apuntes de «${n}» se relacionan por ${y(r.por)}.`,
  (r,h,n)=>`Leí «${n}» y me acordé del px de ${h}${r.dx?' ('+r.dx+')':''}: hablan de ${y(r.por)}. Como si lo hubieran escrito pensando en ese caso.`,
  (r,h,n)=>`«${n}» y tu px de ${h}${r.dx?' con '+r.dx:''} tienen cosas en común: ${y(r.por)}. Yo que tú le echaba un ojo a su expediente.`];
function dice(rs,tipo,nombre){const ahora=Date.now();
  // un mismo paciente se recuerda en la plática como mucho cada 30 min, salvo que salga por otras razones
  const nuevos=rs.filter(r=>{const v=dichos.get(r.id);return tipo==='apuntes'||!v||ahora-v.ts>30*60e3||r.por.some(p=>!v.por.includes(p));});
  if(!nuevos.length||!r0(nuevos))return;const r=nuevos[0];
  for(const x of nuevos)dichos.set(x.id,{ts:ahora,por:x.por});
  let txt=(tipo==='apuntes'?azar(APUNTES)(r,hace(r.hace),nombre):azar(PLATICA)(r,hace(r.hace)))+` (${quien(r)})`;
  if(nuevos[1])txt+=`\nY no es el único: también ${nuevos.slice(1).map(x=>'el px de '+hace(x.hace)+(x.dx?' ('+x.dx+')':'')+' · '+quien(x)).join(', ')}.`;
  const el=line('t asoc',txt);
  for(const x of nuevos){const b=document.createElement('button');b.className='op';b.textContent='🩺 abrir '+quien(x);b.onclick=()=>window.expAbrirPac?.(x.id);el.after(b);}
  window.log?.('🩺 relacioné '+(tipo==='apuntes'?'«'+nombre+'»':'la plática')+' con '+nuevos.length+' paciente(s)','y');}
const r0=a=>a[0]&&a[0].por?.length;
window.capriAsociaPac=t=>{const r=window.expRelacionados?.(t);if(r?.length)dice(r,'platica');};
// apuntes nuevos (Biblioteca o reservorio médico): si el expediente está cerrado, se esperan aquí (solo en la RAM) a que lo abras
const pend=[];
function revisaApuntes({nombre,texto}){const r=window.expRelacionados?.(texto,{max:80});
  if(r===null||r===undefined){if(pend.length<6)pend.push({nombre,texto:String(texto).slice(0,300000)});return;}
  if(r.length)dice(r,'apuntes',nombre);}
addEventListener('capri:apuntes',e=>revisaApuntes(e.detail||{}));
setInterval(()=>{if(!pend.length||window.expRelacionados?.('x')===null)return;for(const p of pend.splice(0))revisaApuntes(p);},20e3);
window.__asTest={dice,hace};
})();
