// ================= NOTAS CLÍNICAS (registro de entrenamiento) =================
// Un apartado para practicar historias clínicas y notas médicas con la estructura de la NOM-004-SSA3-2012 (Del expediente clínico).
// Es un REGISTRO DE ENTRENAMIENTO de Kiga como estudiante: no es un expediente clínico oficial y Capri no diagnostica.
// Los pacientes van con seudónimo/iniciales; todo se queda en este dispositivo (IndexedDB «capri-clinica») y se puede
// cifrar con una llave (AES-GCM, la llave nunca se guarda). A la IA solo le llega lo que Kiga pide revisar, y antes se tapan
// CURP, teléfonos, domicilios, números de expediente, nombres después de «paciente:/Sr./Sra.» y las palabras que él marque.
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const hoyISO=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
const horaAhora=()=>new Date().toTimeString().slice(0,5);
const fecha=ts=>new Date(ts).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
const NOM='NOM-004-SSA3-2012';

// ---------- estructura según la NOM-004 ----------
// campo: [clave, etiqueta, obligatorio, tipo]  tipo: t = texto largo (por defecto), i = una línea, sv = signos vitales
const SV=[['ta','TA (mmHg)'],['fc','FC (lpm)'],['fr','FR (rpm)'],['temp','Temp (°C)'],['spo2','SpO₂ (%)'],['peso','Peso (kg)'],['talla','Talla (m)']];
const HC=[
 ['Ficha de identificación','6.1.1',[['ocup','Ocupación',0,'i'],['escol','Escolaridad',0,'i'],['civil','Estado civil',0,'i'],['origen','Lugar de origen / residencia (solo municipio o estado, nunca domicilio)',0,'i'],['etnia','Grupo étnico (en su caso)',0,'i'],['interr','Tipo de interrogatorio (directo / indirecto e informante)',1,'i']]],
 ['Interrogatorio','6.1.1',[['motivo','Motivo de consulta',1],['ahf','Antecedentes heredofamiliares',1],['apnp','Antecedentes personales no patológicos',1],['tox','Tabaco, alcohol y otras sustancias psicoactivas (uso y dependencia)',1],['app','Antecedentes personales patológicos',1],['ago','Antecedentes gineco-obstétricos (si aplica)',0],['pa','Padecimiento actual',1],['ias','Interrogatorio por aparatos y sistemas',1]]],
 ['Exploración física','6.1.2',[['sv','Signos vitales, peso y talla',1,'sv'],['habitus','Habitus exterior',1],['cabeza','Cabeza',1],['cuello','Cuello',1],['torax','Tórax',1],['abdomen','Abdomen',1],['miembros','Miembros',1],['genitales','Genitales (si aplica)',0],['neuro','Neurológico / estado mental',0]]],
 ['Estudios','6.1.3',[['estudios','Resultados previos y actuales de laboratorio, gabinete y otros',0]]],
 ['Diagnóstico, pronóstico y tratamiento','6.1.4 – 6.1.6',[['dx','Diagnósticos o problemas clínicos',1],['pron','Pronóstico',1],['tx','Indicación terapéutica (medicamento, dosis, vía y periodicidad)',1]]],
];
const SVF=['sv','Signos vitales',1,'sv'],DX=['dx','Diagnósticos o problemas clínicos',1],PRON=['pron','Pronóstico',1],EST=['estudios','Resultados relevantes de estudios',0];
const NT={
 evolucion:['Nota de evolución (SOAP)','6.2',[['s','S · Evolución y actualización del cuadro clínico',1],SVF,['o','O · Exploración física relevante',1],EST,['a','A · Diagnósticos o problemas clínicos',1],PRON,['p','P · Tratamiento e indicaciones (dosis, vía y periodicidad)',1]]],
 urgencias:['Nota inicial de urgencias','7.1',[SVF,['motivo','Motivo de la atención',1],['interr','Resumen del interrogatorio',1],['ef','Exploración física y estado mental',1],EST,DX,['tx','Tratamiento',1],PRON]],
 ingreso:['Nota de ingreso hospitalario','8.1',[SVF,['interr','Resumen del interrogatorio',1],['ef','Exploración física',1],EST,DX,['tx','Tratamiento',1],PRON]],
 interconsulta:['Nota de interconsulta','6.3',[['motivo','Motivo de la interconsulta (servicio que la pide)',1],['crit','Criterios diagnósticos',1],['plan','Plan de estudios',1],['sug','Sugerencias diagnósticas y de tratamiento',1]]],
 referencia:['Nota de referencia / traslado','6.4',[['envia','Establecimiento que envía (tipo, sin datos del paciente)',1],['recibe','Establecimiento receptor',1],['motivo','Motivo de envío',1],['idx','Impresión diagnóstica',1],['ter','Terapéutica empleada, si la hubo',1]]],
 preoperatoria:['Nota preoperatoria','8.5',[['fcir','Fecha de la cirugía',1,'i'],DX,['planq','Plan quirúrgico',1],['tipo','Tipo de intervención quirúrgica',1],['riesgo','Riesgo quirúrgico',1],['cuid','Cuidados y plan terapéutico preoperatorios',1],PRON]],
 postoperatoria:['Nota postoperatoria','8.8',[['dxpre','Diagnóstico preoperatorio',1],['opplan','Operación planeada',1],['opreal','Operación realizada',1],['dxpost','Diagnóstico postoperatorio',1],['tecnica','Descripción de la técnica quirúrgica',1],['hallazgos','Hallazgos transoperatorios',1],['gasas','Reporte del conteo de gasas, compresas e instrumental',1],['incid','Incidentes y accidentes',1],['sangrado','Cuantificación de sangrado (y transfusiones)',1],['esttrans','Estudios de servicios auxiliares transoperatorios',0],['equipo','Equipo quirúrgico (solo roles: cirujano, ayudantes, anestesiólogo…)',1,'i'],['estado','Estado postquirúrgico inmediato',1],['manejo','Plan de manejo y tratamiento postoperatorio inmediato',1],PRON,['patol','Envío de piezas o biopsias a patología',1,'i']]],
 egreso:['Nota de egreso','8.9',[['fing','Fecha de ingreso / egreso',1,'i'],['motegr','Motivo del egreso',1],['dxf','Diagnósticos finales',1],['resumen','Resumen de la evolución y estado actual',1],['manejo','Manejo durante la estancia hospitalaria',1],['pend','Problemas clínicos pendientes',1],['plan','Plan de manejo y tratamiento',1],['recom','Recomendaciones para la vigilancia ambulatoria',1],['riesgo','Atención de factores de riesgo',0],PRON]],
 libre:['Nota libre de estudio','—',[['texto','Lo que quieras anotar del caso',1]]],
};
const SERV=['Consulta externa','Urgencias','Hospitalización','Quirófano','Simulación / caso de clase'];

// ---------- datos de identificación: nunca salen ----------
const PII=[
 ['CURP',/\b[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/gi],
 ['RFC',/\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/g],
 ['correo',/[\w.+-]+@[\w-]+\.[\w.]+/g],
 ['teléfono',/(?:\+?52[\s.-]?)?\(?\b\d{2,3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}\b/g],
 ['NSS o número largo',/\b\d{11,18}\b/g],
 ['domicilio',/\b(?:calle|avenida|av\.|col\.|colonia|fracc\.|fraccionamiento|manzana|mz\.|lote|lt\.|c\.\s?p\.|código postal)\s*[^\n,;]{0,40}/gi],
 ['fecha de nacimiento',/\b(?:naci[oó]|nacimiento|f\.\s?n\.)\s*(?:el\s*)?[:\-]?\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/gi],
 ['expediente o cama',/\b(?:expediente|exp\.|cama|folio|nss|afiliaci[oó]n|registro)\s*(?:n[uú]m\.?|no\.?)?\s*[:#]?\s*[A-Z0-9-]*\d[A-Z0-9-]*/gi],
 ['nombre',/\b(?:[Pp]aciente|[Pp]te\.?|[Ss]ra?\.?|[Ss]rta\.?|[Dd]on|[Dd]oña|[Nn]ombre|[Ss]e llama|[Hh]ij[oa] de|[Ee]spos[oa] de|[Mm]am[aá] de|[Pp]ap[aá] de)\s*:?\s+(?!(?:Masculino|Femenino|Masc|Fem|De|Del|Con|En|Que)\b)[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+(?:de\s+(?:la\s+)?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}/g],
];
function hallar(txt){const k=new Set();for(const [n,re] of PII){re.lastIndex=0;if(re.test(txt))k.add(n);}
  for(const w of cli?.ocultar||[])if(w&&txt.toLowerCase().includes(w.toLowerCase()))k.add('palabra que marcaste');return [...k];}
function anonimizar(txt,guarda=[]){let t=String(txt||'');const g=guarda.filter(Boolean);g.forEach((w,i)=>{t=t.split(w).join('\u0001'+i+'\u0001');});
  for(const w of cli?.ocultar||[])if(w)t=t.split(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi')).join('[oculto]');
  for(const [n,re] of PII){re.lastIndex=0;t=t.replace(re,n==='nombre'?m=>m.split(/\s+/)[0]+' [nombre]':'['+n.toUpperCase()+']');}
  return t.replace(/\u0001(\d+)\u0001/g,(_,i)=>g[i]);}
window.clinicaAnonimizar=anonimizar;

// ---------- guardado local, cifrable ----------
let cli=null,llave=null,sal=null,cifrado=false,lockT=0;
let dbp=null;
const idb=()=>dbp||(dbp=new Promise((res,rej)=>{const o=indexedDB.open('capri-clinica',1);o.onupgradeneeded=()=>o.result.createObjectStore('kv');o.onsuccess=()=>res(o.result);o.onerror=()=>rej(o.error);}));
const kv=async(mode,fn)=>{const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('kv',mode);const r=fn(t.objectStore('kv'));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});};
const enc=new TextEncoder(),dec=new TextDecoder();
const toB64=buf=>{const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode(...u.subarray(i,i+32768));return btoa(s);};
const fromB64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function derivar(pass,salt){const k=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function sellar(obj){const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},llave,enc.encode(JSON.stringify(obj)));return {enc:1,salt:toB64(sal),iv:toB64(iv),ct:toB64(ct)};}
async function abrirSello(rec,key){const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(rec.iv)},key,fromB64(rec.ct));return JSON.parse(dec.decode(pt));}
async function cargar(){const rec=await kv('readonly',s=>s.get('datos')).catch(()=>null);
  if(rec?.enc){cifrado=true;sal=fromB64(rec.salt);cli=null;}else{cifrado=false;cli=Object.assign({pacs:[],ocultar:[]},rec?.data||{});}}
async function guardar(){if(!cli)return;cli.upd=Date.now();
  const rec=cifrado&&llave?await sellar(cli):{enc:0,data:cli};await kv('readwrite',s=>s.put(rec,'datos'));}
async function desbloquear(pass){const rec=await kv('readonly',s=>s.get('datos'));if(!rec?.enc)return true;
  try{const k=await derivar(pass,fromB64(rec.salt));cli=Object.assign({pacs:[],ocultar:[]},await abrirSello(rec,k));llave=k;sal=fromB64(rec.salt);toque();return true;}catch(e){return false;}}
async function ponerLlave(pass){sal=crypto.getRandomValues(new Uint8Array(16));llave=await derivar(pass,sal);cifrado=true;await guardar();}
async function quitarLlave(){cifrado=false;llave=null;sal=null;await guardar();}
function bloquear(){if(!cifrado)return;cli=null;llave=null;vista={v:'lista'};if(modal.classList.contains('show'))render();pinta();}
const toque=()=>{lockT=Date.now();};
// se cierra sola a los 10 minutos sin tocarla
setInterval(()=>{if(cifrado&&llave&&Date.now()-lockT>10*60e3){bloquear();log('notas clínicas: bloqueadas por inactividad','g');}},30e3);

// ---------- ventana ----------
const css=document.createElement('style');css.textContent=`#cliModal .panel{max-width:900px}#cliModal h2{color:#5ef6ff;text-shadow:0 0 12px rgba(94,246,255,.4)}
#cliModal .mini{font:12px var(--mono);color:var(--ink);background:#000;border:1px solid #2a2733;padding:7px 10px;cursor:pointer}
#cliModal .mini:hover{border-color:#5ef6ff;color:#5ef6ff}#cliModal .mini.r:hover{border-color:#ff4d5e;color:#ff4d5e}#cliModal .mini:disabled{opacity:.35;cursor:default}
#cliModal .aviso{border:1px dashed #ff4d5e88;padding:8px 10px;font:12px/1.45 var(--mono);color:var(--yel)}
#cliModal .warn{font:12px/1.45 var(--mono);color:var(--yel)}#cliModal .ok{font:12px/1.45 var(--mono);color:var(--grn)}
#cliModal .acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#cliModal .sp{flex:1}
#cliModal .list{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto}
#cliModal .doc{cursor:pointer}#cliModal .doc .nm{color:#5ef6ff}#cliModal .doc .es{color:var(--mut);font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#cliModal textarea{border:1px solid #2a2733;padding:9px 11px;background:#000;color:var(--grn);font:13px/1.45 var(--mono);min-height:64px;resize:vertical}
#cliModal textarea:focus{outline:0;border-color:#5ef6ff}#cliModal label.req>span:first-child::after{content:' *';color:#ff4d5e}
#cliModal .sv{display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:6px}#cliModal .sv input{padding:7px 8px;font-size:13px}
#cliModal fieldset{border:1px solid #2a2733;padding:10px 12px;display:flex;flex-direction:column;gap:9px;margin:0}
#cliModal legend{color:var(--grn);font:700 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;padding:0 6px}#cliModal legend i{color:var(--mut);font-style:normal;font-weight:400;letter-spacing:0}
#cliModal .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
#cliModal .ia{border:1px solid #5ef6ff55;padding:10px 12px;font:13px/1.5 var(--mono);color:var(--ink);white-space:pre-wrap;max-height:340px;overflow-y:auto}
#cliModal .chk li{color:var(--yel)}#cliModal .chk{margin:0;padding-left:18px;font:12px/1.5 var(--mono)}`;document.head.appendChild(css);
const modal=document.createElement('div');modal.className='modal';modal.id='cliModal';
modal.innerHTML=`<div class="panel"><div><div class="acts"><h2>⚕ Notas clínicas</h2><span class="sp"></span><button class="mini" id="cliLock" title="Bloquear ahora">🔒</button><button class="mini" id="cliX">✕</button></div>
<div class="aviso">REGISTRO DE ENTRENAMIENTO · no es expediente clínico oficial (${NOM}). Usa seudónimo o iniciales, nunca nombre completo, CURP, domicilio ni teléfono. Capri te ayuda a estudiar y a revisar la estructura; no diagnostica ni indica tratamientos a pacientes reales.</div>
<div id="cliBody"></div></div></div>`;document.body.appendChild(modal);
modal.addEventListener('input',toque);modal.addEventListener('click',toque);
let vista={v:'lista'};
const $c=id=>modal.querySelector('#'+id);
const pacDe=id=>cli?.pacs.find(p=>p.id===id);

function campo(f,vals,pre){const [k,lab,req,tipo]=f,v=vals?.[k]??'';
  if(tipo==='sv')return `<div><label class="${req?'req':''}"><span>${esc(lab)}</span></label><div class="sv">${SV.map(([s,l])=>`<label><span>${l}</span><input data-k="sv_${s}" value="${esc(vals?.['sv_'+s]??'')}" inputmode="decimal"></label>`).join('')}</div><small id="${pre}imc"></small></div>`;
  if(tipo==='i')return `<label class="${req?'req':''}"><span>${esc(lab)}</span><input data-k="${k}" value="${esc(v)}"></label>`;
  return `<label class="${req?'req':''}"><span>${esc(lab)}</span><textarea data-k="${k}">${esc(v)}</textarea></label>`;}
// las de una línea van en rejilla para que la ficha no sea una tira larga
const grupo=(campos,vals)=>{const cortos=campos.filter(f=>f[3]==='i');return (cortos.length>1?`<div class="grid2">${cortos.map(f=>campo(f,vals,'e')).join('')}</div>`:'')+campos.filter(f=>cortos.length<2||f[3]!=='i').map(f=>campo(f,vals,'e')).join('');};
const lleno=(vals,f)=>f[3]==='sv'?['ta','fc','fr','temp'].every(s=>String(vals['sv_'+s]||'').trim()):!!String(vals[f[0]]||'').trim();
function faltan(campos,vals,extra){const out=campos.filter(f=>f[2]&&!lleno(vals,f)).map(f=>f[1]);return extra?extra.concat(out):out;}
const leer=root=>{const o={};root.querySelectorAll('[data-k]').forEach(e=>o[e.dataset.k]=e.value.trim());return o;};
function imc(root,pre){const p=parseFloat(root.querySelector('[data-k="sv_peso"]')?.value),t=parseFloat(root.querySelector('[data-k="sv_talla"]')?.value),el=$c(pre+'imc');
  if(!el)return;const tm=t>3?t/100:t;el.textContent=p>0&&tm>0?'IMC '+(p/(tm*tm)).toFixed(1)+' kg/m²':'';}
const svTxt=v=>SV.filter(([s])=>v['sv_'+s]).map(([s,l])=>l.split(' ')[0]+' '+v['sv_'+s]).join(' · ');

// ---------- texto plano (para exportar o para que Capri lo revise) ----------
function txtCampos(campos,v){return campos.map(f=>{const val=f[3]==='sv'?svTxt(v):v[f[0]];return val?f[1]+': '+val:null;}).filter(Boolean).join('\n');}
function txtPac(p,anon){return [`Paciente (seudónimo): ${p.alias}`+(anon?'':p.ini?' · iniciales '+p.ini:''),`Edad: ${p.edad||'¿?'} · Sexo: ${p.sexo||'¿?'} · Servicio: ${p.serv||'—'}`].join('\n');}
function txtHC(p){return HC.map(([t,ref,campos])=>{const s=txtCampos(campos,p.hc||{});return s?`== ${t} (${ref}) ==\n${s}`:'';}).filter(Boolean).join('\n\n');}
function txtNota(n){const T=NT[n.tipo];return `== ${T[0]} (${NOM} ${T[1]}) · ${n.fecha} ${n.hora} ==\n`+txtCampos(T[2],n.c);}

// ---------- vistas ----------
function render(){pinta();const B=$c('cliBody');$c('cliLock').style.display=cifrado&&cli?'':'none';
  if(!cli){B.innerHTML=`<h3>🔒 Bloqueado</h3><small>Tus notas clínicas están cifradas. Escribe tu llave para abrirlas.</small>
    <div class="acts"><input type="password" id="cliPass" placeholder="Tu llave" style="flex:1;min-width:160px"><button class="mini" id="cliOpen">Abrir</button></div><small class="warn" id="cliMsg"></small>`;
    const go=async()=>{const ok=await desbloquear($c('cliPass').value);$c('cliPass').value='';if(ok){vista={v:'lista'};render();}else $c('cliMsg').textContent='Esa no es la llave.';};
    $c('cliOpen').onclick=go;$c('cliPass').onkeydown=e=>{if(e.key==='Enter')go();};setTimeout(()=>$c('cliPass')?.focus(),50);return;}
  ({lista:vLista,pac:vPac,hc:vHC,nota:vNota,ajustes:vAjustes}[vista.v]||vLista)(B);}
function vLista(B){const ps=cli.pacs.slice().sort((a,b)=>(b.upd||b.ts)-(a.upd||a.ts));
  B.innerHTML=`<div class="acts"><h3 style="margin:0">Pacientes de entrenamiento (${ps.length})</h3><span class="sp"></span><input id="cliBus" placeholder="Buscar seudónimo o diagnóstico" style="min-width:180px;padding:7px 10px"></div>
   <div class="list" id="cliLs"></div>
   <fieldset><legend>Nuevo paciente <i>· solo seudónimo</i></legend><div class="grid2">
    <label class="req"><span>Seudónimo</span><input id="nAlias" placeholder="ej. Paciente Halcón, Caso 12"></label>
    <label><span>Iniciales (opcional)</span><input id="nIni" maxlength="5" placeholder="ej. J.L.M."></label>
    <label class="req"><span>Edad</span><input id="nEdad" placeholder="ej. 54 años"></label>
    <label class="req"><span>Sexo</span><select id="nSexo"><option>Femenino</option><option>Masculino</option><option>Intersexual</option><option>No especificado</option></select></label>
    <label><span>Servicio</span><select id="nServ">${SERV.map(s=>`<option>${s}</option>`).join('')}</select></label></div>
    <div class="acts"><span class="sp"></span><button class="mini" id="nAdd">+ Crear paciente</button></div><small class="warn" id="nMsg"></small></fieldset>
   <div class="acts"><button class="mini" id="cliAj">⚙ Privacidad y respaldo</button><span class="sp"></span><small>${cifrado?'🔒 Cifrado con tu llave':'⚠ Sin llave: pon una en «Privacidad»'}</small></div>`;
  const pinto=()=>{const q=$c('cliBus').value.toLowerCase();
    $c('cliLs').innerHTML=ps.filter(p=>!q||(p.alias+' '+(p.hc?.dx||'')+' '+p.notas.map(n=>n.c.a||n.c.dx||'').join(' ')).toLowerCase().includes(q))
      .map(p=>`<div class="doc" data-p="${p.id}"><span class="nm">${esc(p.alias)}</span><span class="es">${esc([p.edad,p.sexo,p.serv,(p.hc?.dx||'').slice(0,60)].filter(Boolean).join(' · '))}</span><span class="sz">${p.notas.length} nota(s)</span></div>`).join('')||'<small>Aún no hay pacientes. Crea el primero abajo.</small>';};
  pinto();$c('cliBus').oninput=pinto;
  $c('cliLs').onclick=e=>{const d=e.target.closest('[data-p]');if(d){vista={v:'pac',id:d.dataset.p};render();}};
  $c('cliAj').onclick=()=>{vista={v:'ajustes'};render();};
  $c('nAdd').onclick=async()=>{const alias=$c('nAlias').value.trim(),edad=$c('nEdad').value.trim();
    if(!alias||!edad)return $c('nMsg').textContent='Falta seudónimo o edad.';
    const raro=hallar(alias.replace(/^(paciente|caso|pte\.?)\s+/i,''));if(raro.length||/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(alias))
      if(!confirm('«'+alias+'» parece un nombre real. Para entrenamiento usa un seudónimo (ej. «Paciente Halcón»). ¿Guardarlo así de todos modos?'))return;
    const p={id:uid(),alias:alias.slice(0,60),ini:$c('nIni').value.trim().slice(0,8),edad,sexo:$c('nSexo').value,serv:$c('nServ').value,ts:Date.now(),hc:{},notas:[]};
    cli.pacs.push(p);await guardar();log('notas clínicas: paciente «'+p.alias+'»','y');vista={v:'pac',id:p.id};render();};}

function vPac(B){const p=pacDe(vista.id);if(!p){vista={v:'lista'};return render();}
  const fh=faltan(HC.flatMap(s=>s[2]),p.hc||{});
  B.innerHTML=`<div class="acts"><button class="mini" id="pBack">← Pacientes</button><span class="sp"></span><button class="mini r" id="pDel">Borrar paciente</button></div>
   <h3 style="margin:0">${esc(p.alias)}</h3><small>${esc(txtPac(p).replace('\n',' · '))} · desde ${fecha(p.ts)}</small>
   <fieldset><legend>Historia clínica <i>· ${NOM} 6.1</i></legend>
    <div class="${fh.length?'warn':'ok'}">${Object.keys(p.hc||{}).length?(fh.length?'Le faltan '+fh.length+' apartado(s) obligatorios.':'✓ Completa según la NOM-004.'):'Aún sin historia clínica.'}</div>
    <div class="acts"><button class="mini" id="pHC">${Object.keys(p.hc||{}).length?'✎ Abrir historia clínica':'+ Hacer historia clínica'}</button></div></fieldset>
   <fieldset><legend>Notas médicas</legend><div class="list" id="pNotas"></div>
    <div class="acts"><select id="pTipo" style="padding:7px 10px">${Object.entries(NT).map(([k,t])=>`<option value="${k}">${t[0]}</option>`).join('')}</select><button class="mini" id="pNueva">+ Nueva nota</button></div></fieldset>
   <fieldset><legend>Estudiar con Capri</legend><small>Capri ve solo el seudónimo, edad, sexo y lo clínico (se tapan datos de identificación).</small>
    <div class="acts"><button class="mini" id="pCaso">🎓 Estudiar este caso en el chat</button><button class="mini" id="pExp">⬇ Exportar (HTML)</button></div></fieldset>`;
  $c('pNotas').innerHTML=p.notas.slice().sort((a,b)=>(b.fecha+b.hora).localeCompare(a.fecha+a.hora)).map(n=>{const T=NT[n.tipo],f=faltan(T[2],n.c);
    return `<div class="doc" data-n="${n.id}"><span class="nm">${esc(T[0])}</span><span class="es">${esc(n.fecha+' '+n.hora+' · '+(n.c.a||n.c.dx||n.c.idx||n.c.dxpost||n.c.dxf||n.c.texto||'').slice(0,70))}</span><span class="sz">${f.length?'⚠ '+f.length:'✓'}</span></div>`;}).join('')||'<small>Sin notas todavía.</small>';
  $c('pBack').onclick=()=>{vista={v:'lista'};render();};
  $c('pHC').onclick=()=>{vista={v:'hc',id:p.id};render();};
  $c('pNueva').onclick=()=>{vista={v:'nota',id:p.id,tipo:$c('pTipo').value};render();};
  $c('pNotas').onclick=e=>{const d=e.target.closest('[data-n]');if(d){vista={v:'nota',id:p.id,nid:d.dataset.n};render();}};
  $c('pDel').onclick=async()=>{if(!confirm('¿Borrar a «'+p.alias+'» con su historia y '+p.notas.length+' nota(s)? No se puede deshacer (salvo con un respaldo).'))return;
    cli.pacs=cli.pacs.filter(x=>x!==p);await guardar();vista={v:'lista'};render();};
  $c('pExp').onclick=()=>exportarHTML(p);
  $c('pCaso').onclick=()=>estudiarCaso(p);}

// editor común de historia clínica y notas
function editor(B,{titulo,ref,secciones,vals,p,nota}){
  B.innerHTML=`<div class="acts"><button class="mini" id="eBack">← ${esc(p.alias)}</button><span class="sp"></span>${nota?.id&&cli.pacs.includes(p)&&p.notas.includes(nota)?'<button class="mini r" id="eDel">Borrar nota</button>':''}</div>
   <h3 style="margin:0">${esc(titulo)} <small style="color:var(--mut)">· ${NOM} ${ref}</small></h3>
   <small>${esc(txtPac(p).replace('\n',' · '))} · Elaboró: ${esc(cfg.name||'Kiga')} (estudiante, entrenamiento)</small>
   ${nota?`<div class="grid2"><label class="req"><span>Fecha</span><input type="date" id="eFecha" value="${esc(nota.fecha)}"></label><label class="req"><span>Hora</span><input type="time" id="eHora" value="${esc(nota.hora)}"></label></div>`:''}
   <div id="eForm">${secciones.map(([t,r,campos])=>`<fieldset><legend>${esc(t)}${r?` <i>· ${esc(r)}</i>`:''}</legend>${grupo(campos,vals)}</fieldset>`).join('')}</div>
   <small>* obligatorio según la NOM-004. Escribe en lenguaje técnico, sin abreviaturas ambiguas.</small>
   <fieldset><legend>Ayuda de Capri <i>· solo cuando tú la pides</i></legend>
    <label><span>Dicta o pega tus apuntes sueltos del caso y Capri los acomoda en los apartados vacíos</span><textarea id="eLibre" placeholder="ej. masc 54a, DM2 10a con metformina, acude por dolor en epigastrio de 6h irradiado a espalda, TA 100/60 FC 112…"></textarea></label>
    <div class="acts"><button class="mini" id="eEstr">⇢ Acomodar en apartados</button><button class="mini" id="eRev">🎓 Revisar como tutora (NOM-004)</button><span class="sp"></span><small id="eCer"></small></div>
    <ul class="chk" id="eChk"></ul><div class="ia" id="eIA" style="display:none"></div></fieldset>
   <small class="warn" id="eMsg"></small>
   <div class="acts"><span class="sp"></span><button class="btn" id="eSave">Guardar</button></div>`;
  const form=$c('eForm'),campos=secciones.flatMap(s=>s[2]);
  const chk=()=>{const f=faltan(campos,leer(form),nota&&(!$c('eFecha').value||!$c('eHora').value)?['Fecha y hora']:null);$c('eChk').innerHTML=f.map(x=>`<li>Falta: ${esc(x)}</li>`).join('')||'<li style="color:var(--grn);list-style:none">✓ Tiene todo lo obligatorio de la NOM-004</li>';return f;};
  form.oninput=()=>{imc(form,'e');chk();};imc(form,'e');chk();
  $c('eBack').onclick=()=>{vista={v:'pac',id:p.id};render();};
  if($c('eDel'))$c('eDel').onclick=async()=>{if(!confirm('¿Borrar esta nota?'))return;p.notas=p.notas.filter(x=>x!==nota);await guardar();vista={v:'pac',id:p.id};render();};
  $c('eSave').onclick=async()=>{const v=leer(form),raro=hallar(Object.values(v).join('\n'));
    if(raro.length&&!confirm('Parece que escribiste datos que identifican a alguien ('+raro.join(', ')+'). En un registro de entrenamiento mejor quítalos. A Capri no le llegan (se tapan), pero se guardarían aquí. ¿Guardar así?'))return;
    if(nota){nota.c=v;nota.fecha=$c('eFecha').value;nota.hora=$c('eHora').value;if(!p.notas.includes(nota))p.notas.push(nota);}else p.hc=v;
    p.upd=Date.now();await guardar();const f=chk();log('notas clínicas: guardado '+titulo,'y');
    $c('eMsg').textContent='Guardado'+(f.length?' · ojo: faltan '+f.length+' apartado(s) obligatorios':' ✓');};
  $c('eEstr').onclick=()=>estructurar(form,campos,$c('eLibre').value);
  $c('eRev').onclick=()=>{const v=leer(form);const texto=txtPac(p,true)+'\n\n'+(nota?txtNota({...nota,c:v,fecha:$c('eFecha').value,hora:$c('eHora').value}):txtHC({hc:v}));revisar(titulo,ref,texto,chk(),p.alias);};}
function vHC(B){const p=pacDe(vista.id);if(!p)return vLista(B);
  editor(B,{titulo:'Historia clínica',ref:'6.1',secciones:HC,vals:p.hc||{},p});}
function vNota(B){const p=pacDe(vista.id);if(!p)return vLista(B);
  let n=vista.nid&&p.notas.find(x=>x.id===vista.nid);
  if(!n){n={id:uid(),tipo:vista.tipo||'evolucion',fecha:hoyISO(),hora:horaAhora(),c:{},ts:Date.now()};vista.nid=n.id;vista.borrador=n;}
  if(vista.borrador?.id===n.id)n=vista.borrador;
  const T=NT[n.tipo];editor(B,{titulo:T[0],ref:T[1],secciones:[[T[0],'',T[2]]],vals:n.c,p,nota:n});}
function vAjustes(B){
  B.innerHTML=`<div class="acts"><button class="mini" id="aBack">← Pacientes</button></div>
   <fieldset><legend>Llave de cifrado</legend>
    <small>${cifrado?'🔒 Tus notas están cifradas en este dispositivo (AES-256). Se bloquean solas a los 10 min sin usarlas.':'⚠ Sin llave, tus notas se guardan sin cifrar en este dispositivo. Ponle una llave para que nadie que use tu PC o celular pueda leerlas.'}<br>Si olvidas la llave no hay forma de recuperar las notas: haz respaldos.</small>
    <div class="acts"><input type="password" id="aP1" placeholder="${cifrado?'Nueva llave':'Llave (mín. 6)'}" style="flex:1;min-width:140px"><input type="password" id="aP2" placeholder="Repítela" style="flex:1;min-width:140px"><button class="mini" id="aSet">${cifrado?'Cambiar llave':'Cifrar con esta llave'}</button>${cifrado?'<button class="mini r" id="aOff">Quitar cifrado</button>':''}</div><small class="warn" id="aMsg"></small></fieldset>
   <fieldset><legend>Palabras que nunca salen a la IA</legend>
    <small>Si en algún texto se te escapa un apellido, el nombre de un hospital o algo que no quieres que vea Capri, ponlo aquí (uno por línea). Se tapa antes de mandar cualquier cosa a Gemini, Claude o tu GPU.</small>
    <textarea id="aOc">${esc((cli.ocultar||[]).join('\n'))}</textarea><div class="acts"><span class="sp"></span><button class="mini" id="aOcS">Guardar lista</button></div></fieldset>
   <fieldset><legend>Respaldo</legend><small>Descarga un archivo con todos tus pacientes. ${cifrado?'Sale cifrado con tu llave.':'Sale SIN cifrar: guárdalo en un lugar seguro, o pon llave antes.'}</small>
    <div class="acts"><button class="mini" id="aExp">⬇ Descargar respaldo</button><button class="mini" id="aImp">⬆ Restaurar respaldo</button><input type="file" id="aFile" accept=".json,application/json" style="display:none"></div></fieldset>
   <fieldset><legend>Marco legal (resumen)</legend><small>Estructura basada en la ${NOM} «Del expediente clínico» (DOF 15/10/2012), que en 2026 sigue siendo la referencia. Los datos de salud son datos personales sensibles (Ley Federal de Protección de Datos Personales en Posesión de los Particulares, DOF 20/03/2025): por eso aquí solo seudónimos, todo local y cifrable. Un expediente real lo lleva la institución, con firma de quien lo elabora; esto es tu cuaderno de práctica.</small></fieldset>`;
  $c('aBack').onclick=()=>{vista={v:'lista'};render();};
  $c('aSet').onclick=async()=>{const a=$c('aP1').value,b=$c('aP2').value;if(a.length<6)return $c('aMsg').textContent='La llave necesita al menos 6 caracteres.';
    if(a!==b)return $c('aMsg').textContent='No coinciden.';await ponerLlave(a);$c('aP1').value=$c('aP2').value='';toque();render();line('s','(⚕ Notas clínicas cifradas con tu llave.)');};
  if($c('aOff'))$c('aOff').onclick=async()=>{if(!confirm('¿Quitar el cifrado? Tus notas quedarán legibles en este dispositivo.'))return;await quitarLlave();render();};
  $c('aOcS').onclick=async()=>{cli.ocultar=$c('aOc').value.split('\n').map(x=>x.trim()).filter(x=>x.length>1).slice(0,200);await guardar();$c('aMsg').textContent='';log('notas clínicas: lista de palabras ocultas guardada','g');};
  $c('aExp').onclick=exportarRespaldo;$c('aImp').onclick=()=>$c('aFile').click();
  $c('aFile').onchange=async()=>{const f=$c('aFile').files[0];$c('aFile').value='';if(f)await importar(f);};}

// ---------- ayuda de Capri (texto ya sin datos de identificación) ----------
const sinEstado=s=>clean(s).replace(/^\s*\[[a-z_]+\]\s*/i,'').trim();
async function pedirIA(prompt,out,boton){if(!cfg.key&&!window.cerebroInfo?.().ok){out.style.display='';out.textContent='Conecta tu API key de Google en ⚙ (o tu GPU con Ollama) para que Capri te ayude.';return null;}
  boton.disabled=true;out.style.display='';out.textContent='…';let raw='';
  try{const full=await ask([{text:prompt}],t=>{raw+=t;out.textContent=sinEstado(raw);out.scrollTop=1e9;});out.textContent=sinEstado(full);window.saberCerteza?.(full,$c('eCer'));return full;}
  catch(e){out.textContent='No pude: '+(e.message==='NOKEY'?'falta tu API key en ⚙':e.status===429?'sin cupo de Google, espera un poco':String(e.message).slice(0,120));return null;}
  finally{boton.disabled=false;}}
function revisar(titulo,ref,texto,falt,alias){const n=cfg.name||'Kiga';
  pedirIA(`(MODO TUTORA CLÍNICA. ${n} es estudiante de medicina en México y practica en su registro de entrenamiento. Te pasa una ${titulo} (${NOM}, ${ref}); los datos de identificación ya vienen tapados.
Revísala como tutora exigente pero con tu estilo, en texto plano y con guiones, corto:
1) Estructura: qué falta u está incompleto según la ${NOM}. La revisión automática encontró: ${falt.length?falt.join('; '):'nada obligatorio vacío'}.
2) Coherencia clínica: que signos vitales, hallazgos, diagnósticos y plan cuadren; en medicamentos revisa dosis, vía y periodicidad (marca si algo se ve fuera de rango y di que lo verifique en su fuente).
3) Redacción: lenguaje técnico, abreviaturas ambiguas, datos subjetivos vs objetivos.
4) Para estudiar: 2 o 3 diagnósticos diferenciales a repasar y qué dato los distingue.
No das un diagnóstico definitivo ni indicaciones para un paciente real; si algo sugiere urgencia, dilo primero. Si no estás segura de algo, dilo. Termina con <<certeza: alta|media|baja | fuente principal>>.)

${anonimizar(texto,[alias])}`,$c('eIA'),$c('eRev'));}
async function estructurar(form,campos,libre){libre=libre.trim();if(!libre)return $c('eLibre').focus();
  const vacios=campos.filter(f=>!lleno(leer(form),f));if(!vacios.length)return $c('eMsg').textContent='No hay apartados vacíos que llenar.';
  const claves=vacios.flatMap(f=>f[3]==='sv'?SV.map(([s,l])=>`"sv_${s}": ${l}`):[`"${f[0]}": ${f[1]}`]).join('\n');
  const full=await pedirIA(`(Acomoda estos apuntes de un caso de ENTRENAMIENTO en los apartados de una nota médica mexicana (${NOM}). Responde SOLO con un objeto JSON, sin texto antes ni después, con estas claves cuando la información venga en los apuntes:
${claves}
Reglas: usa solo lo que dicen los apuntes, en lenguaje técnico y sin abreviaturas ambiguas (desarrolla las de los apuntes); si algo no viene, omite la clave; no inventes datos, diagnósticos ni dosis. En signos vitales pon solo el número.)

APUNTES:
${anonimizar(libre)}`,$c('eIA'),$c('eEstr'));
  if(!full)return;const m=full.match(/\{[\s\S]*\}/);let j=null;try{j=JSON.parse(m[0]);}catch(e){}
  if(!j)return $c('eMsg').textContent='Capri no devolvió los apartados en orden; intenta otra vez.';
  let n=0;for(const [k,v] of Object.entries(j)){const el=form.querySelector(`[data-k="${CSS.escape(k)}"]`);if(el&&!el.value.trim()&&v){el.value=String(v);n++;}}
  $c('eIA').textContent='Listo: llené '+n+' apartado(s). Revísalos y corrige lo que haga falta antes de guardar; lo que no venía en tus apuntes quedó vacío.';form.oninput();}
function estudiarCaso(p){const n=cfg.name||'Kiga';modal.classList.remove('show');
  if(busy)return line('s','(Espera a que Capri termine y vuelve a intentarlo.)');
  const caso=anonimizar(txtPac(p,true)+'\n\n'+txtHC(p)+'\n\n'+p.notas.slice(-3).map(txtNota).join('\n\n'),[p.alias]).slice(0,7000);
  line('u','🎓 Estudiar caso: '+p.alias);
  respond(`(Caso clínico de ENTRENAMIENTO de ${n} (estudiante de medicina), con seudónimo y sin datos de identificación. Sé su tutora: 1) pregúntale primero cuál es su impresión diagnóstica y por qué, 2) luego hazle 3 a 5 preguntas tipo examen sobre el caso (fisiopatología, diferenciales, estudios, manejo según guías mexicanas), una a la vez, 3) corrige con fuentes y certeza. No es un paciente al que vayas a tratar: es para que aprenda.)\n\n${caso}`,null,'user');}

// ---------- exportar / respaldo ----------
function bajar(nombre,contenido,tipo){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([contenido],{type:tipo}));a.download=nombre;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
function exportarHTML(p){const sec=(t,txt)=>txt?`<h2>${esc(t)}</h2><pre>${esc(txt)}</pre>`:'';
  const html=`<!doctype html><html lang="es"><meta charset="utf-8"><title>${esc(p.alias)} · registro de entrenamiento</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#111}h1{font-size:20px}h2{font-size:15px;margin-top:22px;border-bottom:1px solid #ccc}pre{white-space:pre-wrap;font:inherit}.av{border:2px dashed #c00;padding:8px 12px;color:#900}</style>
<div class="av">REGISTRO DE ENTRENAMIENTO ACADÉMICO · NO ES EXPEDIENTE CLÍNICO OFICIAL. Estructura basada en la ${NOM}. Datos seudonimizados.</div>
<h1>${esc(p.alias)}</h1><pre>${esc(txtPac(p))}\nElaboró: ${esc(cfg.name||'Kiga')} (estudiante)</pre>
${sec('Historia clínica',txtHC(p))}${p.notas.slice().sort((a,b)=>(a.fecha+a.hora).localeCompare(b.fecha+b.hora)).map(n=>sec(NT[n.tipo][0]+' · '+n.fecha+' '+n.hora,txtCampos(NT[n.tipo][2],n.c))).join('')}</html>`;
  bajar('entrenamiento-'+p.alias.replace(/[^\wáéíóúñ-]+/gi,'_')+'.html',html,'text/html');}
async function exportarRespaldo(){const datos=cifrado&&llave?await sellar(cli):{enc:0,data:cli};
  bajar('capri-notas-clinicas-'+hoyISO()+'.json',JSON.stringify({tipo:'capri-clinica',version:1,fecha:new Date().toISOString(),datos}),'application/json');log('notas clínicas: respaldo descargado','g');}
async function importar(file){try{const d=JSON.parse(await file.text());if(d.tipo!=='capri-clinica')throw 0;let otro=d.datos.data;
    if(d.datos.enc){const pass=prompt('Ese respaldo está cifrado. Escribe la llave con la que se hizo:');if(!pass)return;
      try{otro=await abrirSello(d.datos,await derivar(pass,fromB64(d.datos.salt)));}catch(e){return alert('Esa no es la llave de ese respaldo.');}}
    let n=0;for(const p of otro.pacs||[]){const ya=cli.pacs.find(x=>x.id===p.id);
      if(!ya){cli.pacs.push(p);n++;}else{for(const nt of p.notas||[])if(!ya.notas.some(x=>x.id===nt.id)){ya.notas.push(nt);n++;}if(!Object.keys(ya.hc||{}).length)ya.hc=p.hc;}}
    cli.ocultar=[...new Set([...(cli.ocultar||[]),...(otro.ocultar||[])])];await guardar();alert('Respaldo restaurado: '+n+' paciente(s) o nota(s) nuevas.');vista={v:'lista'};render();}
  catch(e){alert('Ese archivo no es un respaldo de notas clínicas de Capri.');}}

// ---------- abrir / cerrar ----------
$c('cliX').onclick=()=>modal.classList.remove('show');$c('cliLock').onclick=bloquear;
async function openClinica(){if(cli===null&&!cifrado)await cargar();toque();render();modal.classList.add('show');}
window.openClinica=openClinica;
window.clinicaInfo=()=>({pacs:cli?cli.pacs.length:null,notas:cli?cli.pacs.reduce((s,p)=>s+p.notas.length,0):null,cifrado,abierto:!!cli});

// la plática normal: Capri sabe que existe el apartado, pero no ve las notas
const _personality=personality;
personality=(name,study)=>_personality(name,study)+`\n\nNOTAS CLÍNICAS: ${name} tiene un apartado «Notas clínicas» (comando «clínica») para practicar historias clínicas y notas con la ${NOM}, con pacientes de entrenamiento con seudónimo. Tú no ves esas notas salvo que él te pase un caso. Si en el chat te da nombre completo, CURP, domicilio o teléfono de un paciente, no los repitas y recuérdale en una frase usar seudónimo. Nunca das un diagnóstico ni tratamiento para un paciente real: le enseñas a razonarlo.`;

const _send=send;
send=async v=>{const t=(v||'').trim(),k=t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  if(/^(clinica|notas clinicas|pacientes|historia clinica)$/.test(k)&&!busy){line('u',t);openClinica();return;}
  await _send(v);
  if(k==='help')line('t','  clínica — notas clínicas y pacientes de entrenamiento (NOM-004)');};

// botón en el dock, junto a MÉDICO
const b=document.createElement('button');b.className='btn';b.id='bClinica';b.title='Notas clínicas (registro de entrenamiento)';
b.innerHTML='<span class="gl"><svg class="ci" viewBox="0 0 24 24" aria-hidden="true"><path class="k" d="M6 4 H15 L19 8 V20 H6 Z M15 4 V8 H19"/><path class="a" d="M11.2 10 H13.8 V12.2 H16 V14.8 H13.8 V17 H11.2 V14.8 H9 V12.2 H11.2 Z"/></svg></span><span class="tx">CLÍNICA</span>';
($('bMed')||$('bStudy')).after(b);b.onclick=openClinica;
function pinta(){b.classList.toggle('act',modal.classList.contains('show'));}
cargar().catch(()=>{cli={pacs:[],ocultar:[]};});
})();
