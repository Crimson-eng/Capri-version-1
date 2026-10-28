// ================= EXPEDIENTE CLÍNICO (personas reales) =================
// Pestaña EXPEDIENTE del HUD. Kiga le da los datos (escritos, pegados o dictados) y Capri los acomoda en los documentos de la
// NOM-004-SSA3-2012 «Del expediente clínico» (DOF 15/10/2012, vigente): historia clínica, notas de evolución, urgencias, ingreso,
// interconsulta, referencia, pre y postoperatoria, egreso, cartas de consentimiento, egreso voluntario y aviso al MP.
// Para no cometer errores: la estructura sale del texto de la norma (cada campo lleva su numeral), Capri solo acomoda lo que
// Kiga dijo (no inventa; lo que falta queda vacío y se señala), las cifras que Capri ponga se comparan contra el texto original,
// se marcan abreviaturas (5.11), signos vitales fuera de rango y medicamentos sin dosis, vía o periodicidad (6.2.6).
// Privacidad (LFPDPPP 2025, datos sensibles; NOM-004 5.5): todo vive cifrado en este dispositivo (IndexedDB «capri-expediente»,
// AES-GCM con una llave que nunca se guarda), se cierra solo, lleva bitácora de accesos y nunca entra a la memoria ni a las
// pláticas de Capri. Para acomodar el texto usa primero el cerebro de tu GPU (nada sale de la PC); si no hay, Gemini solo con
// tu permiso y con nombre, CURP, domicilio, teléfonos y demás identificadores tapados antes de salir.
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const hoyISO=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
const horaAhora=()=>new Date().toTimeString().slice(0,5);
const NOM='NOM-004-SSA3-2012';
const fechaL=f=>f?new Date(f+'T12:00').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}):'';

// ---------- estructura, según el texto de la norma ----------
// campo: [clave, etiqueta, obligatorio, tipo, numeral]   tipo: t texto largo · i una línea · sv signos vitales · d fecha · h hora
const SV=[['temp','Temperatura (°C)'],['ta','Tensión arterial (mmHg)'],['fc','Frecuencia cardiaca (lpm)'],['fr','Frecuencia respiratoria (rpm)'],['spo2','Saturación de oxígeno (%)'],['peso','Peso (kg)'],['talla','Talla (m)']];
const SVmin=['temp','ta','fc','fr'];
const sv=(n,req,peso)=>['sv','Signos vitales'+(peso?', peso y talla':''),req,'sv',n,peso];
const HC=[
 ['Interrogatorio','6.1.1',[['interr','Tipo de interrogatorio (directo o indirecto) e informante',1,'i','6.1.1'],['etnia','Grupo étnico, en su caso',0,'i','6.1.1'],
  ['ahf','Antecedentes heredo-familiares',1,'t','6.1.1'],['app','Antecedentes personales patológicos',1,'t','6.1.1'],
  ['tox','Uso y dependencia de tabaco, alcohol y otras sustancias psicoactivas',1,'t','6.1.1'],['apnp','Antecedentes personales no patológicos',1,'t','6.1.1'],
  ['ago','Antecedentes gineco-obstétricos (si aplica)',0,'t','6.1.1'],['pa','Padecimiento actual (incluye tratamientos previos convencionales, alternativos y tradicionales)',1,'t','6.1.1'],
  ['ias','Interrogatorio por aparatos y sistemas',1,'t','6.1.1']]],
 ['Exploración física','6.1.2',[['habitus','Habitus exterior',1,'t','6.1.2'],sv('6.1.2',1,1),['cabeza','Cabeza',1,'t','6.1.2'],['cuello','Cuello',1,'t','6.1.2'],
  ['torax','Tórax',1,'t','6.1.2'],['abdomen','Abdomen',1,'t','6.1.2'],['miembros','Miembros',1,'t','6.1.2'],['genitales','Genitales (si no se exploraron, anota el motivo)',1,'t','6.1.2'],
  ['otra','Otra exploración (neurológica, estado mental, especialidad)',0,'t','6.1.2']]],
 ['Estudios','6.1.3',[['estudios','Resultados previos y actuales de laboratorio, gabinete y otros (si no hay, anótalo)',1,'t','6.1.3']]],
 ['Diagnóstico, pronóstico e indicación terapéutica','6.1.4 – 6.1.6',[['dx','Diagnósticos o problemas clínicos',1,'t','6.1.4'],['pron','Pronóstico',1,'t','6.1.5'],
  ['tx','Indicación terapéutica (medicamento, dosis, vía de administración y periodicidad)',1,'t','6.1.6']]],
];
const DX=n=>['dx','Diagnósticos o problemas clínicos',1,'t',n],PRON=n=>['pron','Pronóstico',1,'t',n];
const ELAB=['Notas · 5.10','5.10'];
// [nombre, numeral, campos, nota de la norma]
const DOCS={
 hc:['Historia clínica','6.1',null,'La elabora el personal médico, con los apartados en el orden de la norma.'],
 evolucion:['Nota de evolución','6.2 / 7.2 / 8.3',[['s','Evolución y actualización del cuadro clínico (incluye tabaco, alcohol y otras sustancias, en su caso)',1,'t','6.2.1'],sv('6.2.2',0),
  ['estudios','Resultados relevantes de estudios solicitados previamente',0,'t','6.2.3'],DX('6.2.4'),PRON('6.2.5'),
  ['tx','Tratamiento e indicaciones médicas (medicamentos: dosis, vía de administración y periodicidad)',1,'t','6.2.6']],'Cada vez que se atiende al paciente; en hospitalización, cuando menos una vez por día (8.3).'],
 urgencias:['Nota inicial de urgencias','7.1',[sv('7.1.2',1),['motivo','Motivo de la atención',1,'t','7.1.3'],['resumen','Resumen del interrogatorio, exploración física y estado mental, en su caso',1,'t','7.1.4'],
  ['estudios','Resultados relevantes de estudios solicitados previamente',0,'t','7.1.5'],DX('7.1.6'),['tx','Tratamiento (medicamentos: dosis, vía y periodicidad)',1,'t','7.1.7'],PRON('7.1.7')],'Fecha y hora en que se otorga el servicio (7.1.1) van en el encabezado.'],
 ingreso:['Nota de ingreso hospitalario','8.1',[sv('8.1.1',1),['resumen','Resumen del interrogatorio, exploración física y estado mental, en su caso',1,'t','8.1.2'],
  ['estudios','Resultados de estudios de los servicios auxiliares de diagnóstico y tratamiento',1,'t','8.1.3'],['dx','Diagnósticos o problemas clínicos (recomendado)',0,'t','—'],
  ['tx','Tratamiento (medicamentos: dosis, vía y periodicidad)',1,'t','8.1.4'],PRON('8.1.4')],'La elabora el médico que ingresa al paciente.'],
 interconsulta:['Nota de interconsulta','6.3',[['solicita','Servicio y médico que solicita; motivo de la interconsulta',1,'t','6.3 / 7.2.1'],sv('6.3.4 → 7.1.2',1),
  ['resumen','Resumen del interrogatorio, exploración física y estado mental',1,'t','6.3.4 → 7.1.4'],['estudios','Resultados relevantes de estudios',0,'t','6.3.4 → 7.1.5'],
  ['crit','Criterios diagnósticos',1,'t','6.3.1'],['plan','Plan de estudios',1,'t','6.3.2'],['sug','Sugerencias diagnósticas y de tratamiento',1,'t','6.3.3'],PRON('6.3.4 → 7.1.7')],'La solicitud la hace el médico tratante; la nota, el médico consultado.'],
 referencia:['Nota de referencia / traslado','6.4',[['envia','Establecimiento que envía',1,'i','6.4.1'],['recibe','Establecimiento receptor',1,'i','6.4.2'],
  ['motivo','Motivo de envío',1,'t','6.4.3.1'],['idx','Impresión diagnóstica (incluye tabaco, alcohol y otras sustancias)',1,'t','6.4.3.2'],['ter','Terapéutica empleada, si la hubo',1,'t','6.4.3.3']],'Anexar copia del resumen clínico con que se envía al paciente.'],
 preoperatoria:['Nota preoperatoria','8.5',[['fcir','Fecha de la cirugía',1,'d','8.5.1'],['dx','Diagnóstico',1,'t','8.5.2'],['planq','Plan quirúrgico',1,'t','8.5.3'],
  ['tipo','Tipo de intervención quirúrgica',1,'t','8.5.4'],['riesgo','Riesgo quirúrgico',1,'t','8.5.5'],['cuid','Cuidados y plan terapéutico preoperatorios',1,'t','8.5.6'],PRON('8.5.7')],'La elabora el cirujano que va a intervenir. La valoración preanestésica va según la NOM-006-SSA3-2011 (8.7).'],
 postoperatoria:['Nota postoperatoria','8.8',[['dxpre','Diagnóstico preoperatorio',1,'t','8.8.1'],['opplan','Operación planeada',1,'t','8.8.2'],['opreal','Operación realizada',1,'t','8.8.3'],
  ['dxpost','Diagnóstico postoperatorio',1,'t','8.8.4'],['tecnica','Descripción de la técnica quirúrgica',1,'t','8.8.5'],['hallazgos','Hallazgos transoperatorios',1,'t','8.8.6'],
  ['gasas','Reporte del conteo de gasas, compresas y de instrumental quirúrgico',1,'t','8.8.7'],['incid','Incidentes y accidentes',1,'t','8.8.8'],
  ['sangrado','Cuantificación de sangrado, si lo hubo, y en su caso transfusiones',1,'t','8.8.9'],['esttrans','Estudios de servicios auxiliares transoperatorios',0,'t','8.8.10'],
  ['equipo','Ayudantes, instrumentistas, anestesiólogo y circulante',1,'t','8.8.11'],['estado','Estado post-quirúrgico inmediato',1,'t','8.8.12'],
  ['plan','Plan de manejo y tratamiento postoperatorio inmediato',1,'t','8.8.13'],PRON('8.8.14'),['piezas','Envío de piezas o biopsias para examen macroscópico e histopatológico',1,'t','8.8.15'],
  ['otros','Otros hallazgos de importancia para el paciente',0,'t','8.8.16'],['responsable','Nombre completo del responsable de la cirugía',1,'i','8.8.17']],'La elabora el cirujano que intervino, al término de la cirugía.'],
 egreso:['Nota de egreso','8.9',[['fing','Fecha de ingreso',1,'d','8.9.1'],['fegr','Fecha de egreso',1,'d','8.9.1'],['motegr','Motivo del egreso',1,'t','8.9.2'],['dxf','Diagnósticos finales',1,'t','8.9.3'],
  ['resumen','Resumen de la evolución y el estado actual',1,'t','8.9.4'],['manejo','Manejo durante la estancia hospitalaria',1,'t','8.9.5'],['pend','Problemas clínicos pendientes',1,'t','8.9.6'],
  ['plan','Plan de manejo y tratamiento',1,'t','8.9.7'],['recom','Recomendaciones para la vigilancia ambulatoria',1,'t','8.9.8'],
  ['riesgo','Atención de factores de riesgo (incluye tabaco, alcohol y otras sustancias)',1,'t','8.9.9'],PRON('8.9.10'),
  ['defuncion','En caso de defunción: causas según el certificado y si se solicitó/realizó necropsia',0,'t','8.9.11']],''],
 consentimiento:['Carta de consentimiento bajo información','10.1',[['titulo','Título del documento',1,'i','10.1.1.3'],['lugar','Lugar en que se emite',1,'i','10.1.1.4'],
  ['acto','Acto autorizado',1,'t','10.1.1.5'],['riesgos','Riesgos y beneficios esperados del acto médico autorizado',1,'t','10.1.1.6'],
  ['contingencias','Autorización para atender contingencias y urgencias derivadas del acto autorizado',1,'t','10.1.1.7'],
  ['paciente','Nombre completo de quien otorga (paciente o, si no puede, familiar más cercano, tutor o representante legal y su vínculo)',1,'i','10.1.1.8'],
  ['medico','Nombre completo del médico que informa y recaba el consentimiento',1,'i','10.1.1.9'],['testigos','Nombre completo de dos testigos',1,'t','10.1.1.10']],
  'Obligatoria al menos en: ingreso hospitalario, cirugía mayor, anestesia general o regional, salpingoclasia y vasectomía, donación y trasplante, investigación, necropsia, procedimientos de alto riesgo y cualquiera que entrañe mutilación (10.1.2). Las firmas son autógrafas: imprímela.'],
 voluntario:['Hoja de egreso voluntario','10.2',[['hegr','Hora del egreso',1,'h','10.2.3.2'],['solicita','Quién solicita el egreso: nombre completo, edad y parentesco',1,'t','10.2.3.3'],
  ['resumen','Resumen clínico: motivo, impresión diagnóstica y terapéutica empleada',1,'t','10.2.3.4 → 6.4.3'],['medidas','Medidas recomendadas para la protección de la salud y atención de factores de riesgo',1,'t','10.2.3.5'],
  ['responsiva','Médico que otorga la responsiva, en su caso',0,'i','10.2.3.6'],['testigos','Nombre completo de dos testigos',1,'t','10.2.3.8']],'Lleva firmas autógrafas de quien solicita, del médico y de dos testigos: imprímela.'],
 mp:['Hoja de notificación al Ministerio Público','10.3',[['acto','Acto notificado',1,'t','10.3.4'],['lesiones','Reporte de lesiones del paciente, en su caso',0,'t','10.3.5'],
  ['agencia','Agencia del Ministerio Público a la que se notifica',1,'i','10.3.6']],'Cuando la atención se relaciona con hechos probablemente constitutivos de delito.'],
};
const ORDEN=['hc','evolucion','urgencias','ingreso','interconsulta','referencia','preoperatoria','postoperatoria','egreso','consentimiento','voluntario','mp'];
const camposDe=t=>t==='hc'?HC.flatMap(g=>g[2]):DOCS[t][2];
// ficha de identificación del paciente (5.9: nombre completo, edad, sexo y, en su caso, número de cama o expediente)
const FICHA=[['nombre','Nombre(s)',1],['ap1','Primer apellido',1],['ap2','Segundo apellido',0],['fnac','Fecha de nacimiento',1,'d'],['sexo','Sexo',1,'s'],['nexp','Número de expediente',1],
 ['curp','CURP',0],['domicilio','Domicilio',0],['tel','Teléfono',0],['ocup','Ocupación',0],['escol','Escolaridad',0],['civil','Estado civil',0],['origen','Lugar de origen y residencia',0],
 ['etnia','Grupo étnico / lengua indígena, en su caso',0],['afil','Derechohabiencia (IMSS, ISSSTE, IMSS-Bienestar, privada…)',0],['sangre','Grupo y Rh',0],['alergias','Alergias',0],['resp','Familiar responsable o tutor y teléfono',0]];

// ---------- revisión sin IA: lo que falta y lo que puede ser error ----------
const lleno=(v,f)=>f[3]==='sv'?SVmin.concat(f[5]?['peso','talla']:[]).every(s=>String(v['sv_'+s]||'').trim()):!!String(v[f[0]]||'').trim();
const faltan=(campos,v)=>campos.filter(f=>f[2]&&!lleno(v,f)).map(f=>f[1]+' ('+f[4]+')');
// 5.11: lenguaje técnico-médico, sin abreviaturas. Las que tienen un solo significado se pueden expandir solas; las otras se preguntan.
const ABR={HTA:'hipertensión arterial sistémica',HAS:'hipertensión arterial sistémica',DM2:'diabetes mellitus tipo 2',DMT2:'diabetes mellitus tipo 2',DM1:'diabetes mellitus tipo 1',IAM:'infarto agudo de miocardio',
 EVC:'enfermedad vascular cerebral',ERC:'enfermedad renal crónica',IRC:'insuficiencia renal crónica',IVU:'infección de vías urinarias',EPOC:'enfermedad pulmonar obstructiva crónica',ICC:'insuficiencia cardiaca congestiva',
 TEP:'tromboembolia pulmonar',TVP:'trombosis venosa profunda',ERGE:'enfermedad por reflujo gastroesofágico',EDA:'enfermedad diarreica aguda',TCE:'traumatismo craneoencefálico',
 Dx:'diagnóstico',Tx:'tratamiento',Pte:'paciente',Hx:'historia',Qx:'quirúrgico',TAC:'tomografía axial computarizada',USG:'ultrasonido',BH:'biometría hemática',QS:'química sanguínea',
 EGO:'examen general de orina',PFH:'pruebas de función hepática',ECG:'electrocardiograma',EKG:'electrocardiograma',VO:'vía oral',IV:'vía intravenosa',IM:'vía intramuscular',SC:'vía subcutánea',SL:'vía sublingual',
 PRN:'por razón necesaria',QD:'una vez al día',BID:'dos veces al día',TID:'tres veces al día',QID:'cuatro veces al día',AHF:'antecedentes heredo-familiares',APP:'antecedentes personales patológicos',
 APNP:'antecedentes personales no patológicos',AGO:'antecedentes gineco-obstétricos',IAS:'interrogatorio por aparatos y sistemas',EF:'exploración física',SV:'signos vitales',TA:'tensión arterial',
 FC:'frecuencia cardiaca',FR:'frecuencia respiratoria',SatO2:'saturación de oxígeno',SpO2:'saturación de oxígeno',RsCs:'ruidos cardiacos',CsPs:'campos pulmonares',RHA:'ruidos hidroaéreos',
 MsTs:'miembros torácicos',MsPs:'miembros pélvicos',Edo:'estado',Gral:'general',Abd:'abdomen',Ant:'antecedentes',Hb:'hemoglobina',Hto:'hematocrito',Plaq:'plaquetas',Leu:'leucocitos',
 Cr:'creatinina',NUP:'nitrógeno ureico',NPT:'nutrición parenteral total',SNG:'sonda nasogástrica',SNC:'sistema nervioso central',GCS:'escala de coma de Glasgow',
 's/d':'sin datos','s/a':'sin alteraciones','S/D':'sin datos','S/A':'sin alteraciones'};
const DUDOSAS={Px:'pronóstico · paciente',Rx:'radiografía · receta',PA:'padecimiento actual · presión arterial',IRA:'insuficiencia renal aguda · infección respiratoria aguda',
 FA:'fibrilación auricular · fosfatasa alcalina',EA:'enfermedad actual · efecto adverso',PO:'postoperatorio · por vía oral','c/':'cada · con','s/':'sin · sobre',NL:'normal · nivel',IR:'insuficiencia renal · insuficiencia respiratoria'};
const reAbr=k=>new RegExp((/^\w/.test(k)?'(^|[^\\wáéíóúñÁÉÍÓÚÑ/])':'(^|\\s)')+k.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')+(/\w$/.test(k)?'(?![\\wáéíóúñ])':''),'g');
function abreviaturas(txt){const s=String(txt||''),out=[];for(const k of Object.keys(ABR))if(reAbr(k).test(s))out.push([k,ABR[k],0]);
  for(const k of Object.keys(DUDOSAS))if(reAbr(k).test(s))out.push([k,DUDOSAS[k],1]);return out;}
const expandir=txt=>Object.keys(ABR).sort((a,b)=>b.length-a.length).reduce((s,k)=>s.replace(reAbr(k),(m,p)=>p+ABR[k]),String(txt||''));
// signos vitales fuera de lo posible: casi siempre son errores de dedo
function revisaSV(v){const w=[],n=k=>parseFloat(String(v['sv_'+k]||'').replace(',','.'));
  const ta=String(v.sv_ta||'').match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/);
  if(v.sv_ta&&!ta)w.push('Tensión arterial: escríbela como sistólica/diastólica, ej. 120/80.');
  if(ta&&(+ta[1]<50||+ta[1]>260||+ta[2]<20||+ta[2]>160||+ta[2]>=+ta[1]))w.push('Tensión arterial '+v.sv_ta+' fuera de lo esperable: ¿error de captura?');
  const R={temp:[30,44,'Temperatura'],fc:[20,250,'Frecuencia cardiaca'],fr:[4,70,'Frecuencia respiratoria'],spo2:[40,100,'Saturación'],peso:[.3,350,'Peso'],talla:[.25,2.5,'Talla']};
  for(const [k,[a,b,l]] of Object.entries(R)){let x=n(k);if(isNaN(x))continue;if(k==='talla'&&x>3)x/=100;if(x<a||x>b)w.push(l+' '+v['sv_'+k]+' fuera de rango: ¿error de captura?');}
  return w;}
// 6.2.6: cada medicamento con dosis, vía de administración y periodicidad
const VIA=/\b(oral|v[ií]a oral|intravenos|intramuscular|subcut[aá]ne|sublingual|t[oó]pic|inhalad|nebuliz|rectal|oft[aá]lmic|[oó]tic|vaginal|nasal|transd[eé]rmic|intrat[eé]cal|epidural|enteral|sonda)/i;
const PER=/\b(cada\s+\d+|cada\s+(?:hora|d[ií]a|semana|noche|mañana)|\d+\s*veces|una vez|dosis [uú]nica|al d[ií]a|diari|por la (?:noche|mañana)|en infusi[oó]n|continu|por raz[oó]n necesaria|stat|inmediat)/i;
const DOSIS=/\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|µg|ug|ui|u\b|unidades|ml|mL|gotas|tabletas?|c[aá]psulas?|ampolletas?|mEq|mmol|%|puff|disparos)/i;
function revisaTx(txt){const w=[];for(const ln of String(txt||'').split(/\n|;/).map(s=>s.trim()).filter(Boolean)){
  if(!DOSIS.test(ln)&&!/\b(mg|tableta|c[aá]psula|ampolleta|jarabe|soluci[oó]n|suspensi[oó]n|crema|ung[uü]ento|gotas|inyecci)/i.test(ln))continue;
  const f=[];if(!DOSIS.test(ln))f.push('dosis');if(!VIA.test(ln))f.push('vía de administración');if(!PER.test(ln))f.push('periodicidad');
  if(f.length)w.push('«'+ln.slice(0,60)+'»: falta '+f.join(', ')+' (6.2.6).');}return w;}
function revisar(tipo,v,doc){const campos=camposDe(tipo),w=[];
  const libres=campos.filter(f=>f[3]==='t'||f[3]==='i').map(f=>v[f[0]]).join('\n');
  const ab=abreviaturas(libres);if(ab.length)w.push('Abreviaturas (5.11 pide escribir sin abreviaturas): '+ab.map(a=>a[0]+(a[2]?' (¿'+a[1]+'?)':' → '+a[1])).join(', ')+'.');
  if(campos.some(f=>f[3]==='sv'))w.push(...revisaSV(v));
  for(const k of ['tx','p','plan','ter','cuid'])if(v[k])w.push(...revisaTx(v[k]));
  if(doc?.fecha&&doc.fecha>hoyISO())w.push('La fecha de la nota es posterior a hoy.');
  if(tipo==='egreso'&&v.fing&&v.fegr&&v.fegr<v.fing)w.push('La fecha de egreso es anterior a la de ingreso.');
  return w;}

// ---------- guardado cifrado ----------
let ex=null,llave=null,sal=null,existe=false,lockT=0;
let dbp=null;
const idb=()=>dbp||(dbp=new Promise((res,rej)=>{const o=indexedDB.open('capri-expediente',1);o.onupgradeneeded=()=>o.result.createObjectStore('kv');o.onsuccess=()=>res(o.result);o.onerror=()=>rej(o.error);}));
const kv=async(mode,fn)=>{const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('kv',mode);const r=fn(t.objectStore('kv'));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});};
const enc=new TextEncoder(),dec=new TextDecoder();
const toB64=buf=>{const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode(...u.subarray(i,i+32768));return btoa(s);};
const fromB64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function derivar(pass,salt){const k=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function sellar(obj,key=llave,salt=sal){const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(obj)));return {v:1,salt:toB64(salt),iv:toB64(iv),ct:toB64(ct)};}
async function abrirSello(rec,key){return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(rec.iv)},key,fromB64(rec.ct))));}
const nuevo=()=>({pacs:[],aud:[],cfg:{est:{},med:{},motor:'auto',nubeOk:false,lock:5},formatos:[],folio:0});
async function cargar(){const rec=await kv('readonly',s=>s.get('datos')).catch(()=>null);existe=!!rec;}
async function persistir(){if(!ex||!llave)return;ex.upd=Date.now();const rec=await sellar(ex);await kv('readwrite',s=>s.put(rec,'datos'));existe=true;
  const rr=await sellarRec(ex).catch(()=>null);if(rr)await kv('readwrite',s=>s.put(rr,'datosRec'));dispatchEvent(new CustomEvent('exp:guardado'));}
async function desbloquear(pass){const rec=await kv('readonly',s=>s.get('datos'));if(!rec)return false;
  try{const k=await derivar(pass,fromB64(rec.salt));ex=Object.assign(nuevo(),await abrirSello(rec,k));llave=k;sal=fromB64(rec.salt);toque();bit('abrió el expediente');return true;}catch(e){return false;}}
async function crear(pass){sal=crypto.getRandomValues(new Uint8Array(16));llave=await derivar(pass,sal);ex=nuevo();bit('creó el expediente cifrado');await persistir();toque();}
async function cambiarLlave(pass){sal=crypto.getRandomValues(new Uint8Array(16));llave=await derivar(pass,sal);bit('cambió la llave');await persistir();}
function bloquear(motivo){if(!llave)return;ex=null;llave=null;vista={v:'lista'};pac=null;render();if(motivo)log('expediente: bloqueado ('+motivo+')','g');}
// ---------- código de recuperación y respaldo automático (se manejan desde la pestaña R.I.P) ----------
// El código es una llave AES al azar que solo existe en el papel de Kiga. Aquí se guarda importada «solo para cifrar»:
// con ella Capri sella una copia cada vez que guardas, pero no puede abrirla; para abrirla hay que teclear el código.
let recInfo=null;kv('readonly',s=>s.get('recKey')).then(k=>{recInfo=k?{id:k.id,ts:k.ts}:null;}).catch(()=>{});
const B32='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const aB32=u=>{let bits='',o='';for(const b of u)bits+=b.toString(2).padStart(8,'0');for(let i=0;i+5<=bits.length;i+=5)o+=B32[parseInt(bits.slice(i,i+5),2)];return o.match(/.{4}/g).join('-');};
const deB32=c=>{const t=c.toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/O/g,'0').replace(/I/g,'1');let bits='';for(const ch of t){const v=B32.indexOf(ch);if(v<0)throw new Error('ese código trae letras que no van ('+ch+')');bits+=v.toString(2).padStart(5,'0');}
  if(bits.length<160)throw new Error('al código le faltan letras');return Uint8Array.from(bits.slice(0,160).match(/.{8}/g),b=>parseInt(b,2));};
async function llaveDeCodigo(raw,uso){const k32=await crypto.subtle.digest('SHA-256',raw),h=new Uint8Array(await crypto.subtle.digest('SHA-256',k32));
  return {key:await crypto.subtle.importKey('raw',k32,'AES-GCM',false,uso),id:[...h.slice(0,4)].map(b=>b.toString(16).padStart(2,'0')).join('')};}
async function sellarRec(obj){const k=await kv('readonly',s=>s.get('recKey'));if(!k)return null;const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k.key,enc.encode(JSON.stringify(obj)));return {id:k.id,iv:toB64(iv),ct:toB64(ct)};}
window.expEstado=()=>({existe,abierto:!!(ex&&llave),codigo:recInfo,pacs:ex?ex.pacs.length:null});
window.expCrearCodigo=async()=>{if(!ex||!llave)throw new Error('abre primero el expediente con tu llave');
  const raw=crypto.getRandomValues(new Uint8Array(20)),{key,id}=await llaveDeCodigo(raw,['encrypt']);
  await kv('readwrite',s=>s.put({key,id,ts:Date.now()},'recKey'));recInfo={id,ts:Date.now()};bit('creó código de recuperación');await persistir();return aB32(raw);};
window.expRespaldo=async()=>{if(!ex||!llave)return null;return {app:'capri-expediente',v:2,fecha:Date.now(),pacs:ex.pacs.length,...await sellar(ex),rec:await sellarRec(ex)};};
// con el código: abre la copia sellada (la de este equipo o la de un archivo de respaldo)
window.expAbrirConCodigo=async(codigo,archivo)=>{const r=archivo?archivo.rec:await kv('readonly',s=>s.get('datosRec'));
  if(!r)throw new Error(archivo?'ese respaldo no trae copia para código de recuperación':'en este equipo no hay copia sellada con código');
  const {key,id}=await llaveDeCodigo(deB32(codigo),['decrypt']);if(r.id&&r.id!==id)throw new Error('ese no es el código de esta copia');
  try{return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(r.iv)},key,fromB64(r.ct))));}catch(e){throw new Error('el código no abre esta copia');}};
// lo recuperado entra así: si el expediente está abierto se suman los pacientes que falten; si no, queda como expediente con llave nueva
window.expRecibir=async(datos,nuevaLlave)=>{if(ex&&llave){const nuevos=(datos.pacs||[]).filter(x=>!ex.pacs.some(y=>y.id===x.id));ex.pacs.push(...nuevos);bit('restauró con código ('+nuevos.length+' pacientes)');await persistir();render();return nuevos.length;}
  if(!nuevaLlave||nuevaLlave.length<8)throw new Error('la llave nueva necesita mínimo 8 caracteres');
  sal=crypto.getRandomValues(new Uint8Array(16));llave=await derivar(nuevaLlave,sal);ex=Object.assign(nuevo(),datos);bit('recuperó el expediente con código y puso llave nueva');await persistir();toque();vista={v:'lista'};render();return ex.pacs.length;};
const toque=()=>{lockT=Date.now();};
setInterval(()=>{if(llave&&ex&&Date.now()-lockT>(ex.cfg.lock||5)*60e3)bloquear('inactividad');},20e3);
document.addEventListener('visibilitychange',()=>{if(document.hidden)lockT=Math.min(lockT,Date.now()-((ex?.cfg.lock||5)-1)*60e3);});
// bitácora de accesos: quién hizo qué y cuándo (buena práctica de la NOM-024 para registros electrónicos)
function bit(acc,p){if(!ex)return;ex.aud.push({ts:Date.now(),acc,p:p?.id||null});if(ex.aud.length>3000)ex.aud.splice(0,ex.aud.length-3000);}

// ---------- datos del paciente ----------
const nombreDe=p=>[p.nombre,p.ap1,p.ap2].filter(Boolean).join(' ');
const dxDe=p=>(p.docs||[]).filter(d=>d.c?.dx).sort((a,b)=>(b.fecha+b.hora).localeCompare(a.fecha+a.hora))[0]?.c.dx||'';
function edad(p,ref){if(!p.fnac)return '';const a=new Date(p.fnac+'T12:00'),b=ref?new Date(ref+'T12:00'):new Date();let y=b.getFullYear()-a.getFullYear();
  if(b.getMonth()<a.getMonth()||(b.getMonth()===a.getMonth()&&b.getDate()<a.getDate()))y--;
  if(y>=2)return y+' años';const m=(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth()-(b.getDate()<a.getDate()?1:0);return m>=1?m+' meses':Math.max(0,Math.round((b-a)/864e5))+' días';}
const folio=()=>{ex.folio=(ex.folio||0)+1;return 'CAP-'+new Date().getFullYear()+'-'+String(ex.folio).padStart(4,'0');};
const ultimoActo=p=>Math.max(p.ts||0,...(p.docs||[]).map(d=>new Date((d.fecha||'1970-01-01')+'T'+(d.hora||'00:00')).getTime()));
// lo que identifica a esta persona: se tapa antes de mandar cualquier texto a la nube
function identificadores(p){return [nombreDe(p),[p.nombre,p.ap1].filter(Boolean).join(' '),p.ap1&&p.ap2?p.ap1+' '+p.ap2:'',p.nombre,p.ap1,p.ap2,p.curp,p.domicilio,p.tel,p.nexp,p.resp]
  .map(s=>String(s||'').trim()).filter(s=>s.length>=3).sort((a,b)=>b.length-a.length);}
function tapar(txt,p){let t=String(txt||'');for(const w of identificadores(p))t=t.split(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi')).join('[PACIENTE]');
  return window.clinicaAnonimizar?window.clinicaAnonimizar(t):t;}

// ---------- apoyo diagnóstico (2.9): relaciona el caso con tus apuntes ----------
// Capri arma un resumen clínico SIN identificadores (edad, sexo, lo que dicen las notas; nombre, CURP, domicilio, teléfonos,
// expediente y responsable se tapan; las fechas van como «hace N días»), separa los datos clave de los secundarios,
// busca en tus apuntes, biblioteca y fuentes oficiales SOLO en este dispositivo y propone diagnósticos diferenciales con
// lo que está a favor, en contra, lo que falta y la fuente. Es un borrador para razonar el caso: lo valida el médico.
const CLIN=['motivo','pa','s','resumen','ias','habitus','cabeza','cuello','torax','abdomen','miembros','genitales','otra','estudios','dx','idx','dxpost','dxf','dxpre','crit','tx','hallazgos','pend','app','ahf','tox','ago','apnp'];
const hace=f=>{const d=Math.round((Date.now()-new Date((f||'')+'T12:00'))/864e5);return isNaN(d)?'':d<=0?'hoy':d===1?'ayer':'hace '+d+' días';};
const docsRec=p=>(p.docs||[]).slice().sort((a,b)=>(b.fecha+b.hora).localeCompare(a.fecha+a.hora));
function resumenClinico(p){const L=[`Paciente: ${edad(p)||'edad sin registrar'}, ${p.sexo||'sexo sin registrar'}.`+(p.alergias?' Alergias: '+p.alergias+'.':'')+(p.sangre?' Grupo y Rh: '+p.sangre+'.':'')];
  for(const d of docsRec(p).slice(0,6)){const v=d.c||{},cs=camposDe(d.tipo).concat(extrasDe(d.tipo));
    const sv=SV.filter(([k])=>v['sv_'+k]).map(([k,l])=>l.replace(/ \(.*/,'')+' '+v['sv_'+k]).join(', ');
    const ps=cs.filter(f=>f[3]!=='sv'&&(CLIN.includes(f[0])||f[0].startsWith('x_'))&&String(v[f[0]]||'').trim()).map(f=>f[1].split(' (')[0]+': '+String(v[f[0]]).trim().slice(0,900));
    if(sv||ps.length)L.push(`— ${DOCS[d.tipo][0]} (${hace(d.fecha)}):`+(sv?'\nSignos vitales: '+sv:'')+(ps.length?'\n'+ps.join('\n'):''));}
  return tapar(L.join('\n'),p).slice(0,9000);}
// lo que no puede esperar: signos vitales de alarma y banderas rojas en lo escrito (sin IA, siempre igual)
function alarmasSV(v){const a=[],n=k=>parseFloat(String(v['sv_'+k]||'').replace(',','.')),ta=String(v.sv_ta||'').match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if(n('temp')>=38)a.push('fiebre ('+v.sv_temp+' °C)');if(n('temp')<35.5)a.push('hipotermia ('+v.sv_temp+' °C)');
  if(n('fc')>100)a.push('taquicardia ('+v.sv_fc+' lpm)');if(n('fc')<50)a.push('bradicardia ('+v.sv_fc+' lpm)');
  if(n('fr')>22)a.push('taquipnea ('+v.sv_fr+' rpm)');if(n('spo2')<92)a.push('saturación baja ('+v.sv_spo2+'%)');
  if(ta){if(+ta[1]<90)a.push('hipotensión ('+v.sv_ta+')');else if(+ta[1]>=180||+ta[2]>=110)a.push('tensión arterial muy alta ('+v.sv_ta+')');}return a;}
const BANDERAS=/dolor tor[aá]cico|disnea|s[ií]ncope|desmayo|sangrado (abundante|activo|importante)|hematemesis|melena|hematoquecia|alteraci[oó]n del estado de (alerta|conciencia)|desorientad|confusi[oó]n|convulsi|rigidez de nuca|ictericia|anuria|oliguria|d[eé]ficit neurol[oó]gico|hemiparesia|abdomen agudo|rebote positivo|irritaci[oó]n peritoneal|ideaci[oó]n suicida|choque|cianosis/gi;
function alarmas(p){const ds=docsRec(p).slice(0,3),out=[];const conSV=ds.find(d=>SVmin.some(k=>d.c?.['sv_'+k]));if(conSV)out.push(...alarmasSV(conSV.c));
  const txt=ds.map(d=>Object.entries(d.c||{}).filter(([k])=>!k.startsWith('sv_')).map(([,x])=>x).join(' ')).join(' ');
  for(const m of new Set((txt.match(BANDERAS)||[]).map(x=>x.toLowerCase())))if(!new RegExp('(niega|sin|no presenta|no refiere)\\s+(\\w+\\s+){0,2}'+m,'i').test(txt))out.push(m);
  return [...new Set(out)];}
const textoPac=p=>[dxDe(p),...docsRec(p).slice(0,4).flatMap(d=>['motivo','pa','s','resumen','idx','dxf','crit'].map(k=>d.c?.[k]||''))].join(' ');
async function apoyo(p){const res=resumenClinico(p),q=tapar(textoPac(p),p).replace(/\s+/g,' ').slice(0,700);
  if(res.length<60||q.trim().length<8)throw new Error('todavía hay muy poco escrito de este paciente: llena al menos el padecimiento actual o una nota.');
  const motor=ex.cfg.motor||'auto',local=(motor==='auto'||motor==='local')&&window.cerebroInfo?.().ok;
  const fu=[];const add=(src,id,n,pag,text)=>{const k=n+'|'+pag;if(!fu.some(f=>f.k===k))fu.push({k,src,id,n,pag,text});};
  for(const o of (window.bibBuscar?await window.bibBuscar(q,10).catch(()=>[]):[]))add('bib',o.t.doc,o.t.nombre,o.t.pag,o.t.text);
  for(const o of (window.medBuscarLocal?.(q,6)||[]))add('med',o.id,o.nombre,o.pag,o.text);
  const F=fu.slice(0,8),corte=local?420:1100;
  const sys=`Eres el apoyo de razonamiento clínico de un estudiante de medicina en México, que trabaja bajo supervisión de un médico. Recibes el resumen de un caso real SIN datos que identifiquen a la persona y fragmentos de los apuntes y fuentes del estudiante. Haz esto:
1. Separa los datos del caso en "clave" (los que cambian el diagnóstico o la conducta: signos de alarma, hallazgos positivos, valores anormales, factores de riesgo) y "secundario" (lo que casi no aporta).
2. Propón de 2 a 5 diagnósticos diferenciales, del más al menos probable. En cada uno: "a_favor" = datos que SÍ vienen en el caso (cópialos casi literal), "en_contra" = datos del caso que no cuadran, "falta" = qué interrogar, explorar o estudiar para confirmarlo o descartarlo, "fuentes" = ids [F1]… de los fragmentos que lo respaldan (solo si de verdad lo dicen; si ninguno, lista vacía).
3. "alarmas": lo que obliga a actuar ya o a avisar al médico responsable.
No inventes datos del caso ni de las fuentes. No des dosis. Es un borrador para que el médico lo valide.
Responde SOLO JSON: {"clave":["..."],"secundario":["..."],"diferenciales":[{"dx":"...","prob":"alta|media|baja","a_favor":["..."],"en_contra":["..."],"falta":["..."],"fuentes":["F1"]}],"alarmas":["..."]}`;
  const user=`CASO:\n${res}\n\nFRAGMENTOS DE SUS APUNTES Y FUENTES:\n${F.map((f,i)=>`[F${i+1}] ${f.n}${f.pag?', p. '+f.pag:''}\n${tapar(f.text,p).slice(0,corte)}`).join('\n\n')||'(no encontré nada en sus apuntes sobre este caso)'}`;
  let j=null,quien='tu GPU';
  if(local)j=await window.cerebroJSON(sys,user).catch(e=>{log('apoyo dx GPU: '+String(e.message).slice(0,50),'w');return null;});
  if(!j){if(motor==='local')throw new Error('el cerebro de tu GPU no respondió y elegiste que nada salga de esta PC.');if(motor==='manual')throw new Error('en ⚙ elegiste que Capri no use IA en el expediente.');
    if(!ex.cfg.nubeOk&&!confirm('El cerebro de tu GPU no está disponible.\n\n¿Mandar el resumen del caso a Google Gemini? Va sin nombre, CURP, domicilio, teléfonos, expediente ni responsable, y las fechas como «hace N días».'))throw new Error('Cancelado: no se mandó nada.');
    ex.cfg.nubeOk=true;j=await gemini(sys,user);quien='Gemini (sin identificadores)';}
  // revisión: lo que Capri dice que está «a favor» tiene que venir en el expediente, y las fuentes tienen que existir
  const base=res+' '+alarmas(p).join(' '),R=new Set([...pals(base),...pals(expandir(base))]),enCaso=t=>{const w=pals(t);return !w.length||w.filter(x=>R.has(x)).length/w.length>=.5;};
  const L=a=>(Array.isArray(a)?a:[]).map(x=>String(x||'').trim()).filter(Boolean).slice(0,10);
  const dif=(Array.isArray(j?.diferenciales)?j.diferenciales:[]).slice(0,5).map(x=>({dx:String(x.dx||'').trim(),prob:/alta|media|baja/.test(x.prob)?x.prob:'',
    a_favor:L(x.a_favor).map(t=>({t,ok:enCaso(t)})),en_contra:L(x.en_contra),falta:L(x.falta),
    fuentes:[...new Set(L(x.fuentes).map(f=>+String(f).replace(/\D/g,'')).filter(n=>n>=1&&n<=F.length))].map(n=>({src:F[n-1].src,id:F[n-1].id,n:F[n-1].n,pag:F[n-1].pag}))})).filter(x=>x.dx);
  const r={ts:Date.now(),quien,clave:L(j?.clave),secundario:L(j?.secundario),alarmas:[...new Set([...alarmas(p),...L(j?.alarmas)])],dif,nf:F.length};
  p.apoyo=r;bit('Capri relacionó el caso con tus apuntes ('+quien+')',p);await persistir();return r;}
function vApoyo(p){const r=p.apoyo,al=alarmas(p);
  const fu=f=>`<a href="#" data-lec="${esc(f.src)}|${esc(f.id)}|${f.pag||''}" style="color:var(--hc)">${esc(f.n)}${f.pag?', p. '+f.pag:''}</a>`;
  return `<h4>🧠 Apoyo diagnóstico <i style="font-style:normal;color:#a0565e;letter-spacing:.04em;text-transform:none">· con tus apuntes, sin datos que identifiquen al paciente</i></h4>
   ${al.length?`<div class="alergia">⚠ ATENCIÓN: ${esc(al.join(' · '))}</div>`:''}
   <div class="row"><button class="hbtn c" data-a="apoyo">${r?'↻ Volver a relacionar':'Relacionar con mis apuntes'}</button>${r?.dif?.length?'<button class="mini" data-a="apoyoNota">Llevar a nota de evolución (borrador)</button>':''}<small class="warn" id="exApMsg"></small></div>
   ${r?`<div class="dict"><small style="color:#a0565e">${new Date(r.ts).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · ${esc(r.quien)} · ${r.nf} fragmento(s) de tus apuntes · sugerencias para razonar el caso, no un diagnóstico: lo valida el médico responsable</small>
    ${r.alarmas.length?`<div class="warn" style="margin-top:6px"><b>Alarmas:</b> ${esc(r.alarmas.join(' · '))}</div>`:''}
    ${r.clave.length?`<div style="margin-top:6px"><b style="color:var(--hc)">Datos clave:</b> ${esc(r.clave.join(' · '))}</div>`:''}
    ${r.secundario.length?`<div style="color:#a0565e;font-size:12px">Secundarios: ${esc(r.secundario.join(' · '))}</div>`:''}
    ${r.dif.map((d,i)=>`<fieldset style="margin-top:8px"><legend>${i+1}. ${esc(d.dx)} ${d.prob?'<i>· probabilidad '+esc(d.prob)+'</i>':''}</legend>
      ${d.a_favor.length?`<div><b>A favor:</b> ${d.a_favor.map(x=>x.ok?esc(x.t):`<span class="warn" title="esto no viene en el expediente">¿${esc(x.t)}?</span>`).join(' · ')}</div>`:''}
      ${d.en_contra.length?`<div><b>En contra:</b> ${esc(d.en_contra.join(' · '))}</div>`:''}
      ${d.falta.length?`<div><b>Falta para confirmar o descartar:</b> ${esc(d.falta.join(' · '))}</div>`:''}
      <div><b>Fuente:</b> ${d.fuentes.length?d.fuentes.map(fu).join(' · '):'<span class="warn">ninguno de tus apuntes lo respalda: es conocimiento general de la IA, verifícalo</span>'}</div></fieldset>`).join('')||'<div class="warn">No propuso diferenciales; agrega más datos del caso.</div>'}
   </div>`:''}`;}
// para relacionar lo que estudias con tus pacientes (solo con el expediente abierto; nada de esto va a la IA)
window.expRelacionados=texto=>{if(!ex||!llave)return null;const W=new Set(pals(expandir(texto)));if(W.size<2)return [];
  return ex.pacs.map(p=>{const P=new Set(pals(expandir(textoPac(p)))),D=new Set(pals(expandir(dxDe(p))));let n=0,dx=0;for(const w of W)if(P.has(w)){n++;if(D.has(w))dx++;}return {p,n,dx};})
    .filter(x=>x.dx>=1&&x.n>=2).sort((a,b)=>b.n-a.n).slice(0,3).map(x=>({id:x.p.id,nexp:x.p.nexp,dx:String(dxDe(x.p)).slice(0,50)}));};
window.expAbrirPac=id=>{window.hudGo?.('expediente');setTimeout(()=>{if(!ex)return;const p=ex.pacs.find(x=>x.id===id);if(!p)return;pac=p;bit('abrió expediente (desde una plática)',p);vista={v:'pac'};render();},450);};

// ---------- Capri acomoda lo que le dictas ----------
const SVRE={ta:/(?:\bT\.?\s?A\.?|tensi[oó]n arterial|presi[oó]n arterial)\s*[:=]?\s*(\d{2,3}\s*\/\s*\d{2,3})/i,fc:/(?:\bF\.?\s?C\.?|frecuencia card[ií]aca|pulso)\s*[:=]?\s*(\d{2,3})/i,
 fr:/(?:\bF\.?\s?R\.?|frecuencia respiratoria)\s*[:=]?\s*(\d{1,2})/i,temp:/(?:\bT(?:emp)?\.?\s?°?|temperatura)\s*[:=]?\s*(\d{2}(?:[.,]\d)?)\s*°?\s*C?\b/i,
 spo2:/(?:SpO2|SatO2|saturaci[oó]n(?: de ox[ií]geno)?)\s*[:=]?\s*(\d{2,3})\s*%?/i,peso:/peso\s*[:=]?\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:kg|kilos)?/i,talla:/(?:talla|estatura)\s*[:=]?\s*(\d(?:[.,]\d+)?|\d{2,3})\s*(?:m|cm)?\b/i};
function signosDe(txt){const o={};for(const [k,re] of Object.entries(SVRE)){const m=String(txt).match(re);if(m)o[k]=m[1].replace(/\s+/g,'').replace(',','.');}return o;}
// números (dosis, cifras) que Capri haya puesto y que no estaban en lo que dijiste: se marcan para que los revises
const nums=t=>(String(t).match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>x.replace(',','.'));
function cifrasNuevas(prop,fuente){const F=new Set(nums(fuente));return [...new Set(nums(prop).filter(n=>!F.has(n)&&!/^0?[0-9]$/.test(n)))];}
// y palabras de contenido que no dijiste (un diagnóstico o hallazgo inventado se ve aquí); cuentan también tus siglas ya expandidas
const VAC=new Set('de del la las el los un una unos unas y o en con sin por para que se su sus al lo le les a e es son fue ha refiere presenta paciente actualmente cuadro clinico datos mismo misma este esta dia dias hace'.split(' '));
const pals=t=>(String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-zñ]{4,}/g)||[]).filter(w=>!VAC.has(w)).map(w=>w.slice(0,6));
function palabrasNuevas(prop,fuente){const F=new Set([...pals(fuente),...pals(expandir(fuente))]),P=pals(prop.replace(/\[PACIENTE\]/g,''));if(!P.length)return [];
  const n=[...new Set(P.filter(w=>!F.has(w)))];return n.length>=2&&n.length/new Set(P).size>.3?n:[];}
async function organizar(tipo,texto,p,actual){
  const campos=camposDe(tipo).filter(f=>f[3]!=='sv'),motor=ex.cfg.motor||'auto';
  const lista=campos.map(f=>`- ${f[0]}: ${f[1]}`).join('\n');
  const sys=`Eres el asistente de documentación clínica de un médico en México. Acomodas en los apartados de un documento del expediente clínico (${NOM}, ${tipo==='hc'?'historia clínica, numeral 6.1':DOCS[tipo][0]+', numeral '+DOCS[tipo][1]}) lo que el médico dictó. Reglas estrictas:
1. Usa SOLO lo que viene en el dictado. No inventes, no completes, no supongas diagnósticos, cifras, dosis, vías, horarios ni hallazgos. Si un apartado no viene, déjalo como "" y ponlo en "faltan".
2. Copia con fidelidad cifras, dosis, unidades y nombres de medicamentos.
3. Lenguaje técnico-médico, en tercera persona, sin abreviaturas (5.11): expande solo las que tienen un único significado clínico claro; si una sigla es ambigua, déjala y ponla en "dudas".
4. Los datos que identifican al paciente vienen tapados como [PACIENTE]; déjalos así.
5. Si el dictado se contradice o algo parece error de captura, no lo corrijas: anótalo en "dudas".
Apartados (clave: descripción):
${lista}
Responde SOLO un JSON: {"campos":{"clave":"texto"},"faltan":["apartado que no viene"],"dudas":["..."]}`;
  const sv=signosDe(texto);
  const usuario='Dictado del médico:\n"""\n'+texto+'\n"""';
  const local=(motor==='auto'||motor==='local')&&window.cerebroJSON?await window.cerebroJSON(sys,tapar(usuario,p)).catch(e=>{log('expediente GPU: '+String(e.message).slice(0,50),'w');return null;}):null;
  let j=local,quien='tu GPU';
  if(!j){if(motor==='local')throw new Error('El cerebro de tu GPU no respondió y elegiste que nada salga de esta PC. Abre Ollama o cambia el motor en ⚙.');
    if(motor==='manual')j={campos:{},faltan:[],dudas:[]};
    else{if(!ex.cfg.nubeOk&&!confirm('El cerebro de tu GPU no está disponible.\n\n¿Mandar el dictado a Google Gemini para acomodarlo? Antes de salir se tapan nombre, apellidos, CURP, domicilio, teléfonos, número de expediente y responsable.\n\n(Esto se queda guardado; lo cambias en ⚙ del expediente.)'))throw new Error('Cancelado: no se mandó nada.');
      ex.cfg.nubeOk=true;j=await gemini(sys,tapar(usuario,p));quien='Gemini (datos tapados)';}}
  const c=j?.campos||{},out={},nuevas={};
  for(const f of campos){const val=String(c[f[0]]??'').trim();if(!val)continue;
    const real=val.replace(/\[PACIENTE\]/g,nombreDe(p)||'el paciente');out[f[0]]=real;
    const cn=cifrasNuevas(real,texto),pn=palabrasNuevas(val,tapar(texto,p));if(cn.length||pn.length)nuevas[f[0]]={c:cn,p:pn};}
  for(const [k,x] of Object.entries(sv))out['sv_'+k]=x;   // los signos los saca Capri sin IA, directo de tu texto
  bit('Capri acomodó un dictado con '+quien,p);
  return {out,faltan:(j?.faltan||[]).map(String),dudas:(j?.dudas||[]).map(String),nuevas,quien};}
async function gemini(sys,user){if(!cfg.key||!cfg.model)throw new Error('No hay cerebro: ni Ollama ni API key de Gemini.');
  const gc={temperature:.1,responseMimeType:'application/json',maxOutputTokens:4096};const tc=typeof thinkCfg==='function'?thinkCfg(cfg.model):null;if(tc)gc.thinkingConfig=tc;
  const r=await fetch(API+'models/'+encodeURIComponent(cfg.model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cfg.key},
    body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:gc})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error?.message||('Error '+r.status));
  const t=(j.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&p.text).map(p=>p.text).join('');
  try{return JSON.parse(t.replace(/^```(?:json)?|```$/g,''));}catch(e){throw new Error('Gemini no devolvió un formato válido.');}}

// ---------- formatos oficiales de tu institución ----------
// Subes el formato en blanco (PDF, Word, foto…); Capri saca sus apartados y los agrega como campos extra a ese documento.
// Los mínimos de la NOM siempre se quedan y se siguen revisando.
function apartadosDe(texto){const ls=String(texto).split(/\n+/).map(s=>s.replace(/[_.]{3,}.*$/,'').replace(/\s+/g,' ').trim()).filter(s=>s.length>=3&&s.length<=70);
  const out=[];for(const l of ls){const t=l.replace(/[:：]\s*$/,'');if(/[:：]\s*$/.test(l)||(/^[A-ZÁÉÍÓÚÑ0-9 ,()/.-]+$/.test(l)&&/[A-Z]{3}/.test(l)))out.push(t.charAt(0)+t.slice(1).toLowerCase());}
  return [...new Set(out)].slice(0,40);}
const extrasDe=tipo=>(ex?.formatos||[]).filter(f=>f.tipo===tipo&&f.on).flatMap(f=>f.campos.map((n,i)=>['x_'+f.id+'_'+i,n,0,'t','formato: '+f.nombre]));

// ---------- ventana (sección EXPEDIENTE del HUD) ----------
const css=document.createElement('style');css.textContent=`
#vExp{padding:18px 22px}
.ex{display:grid;grid-template-columns:270px 1fr;gap:18px;min-height:100%;font:13px/1.5 var(--mono);color:#ffd9dc}
.ex .side{display:flex;flex-direction:column;gap:10px;min-height:0}.ex .main{display:flex;flex-direction:column;gap:12px;min-width:0}
.ex h3{font:600 15px/1 var(--sans);letter-spacing:.1em;color:var(--hr);margin:0;text-transform:uppercase}.ex h4{margin:6px 0 0;font:600 12px var(--sans);letter-spacing:.14em;color:var(--hc);text-transform:uppercase}
.ex .sub{font:10px var(--mono);letter-spacing:.2em;color:#a0565e;text-transform:uppercase}
.ex input,.ex select,.ex textarea{background:#0a0506;border:1px solid #3b1418;color:#ffe3e6;font:13px var(--mono);padding:8px 10px;width:100%;box-sizing:border-box}
.ex textarea{min-height:60px;resize:vertical;line-height:1.45}.ex input:focus,.ex select:focus,.ex textarea:focus{outline:0;border-color:var(--hc)}
.ex label{display:flex;flex-direction:column;gap:4px;font:11px var(--mono);color:#c98d93}.ex label.req>span:first-child::after{content:' *';color:var(--hr)}
.ex label .nm{color:#a0565e;font-size:10px;margin-left:6px}.ex label.ia textarea,.ex label.ia input{border-color:var(--hc);box-shadow:0 0 0 1px var(--hc2) inset}
.ex label.ia>span:first-child::before{content:'◆ ';color:var(--hc)}.ex label.nuevo textarea{border-color:var(--hg)}
.ex .g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}.ex .svg{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
.ex fieldset{border:1px solid #3b1418;padding:10px 12px;display:flex;flex-direction:column;gap:9px;margin:0;background:rgba(10,4,6,.6)}
.ex legend{color:var(--hr);font:600 11px var(--sans);letter-spacing:.14em;text-transform:uppercase;padding:0 6px}.ex legend i{color:#a0565e;font-style:normal;font-weight:400}
.ex .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ex .sp{flex:1}
.ex .list{display:flex;flex-direction:column;gap:3px;overflow-y:auto;max-height:52vh}
.ex .it{border-left:2px solid #3b1418;padding:7px 10px;cursor:pointer;background:rgba(255,77,94,.04)}.ex .it:hover{border-color:var(--hr)}.ex .it.on{border-color:var(--hc);background:rgba(94,246,255,.06)}
.ex .it b{display:block;color:#ffe3e6;font-weight:600}.ex .it small{color:#a0565e}
.ex .aviso{border:1px dashed var(--hr2);padding:9px 11px;font:12px/1.5 var(--mono);color:#f3c84b}.ex .ok{color:#7dff9b}.ex .warn{color:var(--hg)}
.ex .chk{margin:0;padding-left:18px;font:12px/1.55 var(--mono)}.ex .chk li{color:var(--hg)}.ex .chk.r li{color:var(--hr)}
.ex .alergia{border:1px solid var(--hr);background:var(--hr3);color:#ffb3ba;padding:6px 10px;font:600 12px var(--sans);letter-spacing:.06em}
.ex .doc{display:grid;grid-template-columns:96px 1fr auto;gap:10px;align-items:center;border-bottom:1px solid #2a0d11;padding:7px 4px;cursor:pointer}.ex .doc:hover{background:rgba(255,77,94,.05)}
.ex .doc em{font-style:normal;color:#a0565e;font-size:11px}.ex .doc .st{font-size:11px}.ex .doc .st.f{color:#7dff9b}.ex .doc .st.b{color:var(--hg)}
.ex .dict{border:1px solid var(--hc2);padding:10px;background:rgba(94,246,255,.03)}.ex .mini{font:11px var(--mono);background:none;border:1px solid #3b1418;color:#ffd9dc;padding:5px 9px;cursor:pointer}
.ex .mini:hover{border-color:var(--hc);color:var(--hc)}.ex .lock{max-width:440px;margin:6vh auto;display:flex;flex-direction:column;gap:12px}
.ex .ro{white-space:pre-wrap;border:1px solid #2a0d11;padding:8px 10px;background:#0a0506}.ex .add{border-left:2px solid var(--hg);padding:6px 10px;margin-top:4px}
@media (max-width:820px){.ex{grid-template-columns:1fr}.ex .list{max-height:30vh}}`;document.head.appendChild(css);
let sec=null,vista={v:'lista'},pac=null,dictP=null;
const $e=id=>sec?.querySelector('#'+id);
const H=html=>{sec.innerHTML=`<div class="ex">${html}</div>`;};
function render(){if(!sec)return;
  if(!ex){vLock();return;}
  ({lista:vLista,pac:vPac,doc:vDoc,cfg:vCfg,bit:vBit}[vista.v]||vLista)();}
function lado(){const ps=ex.pacs.slice().sort((a,b)=>(b.upd||b.ts)-(a.upd||a.ts));
  return `<div class="side"><div class="row"><h3>Expediente</h3><span class="sp"></span><button class="mini" data-a="lock" title="Bloquear ahora">🔒</button><button class="mini" data-a="cfg" title="Ajustes y privacidad">⚙</button></div>
   <div class="sub">${NOM} · cifrado local</div>
   <input id="exBus" placeholder="Buscar nombre, expediente, diagnóstico o síntoma" value="${esc(vista.q||'')}">
   <div class="list" id="exLs">${ps.filter(p=>!vista.q||(nombreDe(p)+' '+p.nexp+' '+textoPac(p)).toLowerCase().includes(vista.q.toLowerCase())).map(p=>{const al=alarmas(p);return `<div class="it${pac===p?' on':''}" data-p="${p.id}"${al.length?' title="'+esc(al.join(' · '))+'"':''}><b>${al.length?'<span style="color:var(--hr)">⚠ </span>':''}${esc(nombreDe(p))}</b><small>${esc(p.nexp)} · ${esc(edad(p))} · ${esc(p.sexo||'')} · ${(p.docs||[]).length} doc.${dxDe(p)?' · '+esc(String(dxDe(p)).slice(0,40)):''}</small></div>`;}).join('')||'<small style="color:#a0565e">Aún no hay pacientes.</small>'}</div>
   <button class="hbtn c" data-a="nuevo">+ Nuevo paciente</button></div>`;}
function vLock(){
  if(!existe){H(`<div class="lock" style="grid-column:1/-1"><h3>Expediente clínico</h3><div class="sub">${NOM} · personas reales</div>
    <div class="aviso">Aquí van datos de salud de personas reales: son <b>datos personales sensibles</b> (Ley Federal de Protección de Datos Personales en Posesión de los Particulares, 2025) y confidenciales (${NOM}, 5.5). Por eso este expediente se guarda <b>siempre cifrado</b> en este dispositivo con una llave que solo tú sabes. <b>Si la olvidas no hay forma de recuperarlo</b>, salvo con el código de recuperación que puedes crear en R.I.P → Respaldo (escríbelo en papel).</div>
    <label class="req"><span>Crea tu llave (mínimo 8 caracteres)</span><input type="password" id="exP1" autocomplete="new-password"></label>
    <label class="req"><span>Repítela</span><input type="password" id="exP2" autocomplete="new-password"></label>
    <div class="row"><button class="hbtn c" id="exCrear">Crear expediente cifrado</button></div><small class="warn" id="exMsg"></small></div>`);
    $e('exCrear').onclick=async()=>{const a=$e('exP1').value,b=$e('exP2').value;if(a.length<8)return $e('exMsg').textContent='Mínimo 8 caracteres.';if(a!==b)return $e('exMsg').textContent='No coinciden.';
      await crear(a);vista={v:'cfg',primera:true};render();};return;}
  H(`<div class="lock" style="grid-column:1/-1"><h3>🔒 Expediente bloqueado</h3><div class="sub">cifrado AES-256 · se cierra solo</div>
   <label><span>Tu llave</span><input type="password" id="exPass" autocomplete="current-password"></label><div class="row"><button class="hbtn c" id="exOpen">Abrir</button></div><small class="warn" id="exMsg"></small>
   <small style="color:#c98d93">¿Olvidaste tu llave? <a href="#" id="exOlv" style="color:var(--hc)">Usa tu código de recuperación en R.I.P</a></small></div>`);
  $e('exOlv').onclick=e=>{e.preventDefault();window.ripIr?.('respaldo');};
  const go=async()=>{const ok=await desbloquear($e('exPass').value);$e('exPass').value='';if(ok){await persistir();vista={v:'lista'};render();}else $e('exMsg').textContent='Esa no es la llave.';};
  $e('exOpen').onclick=go;$e('exPass').onkeydown=e=>{if(e.key==='Enter')go();};setTimeout(()=>$e('exPass')?.focus(),60);}
function vLista(){const falta=!ex.cfg.med?.nombre||!ex.cfg.est?.nombre;
  H(lado()+`<div class="main"><h3>Pacientes</h3>
   ${falta?`<div class="aviso">Falta configurar el establecimiento y el médico responsable (nombre completo y cédula). Toda nota lleva fecha, hora, nombre completo y firma de quien la elabora (5.10). <button class="mini" data-a="cfg">Configurar</button></div>`:''}
   <div class="aviso" style="color:#ffd9dc">Cómo funciona: crea al paciente con su ficha de identificación, luego abre un documento (historia clínica, nota de evolución…) y <b>dícta o pega todo lo que tengas</b>. Capri lo acomoda en los apartados de la ${NOM}, deja vacío lo que no dijiste y te marca lo que falta, abreviaturas, signos vitales raros y medicamentos sin dosis, vía o periodicidad. Tú revisas y firmas; firmado ya no se edita (5.11): se corrige con nota aclaratoria.</div>
   ${vista.nuevo?fNuevo():''}</div>`);}
function fNuevo(){return `<fieldset><legend>Nuevo paciente <i>· ficha de identificación</i></legend>
  <div class="g2">${FICHA.map(([k,l,r,t])=>t==='s'?`<label class="${r?'req':''}"><span>${l}</span><select data-f="${k}"><option></option><option>Mujer</option><option>Hombre</option><option>Intersexual</option></select></label>`
    :`<label class="${r?'req':''}"><span>${l}</span><input data-f="${k}" ${t==='d'?'type="date"':''} ${k==='nexp'?`placeholder="vacío = ${esc('CAP-'+new Date().getFullYear()+'-'+String((ex.folio||0)+1).padStart(4,'0'))}"`:''}></label>`).join('')}</div>
  <label class="ck" style="flex-direction:row;gap:8px;align-items:flex-start"><input type="checkbox" id="exCons" style="width:auto;margin-top:3px"><span>Le di al paciente (o a su representante) el aviso de privacidad y tengo su <b>consentimiento expreso y por escrito</b> para tratar sus datos de salud, o se trata de una urgencia.</span></label>
  <div class="row"><span class="sp"></span><button class="mini" data-a="cancel">Cancelar</button><button class="hbtn c" data-a="crear">Crear expediente del paciente</button></div><small class="warn" id="exNMsg"></small></fieldset>`;}
function vPac(){const p=pac;if(!p)return vLista();const docs=(p.docs||[]).slice().sort((a,b)=>(b.fecha+b.hora).localeCompare(a.fecha+a.hora));
  H(lado()+`<div class="main"><div class="row"><h3>${esc(nombreDe(p))}</h3><span class="sp"></span><button class="mini" data-a="imprimirTodo">🖨 Imprimir expediente</button><button class="mini" data-a="ficha">✎ Ficha</button></div>
   <div class="sub">${esc(p.nexp)} · ${esc(edad(p))} · ${esc(p.sexo)} · nacimiento ${esc(fechaL(p.fnac))}</div>
   ${p.alergias?`<div class="alergia">⚠ ALERGIAS: ${esc(p.alergias)}</div>`:''}
   ${vista.ficha?fFicha(p):''}
   ${vApoyo(p)}
   <h4>Nuevo documento</h4><div class="row">${ORDEN.map(t=>`<button class="mini" data-new="${t}" title="${esc(NOM+' '+DOCS[t][1])}">${esc(DOCS[t][0])}</button>`).join('')}</div>
   <h4>Documentos (${docs.length})</h4><div>${docs.map(d=>{const v=d.c,f=faltan(camposDe(d.tipo),v);
     return `<div class="doc" data-d="${d.id}"><em>${esc(d.fecha)} ${esc(d.hora)}</em><span>${esc(DOCS[d.tipo][0])}${d.c?.dx||d.c?.a?' · <em>'+esc(String(d.c.dx||d.c.a).slice(0,70))+'</em>':''}</span><span class="st ${d.firma?'f':'b'}">${d.firma?'✓ firmada':f.length?'borrador · faltan '+f.length:'borrador completo'}</span></div>`;}).join('')||'<small style="color:#a0565e">Sin documentos. Empieza por la historia clínica.</small>'}</div>
   <div class="row"><span class="sp"></span><button class="mini" data-a="borrarPac" style="border-color:#3b1418">Eliminar paciente…</button></div></div>`);}
function fFicha(p){return `<fieldset><legend>Ficha de identificación</legend><div class="g2">${FICHA.map(([k,l,r,t])=>t==='s'?`<label class="${r?'req':''}"><span>${l}</span><select data-f="${k}">${['','Mujer','Hombre','Intersexual'].map(o=>`<option ${p[k]===o?'selected':''}>${o}</option>`).join('')}</select></label>`
  :`<label class="${r?'req':''}"><span>${l}</span><input data-f="${k}" ${t==='d'?'type="date"':''} value="${esc(p[k]||'')}"></label>`).join('')}</div>
  <small>Consentimiento para tratar sus datos: ${p.consent?'registrado el '+esc(new Date(p.consent).toLocaleDateString('es-MX')):'<span class="warn">sin registrar</span>'}</small>
  <div class="row"><span class="sp"></span><button class="hbtn c" data-a="guardaFicha">Guardar ficha</button></div></fieldset>`;}
function campo(f,v,ia,nuevas,ro){const [k,lab,req,tipo,num]=f,val=v?.[k]??'';const cls=[req?'req':'',ia?.[k]?'ia':'',nuevas?.[k]?'nuevo':''].join(' ');
  const L=`<span>${esc(lab)}<span class="nm">${esc(num)}</span></span>`;
  if(tipo==='sv')return `<div><label class="${req?'req':''}">${L}</label><div class="svg">${SV.map(([s,l])=>`<label class="${ia?.['sv_'+s]?'ia':''}"><span>${l}</span><input data-k="sv_${s}" value="${esc(v?.['sv_'+s]??'')}" ${ro?'readonly':''} inputmode="decimal"></label>`).join('')}</div><small id="exImc"></small></div>`;
  if(ro)return `<label>${L}<div class="ro">${esc(val)||'<span style="color:#a0565e">— sin dato</span>'}</div></label>`;
  if(tipo==='i'||tipo==='d'||tipo==='h')return `<label class="${cls}">${L}<input data-k="${k}" value="${esc(val)}" ${tipo==='d'?'type="date"':tipo==='h'?'type="time"':''}></label>`;
  return `<label class="${cls}">${L}<textarea data-k="${k}">${esc(val)}</textarea>${nuevas?.[k]?`<small class="warn">⚠ ${nuevas[k].c?.length?'Cifras que no están en tu dictado: '+esc(nuevas[k].c.join(', '))+'. ':''}${nuevas[k].p?.length?'Escribió cosas que no dijiste ('+esc(nuevas[k].p.slice(0,6).join(', '))+'…): ¿lo inventó? ':''}Revísalo antes de firmar.</small>`:''}</label>`;}
function vDoc(){const p=pac,d=p?.docs.find(x=>x.id===vista.d);if(!d)return vPac();const T=DOCS[d.tipo],v=d.c,ro=!!d.firma;
  const grupos=d.tipo==='hc'?HC:[[T[0],T[1],T[2]]];const extra=extrasDe(d.tipo);
  H(lado()+`<div class="main"><div class="row"><h3>${esc(T[0])}</h3><span class="sp"></span><button class="mini" data-a="volver">← ${esc(nombreDe(p))}</button><button class="mini" data-a="imprimir">🖨 Imprimir / PDF</button></div>
   <div class="sub">${NOM} · numeral ${esc(T[1])}${T[3]?' · '+esc(T[3]):''}</div>
   ${p.alergias?`<div class="alergia">⚠ ALERGIAS: ${esc(p.alergias)}</div>`:''}
   <div class="g2"><label class="req"><span>Fecha</span><input type="date" id="exF" value="${esc(d.fecha)}" ${ro?'readonly':''}></label><label class="req"><span>Hora</span><input type="time" id="exH" value="${esc(d.hora)}" ${ro?'readonly':''}></label>
    <label><span>Número de cama (en su caso)</span><input id="exCama" value="${esc(d.cama||'')}" ${ro?'readonly':''}></label><label><span>Servicio</span><input id="exServ" value="${esc(d.serv||'')}" ${ro?'readonly':''}></label></div>
   ${ro?'':`<div class="dict"><div class="row"><b style="color:var(--hc)">Díctale o pégale a Capri lo que tengas</b><span class="sp"></span><small>motor: ${esc(motorTxt())}</small></div>
    <textarea id="exDict" placeholder="Ej.: Mujer de 54 años, acude por dolor en epigastrio de 3 días… TA 130/85, FC 88… Plan: omeprazol 20 mg vía oral cada 24 horas…" style="min-height:90px">${esc(d.dict||'')}</textarea>
    <div class="row" style="margin-top:6px"><button class="hbtn c" data-a="organizar">◆ Capri, acomódalo</button><button class="mini" data-a="dictar" title="Dictar con el micrófono">🎙 Dictar</button><span class="sp"></span><small id="exOrgMsg"></small></div></div>`}
   <div id="exRev"></div>
   ${grupos.map(([t,ref,cs])=>`<fieldset><legend>${esc(t)} <i>· ${esc(ref)}</i></legend>${cs.map(f=>campo(f,v,d.ia,d.nuevas,ro)).join('')}</fieldset>`).join('')}
   ${extra.length?`<fieldset><legend>Formato de tu institución <i>· campos extra</i></legend>${extra.map(f=>campo(f,v,d.ia,d.nuevas,ro)).join('')}</fieldset>`:''}
   <fieldset><legend>Elaboró <i>· 5.10</i></legend><div class="g2">
    <label class="req"><span>Nombre completo de quien elabora</span><input id="exElab" value="${esc(d.elab||ex.cfg.med?.nombre||'')}" ${ro?'readonly':''}></label>
    <label><span>Cédula profesional</span><input id="exCed" value="${esc(d.ced||ex.cfg.med?.cedula||'')}" ${ro?'readonly':''}></label>
    <label><span>Si eres estudiante o interno: médico que valida y firma</span><input id="exVal" value="${esc(d.valida||ex.cfg.med?.valida||'')}" ${ro?'readonly':''}></label></div></fieldset>
   ${ro?`<div class="aviso" style="color:#7dff9b">✓ Firmada en Capri el ${esc(new Date(d.firma.ts).toLocaleString('es-MX'))} por ${esc(d.firma.nombre)} · huella ${esc(d.firma.hash.slice(0,16))}… · Este sello prueba que no cambió; no sustituye la firma autógrafa ni la firma electrónica avanzada (5.10): imprime y firma.</div>
     ${(d.add||[]).map(a=>`<div class="add"><small class="warn">Nota aclaratoria · ${esc(new Date(a.ts).toLocaleString('es-MX'))} · ${esc(a.autor)}</small><div>${esc(a.t)}</div></div>`).join('')}
     <label><span>Nota aclaratoria (se agrega con fecha y hora; el original no se toca)</span><textarea id="exAdd"></textarea></label><div class="row"><span class="sp"></span><button class="mini" data-a="aclarar">+ Agregar nota aclaratoria</button></div>`
   :`<div class="row"><button class="mini" data-a="expandir">Expandir abreviaturas seguras</button><button class="mini" data-a="borrarDoc">Descartar borrador</button><span class="sp"></span><button class="mini" data-a="guardar">Guardar borrador</button><button class="hbtn" data-a="firmar">Firmar y sellar</button></div>`}
  </div>`);
  pintaRev();imc();}
const motorTxt=()=>({auto:window.cerebroInfo?.().ok?'tu GPU (nada sale de la PC)':'Gemini con datos tapados (no encuentro tu GPU)',local:'solo tu GPU',nube:'Gemini con datos tapados',manual:'sin IA: solo signos vitales y revisión'}[ex.cfg.motor||'auto']);
function leeDoc(){const p=pac,d=p.docs.find(x=>x.id===vista.d);if(!d||d.firma)return d;const v=d.c;
  sec.querySelectorAll('[data-k]').forEach(e=>{const k=e.dataset.k,nv=e.value.trim();if((v[k]||'')!==nv&&d.ia?.[k]&&d.iaVal?.[k]!==nv){delete d.ia[k];if(d.nuevas)delete d.nuevas[k];}v[k]=nv;});
  d.fecha=$e('exF')?.value||d.fecha;d.hora=$e('exH')?.value||d.hora;d.cama=$e('exCama')?.value.trim()||'';d.serv=$e('exServ')?.value.trim()||'';
  d.elab=$e('exElab')?.value.trim()||'';d.ced=$e('exCed')?.value.trim()||'';d.valida=$e('exVal')?.value.trim()||'';d.dict=$e('exDict')?.value||'';d.upd=Date.now();p.upd=Date.now();return d;}
function pintaRev(extra){const p=pac,d=p?.docs.find(x=>x.id===vista.d),box=$e('exRev');if(!d||!box)return;const v=d.c;
  const f=faltan(camposDe(d.tipo),v),w=revisar(d.tipo,v,d);const inv=Object.keys(d.nuevas||{}).length;if(inv)w.unshift(inv+' apartado(s) marcados en amarillo traen datos que no venían en tu dictado: confírmalos o bórralos.');if(!d.elab&&!ex.cfg.med?.nombre)f.push('Nombre completo de quien elabora (5.10)');
  box.innerHTML=(extra||'')+(f.length?`<div class="sub" style="margin-top:4px">Falta (${f.length})</div><ul class="chk r">${f.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<div class="ok">✓ Tiene todos los apartados mínimos de la norma.</div>')+
    (w.length?`<div class="sub" style="margin-top:6px">Revisa</div><ul class="chk">${w.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'');}
function imc(){const p=parseFloat(sec.querySelector('[data-k="sv_peso"]')?.value),t0=parseFloat(sec.querySelector('[data-k="sv_talla"]')?.value),el=$e('exImc');
  if(!el)return;const t=t0>3?t0/100:t0;el.textContent=p>0&&t>0?'Índice de masa corporal '+(p/(t*t)).toFixed(1)+' kg/m²':'';}
function vCfg(){const c=ex.cfg,E=c.est||{},Md=c.med||{};
  H(lado()+`<div class="main"><div class="row"><h3>Ajustes y privacidad</h3><span class="sp"></span><button class="mini" data-a="lista">← Pacientes</button></div>
   ${vista.primera?'<div class="aviso">Listo, tu expediente está cifrado. Llena estos datos una vez: salen en el encabezado y la firma de cada documento.</div>':''}
   <fieldset><legend>Establecimiento <i>· encabezado</i></legend><div class="g2">
    <label class="req"><span>Nombre del establecimiento</span><input data-c="est.nombre" value="${esc(E.nombre||'')}"></label><label><span>Tipo (consultorio, hospital, unidad de medicina familiar…)</span><input data-c="est.tipo" value="${esc(E.tipo||'')}"></label>
    <label><span>Institución a la que pertenece, en su caso</span><input data-c="est.inst" value="${esc(E.inst||'')}"></label><label><span>Domicilio del establecimiento</span><input data-c="est.dom" value="${esc(E.dom||'')}"></label></div></fieldset>
   <fieldset><legend>Quien elabora <i>· 5.10</i></legend><div class="g2">
    <label class="req"><span>Tu nombre completo</span><input data-c="med.nombre" value="${esc(Md.nombre||'')}"></label><label><span>Cédula profesional</span><input data-c="med.cedula" value="${esc(Md.cedula||'')}"></label>
    <label><span>Especialidad o grado (médico general, interno, residente…)</span><input data-c="med.grado" value="${esc(Md.grado||'')}"></label><label><span>Médico adscrito que valida (si eres estudiante o interno)</span><input data-c="med.valida" value="${esc(Md.valida||'')}"></label></div>
    <small>La norma pide que las notas las elabore el médico, con nombre completo y firma. Si eres estudiante, Capri te arma el documento y lo marca para que tu médico adscrito lo valide y firme.</small></fieldset>
   <fieldset><legend>Cómo acomoda Capri <i>· privacidad</i></legend>
    <label><span>Motor</span><select data-c="motor">${[['auto','Auto: tu GPU primero; si no está, Gemini con datos tapados (te pregunta la 1ª vez)'],['local','Solo tu GPU: nada sale de esta PC'],['nube','Gemini con datos tapados'],['manual','Sin IA: Capri solo saca signos vitales y revisa']].map(([k,t])=>`<option value="${k}" ${c.motor===k?'selected':''}>${t}</option>`).join('')}</select></label>
    <label><span>Cerrar solo tras minutos sin usar</span><select data-c="lock">${[2,5,10,15].map(n=>`<option ${+c.lock===n?'selected':''}>${n}</option>`).join('')}</select></label>
    <small>El expediente nunca entra a la memoria de Capri, ni a sus pláticas, ni a la biblioteca. Al acomodar con Gemini se tapan nombre, apellidos, CURP, domicilio, teléfonos, número de expediente y responsable.</small></fieldset>
   <fieldset><legend>Formatos oficiales de tu institución <i>· 5.13</i></legend>
    <small>Sube el formato en blanco que usa tu hospital (PDF, Word, foto…). Capri saca sus apartados y los agrega a ese documento como campos extra; los mínimos de la NOM siempre se quedan.</small>
    <div class="row"><select id="exFT" style="width:auto">${ORDEN.map(t=>`<option value="${t}">${esc(DOCS[t][0])}</option>`).join('')}</select><button class="mini" data-a="formato">⬆ Subir formato</button><input type="file" id="exFF" style="display:none" accept=".pdf,.docx,.doc,.odt,.rtf,.txt,.md,.html,.jpg,.jpeg,.png,.webp"></div>
    ${(ex.formatos||[]).map(f=>`<div class="row"><label class="ck" style="flex-direction:row;gap:6px"><input type="checkbox" data-fmt="${f.id}" ${f.on?'checked':''} style="width:auto"> ${esc(f.nombre)} → ${esc(DOCS[f.tipo][0])} (${f.campos.length} apartados)</label><span class="sp"></span><button class="mini" data-delfmt="${f.id}">✕</button></div>`).join('')}
    <small id="exFMsg"></small></fieldset>
   <fieldset><legend>Respaldo y llave</legend>
    <div class="row"><button class="mini" data-a="respaldo">⬇ Respaldo cifrado</button><button class="mini" data-a="restaurar">⬆ Restaurar respaldo</button><input type="file" id="exRF" style="display:none" accept=".capriexp,.json"><button class="mini" data-a="llave">Cambiar llave</button><button class="mini" data-a="bit">Bitácora de accesos</button><button class="mini" data-a="aviso">Modelo de aviso de privacidad</button></div>
    <small>Conserva los expedientes al menos 5 años desde el último acto médico (5.4): Capri no deja borrar antes sin que lo confirmes. Guarda el respaldo cifrado en una memoria USB tuya.</small><small id="exRMsg"></small></fieldset>
  </div>`);}
function vBit(){H(lado()+`<div class="main"><div class="row"><h3>Bitácora de accesos</h3><span class="sp"></span><button class="mini" data-a="cfg">← Ajustes</button></div>
  <div>${ex.aud.slice(-300).reverse().map(a=>{const p=ex.pacs.find(x=>x.id===a.p);return `<div class="doc" style="cursor:default"><em>${esc(new Date(a.ts).toLocaleString('es-MX'))}</em><span>${esc(a.acc)}</span><em>${p?esc(p.nexp):''}</em></div>`;}).join('')}</div></div>`);}

// ---------- acciones ----------
async function accion(a,el){toque();const p=pac;
  if(a==='lock')return bloquear('a mano');
  if(a==='cfg'){vista={v:'cfg'};return render();}
  if(a==='lista'||a==='cancel'){vista={v:p?'pac':'lista'};return render();}
  if(a==='bit'){vista={v:'bit'};return render();}
  if(a==='nuevo'){pac=null;vista={v:'lista',nuevo:true};render();return sec.querySelector('[data-f="nombre"]')?.focus();}
  if(a==='crear'){const o={};sec.querySelectorAll('[data-f]').forEach(e=>o[e.dataset.f]=e.value.trim());
    const f=FICHA.filter(x=>x[2]&&x[0]!=='nexp'&&!o[x[0]]).map(x=>x[1]);if(f.length)return $e('exNMsg').textContent='Falta: '+f.join(', ')+'.';
    if(!$e('exCons').checked)return $e('exNMsg').textContent='Registra el aviso de privacidad y el consentimiento (o que es urgencia) para continuar.';
    if(o.curp&&!/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/i.test(o.curp))return $e('exNMsg').textContent='La CURP no tiene el formato correcto (18 caracteres).';
    if(o.fnac>hoyISO())return $e('exNMsg').textContent='La fecha de nacimiento es futura.';
    const n={id:uid(),...o,nexp:o.nexp||folio(),curp:(o.curp||'').toUpperCase(),consent:Date.now(),docs:[],hc:null,ts:Date.now(),upd:Date.now()};
    ex.pacs.push(n);pac=n;bit('creó paciente',n);await persistir();vista={v:'pac'};return render();}
  if(a==='ficha'){vista={v:'pac',ficha:!vista.ficha};return render();}
  if(a==='guardaFicha'){sec.querySelectorAll('[data-f]').forEach(e=>{p[e.dataset.f]=e.value.trim();});p.curp=(p.curp||'').toUpperCase();p.upd=Date.now();bit('editó la ficha',p);await persistir();vista={v:'pac'};return render();}
  if(a==='borrarPac'){const anios=(Date.now()-ultimoActo(p))/(365.25*864e5);
    if(anios<5&&prompt(`La ${NOM} (5.4) pide conservar el expediente al menos 5 años desde el último acto médico (aquí: ${anios.toFixed(1)} años).\nSolo bórralo si fue un error de captura. Escribe BORRAR para confirmar.`)!=='BORRAR')return;
    if(anios>=5&&!confirm('¿Eliminar definitivamente el expediente de '+nombreDe(p)+'?'))return;
    ex.pacs=ex.pacs.filter(x=>x!==p);bit('eliminó paciente '+p.nexp);pac=null;await persistir();vista={v:'lista'};return render();}
  if(a==='volver'){leeDoc();await persistir();vista={v:'pac'};return render();}
  if(a==='guardar'){leeDoc();await persistir();pintaRev('<div class="ok">Borrador guardado (cifrado).</div>');return;}
  if(a==='expandir'){sec.querySelectorAll('textarea[data-k],input[data-k]:not([data-k^="sv_"])').forEach(e=>{e.value=expandir(e.value);});leeDoc();pintaRev();return;}
  if(a==='borrarDoc'){if(!confirm('¿Descartar este borrador?'))return;
    p.docs=p.docs.filter(x=>x.id!==vista.d);bit('descartó borrador',p);await persistir();vista={v:'pac'};return render();}
  if(a==='apoyo'){const m=$e('exApMsg');el.disabled=true;m.textContent='Buscando en tus apuntes y pensando…';
    try{await apoyo(p);render();}catch(e){m.textContent='✖ '+e.message;el.disabled=false;}return;}
  if(a==='apoyoNota'){const r=p.apoyo;if(!r?.dif?.length)return;
    const t='Diagnósticos diferenciales a considerar (sugerencia de Capri con base en los apuntes; pendiente de validar por el médico responsable):\n'+r.dif.map((d,i)=>`${i+1}. ${d.dx}${d.a_favor.length?'. A favor: '+d.a_favor.filter(x=>x.ok).map(x=>x.t).join('; '):''}${d.falta.length?'. Pendiente: '+d.falta.join('; '):''}`).join('\n');
    const d={id:uid(),tipo:'evolucion',fecha:hoyISO(),hora:horaAhora(),c:{dx:t},ts:Date.now(),ia:{dx:1},iaVal:{dx:t},nuevas:{dx:{c:[],p:['sugerencia de Capri']}}};
    p.docs.push(d);bit('llevó los diferenciales de Capri a una nota en borrador',p);await persistir();vista={v:'doc',d:d.id};return render();}
  if(a==='organizar')return organizarUI();
  if(a==='dictar')return dictar(el);
  if(a==='firmar'){const d=leeDoc(),v=d.c,f=faltan(camposDe(d.tipo),v);if(!d.elab)return pintaRev('<div class="warn">Escribe el nombre completo de quien elabora (5.10).</div>');
    if(f.length&&!confirm('Faltan '+f.length+' apartado(s) mínimos de la norma:\n- '+f.slice(0,8).join('\n- ')+'\n\n¿Firmar de todos modos? Ya no podrás editarla, solo agregar notas aclaratorias.'))return;
    if(Object.keys(d.nuevas||{}).length&&!confirm('Hay apartados con datos que Capri escribió y no venían en tu dictado (en amarillo). ¿Ya los revisaste?'))return;
    if(!f.length&&!confirm('Al firmar, la nota queda sellada y ya no se edita (5.11: sin enmendaduras). ¿Firmar?'))return;
    const cuerpo=JSON.stringify({tipo:d.tipo,fecha:d.fecha,hora:d.hora,v,elab:d.elab,ced:d.ced,pac:p.id});
    const h=[...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(cuerpo)))].map(b=>b.toString(16).padStart(2,'0')).join('');
    d.firma={ts:Date.now(),nombre:d.elab,ced:d.ced,hash:h};delete d.ia;delete d.nuevas;bit('firmó '+DOCS[d.tipo][0],p);await persistir();return render();}
  if(a==='aclarar'){const t=$e('exAdd').value.trim();if(!t)return;const d=p.docs.find(x=>x.id===vista.d);(d.add=d.add||[]).push({ts:Date.now(),t,autor:ex.cfg.med?.nombre||'—'});bit('nota aclaratoria',p);await persistir();return render();}
  if(a==='imprimir'){const d=leeDoc();await persistir();bit('imprimió '+DOCS[d.tipo][0],p);return imprimir(p,[d]);}
  if(a==='imprimirTodo'){bit('imprimió el expediente completo',p);await persistir();return imprimir(p,p.docs.slice().sort((a,b)=>(a.fecha+a.hora).localeCompare(b.fecha+b.hora)));}
  if(a==='respaldo'){const blob=new Blob([JSON.stringify({app:'capri-expediente',...await sellar(ex)})],{type:'application/json'});const u=URL.createObjectURL(blob),l=document.createElement('a');
    l.href=u;l.download='expediente-'+hoyISO()+'.capriexp';l.click();setTimeout(()=>URL.revokeObjectURL(u),2000);bit('descargó respaldo cifrado');await persistir();return;}
  if(a==='restaurar')return $e('exRF').click();
  if(a==='llave'){const n=prompt('Nueva llave (mínimo 8 caracteres):');if(!n)return;if(n.length<8)return alert('Mínimo 8 caracteres.');if(prompt('Repítela:')!==n)return alert('No coinciden.');await cambiarLlave(n);return alert('Llave cambiada. Tus respaldos viejos siguen abriendo con la llave vieja.');}
  if(a==='aviso')return avisoPrivacidad();
  if(a==='formato')return $e('exFF').click();}
async function organizarUI(){const d=leeDoc(),p=pac,txt=$e('exDict').value.trim();if(!txt)return $e('exOrgMsg').textContent='Escribe o dicta algo primero.';
  const msg=$e('exOrgMsg');msg.textContent='Capri está acomodando…';sec.querySelector('[data-a="organizar"]').disabled=true;
  try{const r=await organizar(d.tipo,txt,p);const v=d.c;d.ia=d.ia||{};d.iaVal=d.iaVal||{};d.nuevas=Object.assign(d.nuevas||{},r.nuevas);let n=0,choque=[];
    for(const [k,val] of Object.entries(r.out)){if(String(v[k]||'').trim()&&String(v[k]).trim()!==val){choque.push(k);continue;}v[k]=val;d.ia[k]=1;d.iaVal[k]=val;n++;}
    d.dict=txt;await persistir();render();
    pintaRev(`<div class="ok">◆ Capri acomodó ${n} apartado(s) con ${esc(r.quien)}. Lo marcado en cian lo puso ella: revísalo.${choque.length?' No tocó '+choque.length+' apartado(s) que ya habías escrito.':''}</div>`+
      (r.dudas.length?`<div class="sub" style="margin-top:6px">Dudas de Capri</div><ul class="chk">${r.dudas.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''));}
  catch(e){msg.textContent=e.message;}finally{const b=sec?.querySelector('[data-a="organizar"]');if(b)b.disabled=false;}}
// dictar: reconocimiento de voz del navegador (en Edge/Chrome, es-MX). Si no hay, se escribe.
let rec=null;function dictar(btn){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return alert('Este navegador no deja dictar; escribe o pega el texto.');
  if(rec){rec.stop();return;}rec=new SR();rec.lang='es-MX';rec.continuous=true;rec.interimResults=false;const ta=$e('exDict');btn.textContent='■ Detener';
  rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)ta.value+=(ta.value&&!/\s$/.test(ta.value)?' ':'')+e.results[i][0].transcript.trim()+'.';toque();};
  rec.onend=()=>{rec=null;btn.textContent='🎙 Dictar';};rec.start();}
function avisoPrivacidad(){const E=ex.cfg.est||{},M=ex.cfg.med||{};const w=window.open('','_blank');if(!w)return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Aviso de privacidad</title><style>body{font:14px/1.6 Georgia,serif;max-width:720px;margin:40px auto;color:#111}h1{font-size:20px}small{color:#555}</style>
  <h1>Aviso de privacidad integral (modelo)</h1><small>Modelo de apoyo generado por Capri: revísalo con tu institución antes de usarlo.</small>
  <p><b>Responsable:</b> ${esc(M.nombre||'[nombre del médico o establecimiento]')}${E.nombre?', '+esc(E.nombre):''}, con domicilio en ${esc(E.dom||'[domicilio]')}.</p>
  <p><b>Datos que se tratan:</b> de identificación y contacto, y <b>datos personales sensibles</b> sobre su estado de salud presente y futuro, antecedentes y resultados de estudios.</p>
  <p><b>Finalidades:</b> integrar y conservar su expediente clínico conforme a la ${NOM}, prestarle atención médica, darle seguimiento y, en su caso, referirle a otro establecimiento.</p>
  <p><b>Transferencias:</b> solo a autoridades sanitarias o judiciales que lo requieran por ley, o a otro prestador de servicios cuando usted lo solicite o sea necesario para su atención.</p>
  <p><b>Derechos ARCO:</b> puede acceder, rectificar, cancelar u oponerse al tratamiento de sus datos, así como revocar su consentimiento, solicitándolo por escrito a ${esc(M.nombre||'[responsable]')}${E.dom?' en '+esc(E.dom):''}. Algunas solicitudes pueden estar limitadas por la obligación legal de conservar el expediente al menos 5 años.</p>
  <p><b>Seguridad:</b> su expediente se guarda cifrado y solo tiene acceso el personal de salud que le atiende.</p>
  <p><b>Consentimiento expreso:</b> Consiento que mis datos personales sensibles sean tratados conforme a este aviso.</p>
  <p>Nombre y firma: ______________________________ &nbsp; Fecha: ______________</p><script>print()<\/script>`);w.document.close();}
// imprimir: hoja con encabezado del establecimiento, datos del paciente (5.9), apartados con su numeral y firma (5.10)
function imprimir(p,docs){const E=ex.cfg.est||{};const w=window.open('','_blank');if(!w)return alert('Permite ventanas emergentes para imprimir.');
  const fila=(f,v)=>{if(f[3]==='sv'){const s=SV.filter(([k])=>v['sv_'+k]).map(([k,l])=>l.replace(/ \(.*/,'')+': '+v['sv_'+k]+' '+(l.match(/\((.*)\)/)?.[1]||'')).join(' · ');return `<h3>${esc(f[1])}</h3><p>${s?esc(s):'<i>— sin dato</i>'}</p>`;}
    const x=v[f[0]];if(!x&&!f[2])return '';return `<h3>${esc(f[1])}</h3><p>${x?esc(x).replace(/\n/g,'<br>'):'<i>— sin dato</i>'}</p>`;};
  const hoja=d=>{const T=DOCS[d.tipo],v=d.c,gs=d.tipo==='hc'?HC:[[T[0],T[1],T[2]]];
    return `<section><header><div><b>${esc(E.inst||'')}</b><br>${esc(E.nombre||'[establecimiento]')}${E.tipo?' · '+esc(E.tipo):''}<br><small>${esc(E.dom||'')}</small></div><div style="text-align:right"><b>${esc(T[0].toUpperCase())}</b><br><small>${NOM} · ${esc(T[1])}</small></div></header>
    <table><tr><td><b>Paciente:</b> ${esc(nombreDe(p))}</td><td><b>Edad:</b> ${esc(edad(p,d.fecha))}</td><td><b>Sexo:</b> ${esc(p.sexo)}</td></tr><tr><td><b>Expediente:</b> ${esc(p.nexp)}${d.cama?' · <b>Cama:</b> '+esc(d.cama):''}</td><td><b>Fecha:</b> ${esc(fechaL(d.fecha))}</td><td><b>Hora:</b> ${esc(d.hora)}</td></tr>
    ${d.tipo==='hc'?`<tr><td colspan="3"><b>Ficha de identificación:</b> ${esc(['Nacimiento '+fechaL(p.fnac),p.curp&&'CURP '+p.curp,p.domicilio,p.tel&&'Tel. '+p.tel,p.ocup,p.escol,p.civil,p.origen,p.etnia,p.afil,p.sangre&&'Grupo y Rh '+p.sangre,p.resp&&'Responsable: '+p.resp].filter(Boolean).join(' · '))}</td></tr>`:''}
    ${p.alergias?`<tr><td colspan="3" style="color:#b00"><b>ALERGIAS:</b> ${esc(p.alergias)}</td></tr>`:''}</table>
    ${gs.map(([t,,cs])=>(d.tipo==='hc'?`<h2>${esc(t)}</h2>`:'')+cs.map(f=>fila(f,v)).join('')).join('')}${extrasDe(d.tipo).map(f=>fila(f,v)).join('')}
    ${(d.add||[]).map(a=>`<h3>Nota aclaratoria · ${esc(new Date(a.ts).toLocaleString('es-MX'))}</h3><p>${esc(a.t)}</p>`).join('')}
    <footer><div>Elaboró: <b>${esc(d.elab||'')}</b>${d.ced?' · Cédula profesional '+esc(d.ced):''}<br><br>Firma: ________________________</div>${d.valida?`<div>Validó: <b>${esc(d.valida)}</b><br><br>Firma: ________________________</div>`:''}
    ${['consentimiento','voluntario'].includes(d.tipo)?'<div>Paciente o representante: ____________________<br><br>Testigo 1: ________________ Testigo 2: ________________</div>':''}</footer>
    ${d.firma?`<small>Sellado en Capri el ${esc(new Date(d.firma.ts).toLocaleString('es-MX'))} · huella SHA-256 ${esc(d.firma.hash)}</small>`:'<small>BORRADOR</small>'}</section>`;};
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(p.nexp)} · ${esc(nombreDe(p))}</title><style>
  body{font:12.5px/1.45 Arial,Helvetica,sans-serif;color:#111;margin:0}section{padding:18mm 16mm;page-break-after:always}header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}td{border:1px solid #999;padding:4px 6px;vertical-align:top}h2{font-size:13px;background:#eee;padding:3px 6px;margin:12px 0 4px;text-transform:uppercase}
  h3{font-size:11.5px;margin:8px 0 1px;text-transform:uppercase;color:#333}p{margin:0 0 4px;white-space:normal}i{color:#888}footer{display:flex;gap:30px;margin-top:22px;flex-wrap:wrap}small{color:#666;font-size:10px}
  @page{size:letter;margin:0}</style>${docs.map(hoja).join('')}<script>print()<\/script>`);w.document.close();}

// ---------- eventos ----------
function montar(el){if(sec)return;sec=el;
  sec.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)return accion(b.dataset.a,b);
    const it=e.target.closest('[data-p]');if(it){if(vista.v==='doc')leeDoc();pac=ex.pacs.find(x=>x.id===it.dataset.p);bit('abrió expediente',pac);persistir();vista={v:'pac'};return render();}
    const n=e.target.closest('[data-new]');if(n){const t=n.dataset.new;if(t==='hc'&&pac.docs.some(d=>d.tipo==='hc'&&!d.firma)){vista={v:'doc',d:pac.docs.find(d=>d.tipo==='hc'&&!d.firma).id};return render();}
      const prev=t==='hc'&&pac.docs.filter(x=>x.tipo==='hc').sort((a,b)=>(b.fecha+b.hora).localeCompare(a.fecha+a.hora))[0];
      const d={id:uid(),tipo:t,fecha:hoyISO(),hora:horaAhora(),c:prev?JSON.parse(JSON.stringify(prev.c)):{},ts:Date.now()};  // una historia nueva parte de la anterior
      if(t==='referencia')d.c.envia=[ex.cfg.est?.nombre,ex.cfg.est?.dom].filter(Boolean).join(', ');if(t==='consentimiento'){d.c.titulo='Carta de consentimiento bajo información';d.c.medico=ex.cfg.med?.nombre||'';}
      pac.docs.push(d);bit('creó '+DOCS[t][0],pac);persistir();vista={v:'doc',d:d.id};return render();}
    const dd=e.target.closest('[data-d]');if(dd){vista={v:'doc',d:dd.dataset.d};const d=pac.docs.find(x=>x.id===dd.dataset.d);bit('consultó documento',pac);return render();}
    const lk=e.target.closest('[data-lec]');if(lk){e.preventDefault();const [s1,id,pg]=lk.dataset.lec.split('|');return window.verLectura?.(s1,id,+pg||0);}
    const df=e.target.closest('[data-delfmt]');if(df){ex.formatos=ex.formatos.filter(f=>f.id!==df.dataset.delfmt);persistir();return render();}});
  sec.addEventListener('input',e=>{toque();if(e.target.id==='exBus'){vista.q=e.target.value;const q=e.target.value;render();const i=$e('exBus');i.focus();i.setSelectionRange(q.length,q.length);return;}
    if(e.target.dataset.k?.startsWith('sv_')||e.target.dataset.k)clearTimeout(montar.t),montar.t=setTimeout(()=>{if(vista.v==='doc'){leeDoc();pintaRev();imc();}},350);});
  sec.addEventListener('change',async e=>{const t=e.target;toque();
    if(t.dataset.c){const [a,b]=t.dataset.c.split('.');if(b){ex.cfg[a]=ex.cfg[a]||{};ex.cfg[a][b]=t.value.trim();}else ex.cfg[a]=a==='lock'?+t.value:t.value;await persistir();return;}
    if(t.dataset.fmt){const f=ex.formatos.find(x=>x.id===t.dataset.fmt);if(f)f.on=t.checked;await persistir();return;}
    if(t.id==='exRF'&&t.files[0]){const m=$e('exRMsg');try{const j=JSON.parse(await t.files[0].text());if(j.app!=='capri-expediente')throw new Error('no es un respaldo del expediente');
        const pass=prompt('Llave con la que se hizo ese respaldo:');if(!pass)return;const datos=await abrirSello(j,await derivar(pass,fromB64(j.salt)));
        const nuevos=(datos.pacs||[]).filter(x=>!ex.pacs.some(y=>y.id===x.id));if(!confirm('El respaldo trae '+(datos.pacs||[]).length+' paciente(s); '+nuevos.length+' no están aquí. ¿Agregarlos? (No se sobrescribe nada.)'))return;
        ex.pacs.push(...nuevos);bit('restauró respaldo ('+nuevos.length+' pacientes)');await persistir();m.textContent='✓ Agregados '+nuevos.length+' paciente(s).';}
      catch(err){m.textContent='No se pudo: '+(/decrypt|operation/i.test(err.message)?'llave incorrecta':err.message);}t.value='';return;}
    if(t.id==='exFF'&&t.files[0]){const m=$e('exFMsg'),f=t.files[0];m.textContent='Leyendo '+f.name+'…';
      try{const txt=window.bibLeer?await window.bibLeer(f):await f.text();const cs=apartadosDe(txt);if(!cs.length)throw new Error('no encontré apartados (títulos en mayúsculas o que terminen en «:»)');
        const sel=prompt('Encontré estos apartados. Deja solo los que quieras (separados por «;»):',cs.join('; '));if(!sel)return;
        ex.formatos.push({id:uid(),tipo:$e('exFT').value,nombre:f.name.replace(/\.[^.]+$/,''),campos:sel.split(';').map(s=>s.trim()).filter(Boolean),on:true});await persistir();render();}
      catch(err){m.textContent='No se pudo: '+err.message;}t.value='';}});}
addEventListener('hud:view',async e=>{const {v,el}=e.detail||{};if(v!=='expediente'||!el)return;montar(el);if(!ex)await cargar();render();});
window.openExpediente=()=>{if(window.hudGo)window.hudGo('expediente');};
window.expedienteInfo=()=>({abierto:!!ex,pacs:ex?ex.pacs.length:null});
// comando en el chat
const _send=send;
send=async v=>{const k=(v||'').trim().toLowerCase();if(/^(expediente|expedientes)$/.test(k)&&!busy){line('u',v.trim());window.openExpediente();return;}
  await _send(v);if(k==='help')line('t','  expediente — Expediente clínico (NOM-004), cifrado, para personas reales');};
// pruebas: funciones puras sin interfaz
window.__expTest={resumenClinico,alarmas,alarmasSV,abreviaturas,expandir,revisaSV,revisaTx,faltan,camposDe,signosDe,cifrasNuevas,tapar,apartadosDe,edad,DOCS,HC};
})();
