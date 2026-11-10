// ================= RECETA MÉDICA (2.18) =================
// Capri diseña la receta para imprimirla (o guardarla en PDF desde el mismo cuadro de impresión).
// - Desde el EXPEDIENTE (botón ℞ en el paciente o en una nota) se llena sola: nombre, edad, sexo, peso, talla, signos,
//   alergias y diagnóstico; y Capri la redacta con el tratamiento de la última nota.
// - Con el comando «receta» se abre en blanco (no se guarda nada del paciente fuera del expediente cifrado).
// Lo que pide la ley en México (Reglamento de Insumos para la Salud, arts. 28 a 31):
//   · art. 29: nombre, domicilio completo y cédula profesional de quien prescribe, fecha y firma autógrafa.
//   · art. 30: dosis, presentación, vía de administración, frecuencia y tiempo de duración del tratamiento.
//   · art. 31: denominación genérica (la marca es opcional).
//   · art. 28: la emiten médicos (y pasantes en servicio social); un estudiante NO firma recetas: firma el médico con cédula.
// Capri no inventa: lo que redacta con IA se compara contra lo que había escrito (cifras nuevas = amarillo), revisa alergias,
// interacciones y dosis con el verificador de R.I.P, y avisa de antibióticos y medicamentos controlados.
// Hasta que el médico marca «Ya la revisé», la hoja sale con la marca BORRADOR.
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=t=>String(t??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const hoyISO=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
const fechaL=f=>f?new Date(f+'T12:00').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}):'';
const cap=s=>{s=String(s||'').trim();return s?s[0].toUpperCase()+s.slice(1):s;};

// ---------- ajustes de diseño y de quien prescribe (no son datos de pacientes) ----------
const KEY='capri_receta';
const DEF={plantilla:'clasica',tam:'media',color:'#0e5a8a',logo:'',mostrarDx:true,mostrarSV:true,copias:1,leyenda:'',
  emisor:{nombre:'',ced:'',esp:'',cedEsp:'',inst:'',dom:'',tel:'',correo:'',horario:''},estudiante:''};
let C=(()=>{try{const j=JSON.parse(localStorage.getItem(KEY)||'{}');return {...DEF,...j,emisor:{...DEF.emisor,...(j.emisor||{})}};}catch(e){return JSON.parse(JSON.stringify(DEF));}})();
const guardaC=()=>{try{localStorage.setItem(KEY,JSON.stringify(C));}catch(e){}};
const folioNuevo=()=>{let n=0;try{n=+(localStorage.getItem(KEY+'_folio')||0)+1;localStorage.setItem(KEY+'_folio',n);}catch(e){n=Date.now()%10000;}return 'RX-'+new Date().getFullYear()+'-'+String(n).padStart(4,'0');};

// ---------- leer un renglón de tratamiento («amoxicilina 500 mg VO c/8h x 7 días») sin IA ----------
const VIAS=[[/\b(v\.?o\.?|oral|v[ií]a oral|por boca)\b/i,'vía oral'],[/\b(i\.?v\.?|e\.?v\.?|intraven\w*|endoven\w*)\b/i,'vía intravenosa'],[/\b(i\.?m\.?|intramusc\w*)\b/i,'vía intramuscular'],
 [/\b(s\.?c\.?|subcut[aá]ne\w*)\b/i,'vía subcutánea'],[/\b(s\.?l\.?|sublingual)\b/i,'vía sublingual'],[/\bt[oó]pic\w*|\bsobre la piel\b|\baplicar en\b/i,'vía tópica'],
 [/\boft[aá]lmic\w*|\ben (el |los |cada )?ojos?\b/i,'vía oftálmica'],[/\b[oó]tic\w*|\ben (el |los |cada )?o[ií]dos?\b/i,'vía ótica'],[/\binhala\w*|\bnebuliz\w*/i,'vía inhalada'],
 [/\bnasal\b|\bfosas? nasal/i,'vía nasal'],[/\brectal\b/i,'vía rectal'],[/\bvaginal\b/i,'vía vaginal'],[/\btransd[eé]rmic\w*/i,'vía transdérmica']];
const FORMAS=[[/\btab(?:letas?|s?)\b|\bcomprimidos?\b/i,'tabletas','tableta'],[/\bc[aá]ps(?:ulas?)?\b|\bcap\b/i,'cápsulas','cápsula'],[/\bgrageas?\b/i,'grageas','gragea'],
 [/\bjarabe\b/i,'jarabe',''],[/\bsuspensi[oó]n\b|\bsusp\b/i,'suspensión',''],[/\bsoluci[oó]n\b|\bsol\b/i,'solución',''],[/\bamp(?:olletas?|ulas?|s?)\b|\bamp\b/i,'ampolletas','ampolleta'],
 [/\bcrema\b/i,'crema',''],[/\bung[uü]ento\b/i,'ungüento',''],[/\bgel\b/i,'gel',''],[/\bgotas\b/i,'gotas',''],[/\bparches?\b/i,'parches','parche'],[/\b[oó]vulos?\b/i,'óvulos','óvulo'],
 [/\bsupositorios?\b/i,'supositorios','supositorio'],[/\binhalador\b|\baerosol\b/i,'inhalador',''],[/\bsobres?\b/i,'sobres','sobre'],[/\bpolvo\b/i,'polvo','']];
const NUMTXT={media:'1/2',un:'1',una:'1',uno:'1',dos:'2',tres:'3',cuatro:'4'};
const UNID=/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)\s*(mg\/\s*\d*\s*ml|mg\/kg|mcg|µg|ug|mg|g|ui|u\.?i\.?|%)(?![a-z])/i;
const INDIC=/(en ayunas|con (?:los )?alimentos|despu[eé]s de (?:los )?alimentos|antes de (?:los )?alimentos|antes de (?:cada )?comida|despu[eé]s de (?:cada )?comida|antes de dormir|al acostarse|por la (?:noche|mañana)|en la (?:noche|mañana)|si (?:hay |tiene |presenta )?(?:dolor|fiebre|n[aá]usea|v[oó]mito)[^,;.]*|en caso de [^,;.]*|no (?:suspender|masticar|tomar con)[^,;.]*)/i;
function frecuencia(s){let m;
  if(m=s.match(/(?:c\/|cada|q)\s*(\d+)\s*(?:h|hr|hrs|horas?)\b/i))return 'cada '+m[1]+' horas';
  if(m=s.match(/\b(\d+)\s*(?:h|hrs|horas)\b/i)&&/c\/|cada/i.test(s))return 'cada '+m[1]+' horas';
  if(m=s.match(/cada\s+(\d+)\s*d[ií]as?/i))return 'cada '+m[1]+' días';
  if(m=s.match(/cada\s+(\d+)\s*semanas?|(una vez a la semana|semanal)/i))return m[1]?'cada '+m[1]+' semanas':'una vez a la semana';
  if(m=s.match(/(\d+|una|dos|tres|cuatro)\s*(?:veces|tomas)\s*(?:al|por|x)\s*d[ií]a/i))return (NUMTXT[norm(m[1])]||m[1])==='1'?'una vez al día':(NUMTXT[norm(m[1])]||m[1])+' veces al día';
  if(/\bbid\b/i.test(s))return 'cada 12 horas';if(/\btid\b/i.test(s))return 'cada 8 horas';if(/\bqid\b/i.test(s))return 'cada 6 horas';
  if(/\b(qd|al d[ií]a|diari\w*|una vez al d[ií]a|c\/24)\b/i.test(s))return 'una vez al día';
  if(/por la noche|en la noche|antes de dormir|al acostarse/i.test(s))return 'una vez al día, por la noche';
  if(/por la mañana|en la mañana|en ayunas/i.test(s))return 'una vez al día, por la mañana';
  if(/\bprn\b|por raz[oó]n necesaria|en caso de|si hay|si tiene|si presenta/i.test(s))return 'solo si es necesario';
  if(/dosis [uú]nica|una sola dosis|\bstat\b/i.test(s))return 'dosis única';return '';}
function duracion(s){let m;
  if(m=s.match(/(?:por|durante|x)\s*(\d+|una|dos|tres|cuatro)\s*(d[ií]as?|semanas?|mes(?:es)?)/i)){const n=NUMTXT[norm(m[1])]||m[1],u=norm(m[2]);
    return 'por '+n+' '+(u.startsWith('d')?(n==='1'?'día':'días'):u.startsWith('s')?(n==='1'?'semana':'semanas'):(n==='1'?'mes':'meses'));}
  if(m=s.match(/(\d+)\s*(d[ií]as)\b/i))return 'por '+m[1]+' días';
  if(/dosis [uú]nica|una sola dosis/i.test(s))return 'dosis única';
  if(/indefinid|permanente|continu|cr[oó]nic|de por vida|hasta nueva indicaci/i.test(s))return 'uso continuo hasta nueva indicación';return '';}
function leeRenglon(lin){let s=String(lin||'').replace(/^\s*(?:[-•*·]|\d+[.)-])\s*/,'').trim();if(!s)return null;
  const m={id:uid(),gen:'',com:'',pres:'',dosis:'',via:'',frec:'',dur:'',cant:'',ind:''};
  const c=s.match(/\(([^)]+)\)/);if(c&&!/\d/.test(c[1])){m.com=c[1].trim();s=s.replace(c[0],' ');}
  for(const [re,t] of VIAS)if(re.test(s)){m.via=t;break;}
  m.frec=frecuencia(s);m.dur=duracion(s);const ind=s.match(INDIC);if(ind&&!/^(por la|en la)/i.test(ind[1]))m.ind=cap(ind[1]);
  // la cantidad a surtir se saca primero para que «1 caja con 21 cápsulas» no se lea como dosis
  const cant=s.match(/(?:surtir|cantidad|dar)\s*:?\s*([^,;.]+)/i)||s.match(/\b(?:\d+|una|un)\s*(?:cajas?|frascos?|tubos?|envases?|blísters?)(?:\s+(?:con|de)\s+\d+\s*[a-záéíóúñ]+)?/i);
  if(cant){m.cant=(cant[1]||cant[0]).trim().replace(/^una?\b/i,'1');s=s.replace(cant[0],' ');}
  let forma=null;for(const f of FORMAS)if(f[0].test(s)){forma=f;break;}
  if(!forma&&m.cant)for(const f of FORMAS)if(f[0].test(m.cant)){forma=f;break;}
  const conc=s.match(UNID);
  // la dosis: «1 tableta», «2 cápsulas», «5 ml», «2 disparos»; si no, la concentración («omeprazol 20 mg c/24h» → 20 mg)
  const ds=s.match(/(\d+(?:[.,\/]\d+)?|media|una|uno|dos|tres)\s*(tabletas?|tab|c[aá]psulas?|cap|grageas?|ml|cucharadas?(?:itas?)?|gotas|disparos|puffs?|inhalaciones|aplicaci[oó]n(?:es)?|ampolletas?|sobres?|[oó]vulos?|supositorios?|parches?)\b/i);
  if(ds){const n=NUMTXT[norm(ds[1])]||ds[1];let u=ds[2].toLowerCase().replace(/^tab$/,'tableta').replace(/^cap$/,'cápsula');if(n==='1'||n==='1/2')u=u.replace(/(as|os|es)$/,(x)=>x==='es'?'':x[0]).replace(/ciones$/,'ción');m.dosis=n+' '+u;}
  else if(conc)m.dosis=conc[1]+' '+conc[2].replace(/\s+/g,'');
  if(!m.via&&forma&&/tabletas|c[aá]psulas|grageas|jarabe|suspensi|sobres/.test(forma[1]))m.via='vía oral';   // tabletas, cápsulas y jarabes son por boca salvo que digas otra vía
  m.pres=[forma?forma[1]:'',conc&&(ds||forma)?conc[1]+' '+conc[2].replace(/\s+/g,''):''].filter(Boolean).join(' de ');
  // el nombre: lo que va antes del primer número, de la forma o de la vía
  let corte=s.length;const cortes=[s.search(/\d/),forma&&forma[0].test(s)?s.search(forma[0]):-1,...VIAS.map(([re])=>s.search(re)),s.search(/\b(cada|c\/|tomar|aplicar|por|durante)\b/i)].filter(i=>i>0);
  if(cortes.length)corte=Math.min(...cortes);m.gen=cap(s.slice(0,corte).replace(/[,;:.\-–]+\s*$/,'').trim());
  return m;}
// ¿este renglón es un medicamento o una indicación general («dieta blanda», «reposo»)?
const esMed=l=>UNID.test(l)||FORMAS.some(f=>f[0].test(l))||/\b(c\/\d|cada \d+ ?h)/i.test(l)||!!window.ripReceta?.busca(l.replace(/\d.*$/,'').trim());
function leeTexto(txt){const meds=[],ind=[];
  for(const l of String(txt||'').split(/\n|;|(?<=\D)\.\s+(?=[A-ZÁÉÍÓÚÑ])/).map(x=>x.trim()).filter(Boolean)){if(esMed(l)){const m=leeRenglon(l);if(m&&m.gen)meds.push(m);}else ind.push(cap(l.replace(/\.$/,'')));}
  return {meds,ind:ind.join('.\n')+(ind.length?'.':'')};}

// ---------- revisión: lo que pide la ley y lo que puede hacer daño ----------
const ANTIB=/amoxicil|ampicil|penicil|dicloxacil|bencilpenic|cefalex|cefadrox|cefurox|ceftriax|cefixim|cefotax|cefepim|cefaclor|cefprozil|cefpodox|azitromic|claritromic|eritromic|ciproflox|levoflox|moxiflox|norflox|ofloxac|doxicic|tetracic|minocic|trimetoprim|sulfametox|nitrofurant|metronidaz|tinidaz|secnidaz|clindamic|gentamic|amikac|tobramic|vancomic|linezol|fosfomic|rifampic|rifaximin|isoniaz|imipenem|meropenem|ertapenem|cloranfenic|neomic|mupiroc|ac[ií]do fus[ií]dico/;
const ESTUPEF=/morfina|fentanil|oxicodon|metadona|hidromorfon|meperidin|petidin|tapentadol|buprenorf|code[ií]na|hidrocodon|nalbufin|dextropropox/;
const PSICO=/diazepam|clonazepam|alprazolam|lorazepam|bromazepam|midazolam|triazolam|clordiazep|flunitraz|clobazam|zolpidem|zopiclon|fenobarbital|metilfenidat|fentermin|anfepramon|mazindol|ketamina|lisdexanf|modafinil/;
function revisar(r){const F=[],A=[],I=[];   // F = falta (ley) · A = alertas de seguridad · I = informativo
  const E=r.emisor||{};
  if(!E.nombre)F.push('Nombre completo de quien prescribe (art. 29 RIS).');
  if(!E.ced)F.push('Cédula profesional de quien prescribe (art. 29 RIS): sin cédula no es una receta válida.');
  if(!E.dom)F.push('Domicilio completo de quien prescribe o del consultorio (art. 29 RIS).');
  if(!r.fecha)F.push('Fecha (art. 29 RIS).');
  if(!r.pac?.nombre)F.push('Nombre del paciente.');
  if(r.estudiante&&!E.ced)A.push({s:2,t:'Como estudiante no puedes firmar recetas (art. 28 RIS): la emite y firma tu médico adscrito, con su nombre y cédula.'});
  if(!r.meds.length)F.push('Al menos un medicamento.');
  r.meds.forEach((m,i)=>{const n=(i+1)+'. '+(m.gen||'(sin nombre)'),f=[];
    if(!m.gen)f.push('denominación genérica (art. 31)');if(!m.pres)f.push('presentación');if(!m.dosis)f.push('dosis');if(!m.via)f.push('vía de administración');
    if(!m.frec)f.push('frecuencia');if(!m.dur)f.push('duración del tratamiento');if(f.length)F.push(n+': falta '+f.join(', ')+' (art. 30 RIS).');
    const g=norm(m.gen+' '+m.com);
    if(ANTIB.test(g)){I.push(n+': antibiótico. La farmacia solo lo vende con receta y la sella o retiene (acuerdo de antibióticos, DOF 27/05/2010). Pon la cantidad exacta para todo el tratamiento.');if(!m.cant)A.push({s:1,t:n+': antibiótico sin cantidad a surtir.'});}
    if(ESTUPEF.test(g))A.push({s:3,t:n+': es estupefaciente. Se prescribe en el recetario especial con código de barras autorizado por COFEPRIS (art. 240 LGS y art. 50 RIS); no sirve una receta impresa en hoja simple.'});
    else if(PSICO.test(g))A.push({s:2,t:n+': es psicotrópico controlado. Según su grupo (art. 245 LGS) la farmacia retiene la receta o la registra, y algunos necesitan recetario especial: verifica el grupo antes de entregarla.'});
    if(m.ia&&m.nuevas?.length)A.push({s:2,t:n+': Capri puso cifras que no estaban en lo escrito ('+m.nuevas.join(', ')+'). Confírmalas o corrígelas.'});
    if(/mg\/kg/i.test(m.dosis))A.push({s:1,t:n+': la dosis va por kilo; escribe la dosis ya calculada para el paciente (lo que tomará de verdad).'});});
  // verificador de R.I.P: alergias, interacciones, dosis máximas, embarazo
  const V=window.ripReceta;
  if(V&&r.meds.length){const lineas=r.meds.filter(m=>m.gen).map(m=>{let mg=m.dosis;const n=parseFloat(String(m.dosis).replace(',','.').replace('1/2','0.5')),c=String(m.pres).match(UNID);
      if(c&&/tablet|c[aá]psul|gragea|sobre|supositor|[oó]vulo/.test(norm(m.dosis))&&n>0&&/^mg$|^g$|^mcg$/i.test(c[2]))mg=(n*parseFloat(c[1].replace(',','.')))+' '+c[2];
      return [m.gen,mg,m.via,m.frec].filter(Boolean).join(' ');});
    try{const meds=lineas.map(V.parsea),op={alergias:String(r.pac?.alergias||'').split(/[,;\n]/).map(s=>s.trim()).filter(s=>s&&!/^(negad|niega|ninguna|no conocid|sin alerg)/i.test(s)),kg:parseFloat(r.pac?.peso)||null,edad:r.pac?.anios??null,tfg:null,emb:!!r.pac?.emb};
      for(const h of V.revisa(meds,op))if(h.s>=1)A.push({s:h.s,t:h.quien+': '+h.t+(h.ref?' ('+h.ref+')':'')});}catch(e){}}
  return {F,A:A.sort((a,b)=>b.s-a.s),I};}

// ---------- Capri la redacta ----------
const nums=t=>(String(t).match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>x.replace(',','.'));
async function geminiJSON(sys,user){if(typeof cfg==='undefined'||!cfg.key||!cfg.model)throw new Error('No hay cerebro: ni tu GPU (Ollama) ni API key de Gemini.');
  const gc={temperature:.1,responseMimeType:'application/json',maxOutputTokens:3000};const tc=typeof thinkCfg==='function'?thinkCfg(cfg.model):null;if(tc)gc.thinkingConfig=tc;
  const r=await fetch(API+'models/'+encodeURIComponent(cfg.model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cfg.key},
    body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:gc})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error?.message||('Error '+r.status));
  const t=(j.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&p.text).map(p=>p.text).join('');
  try{return JSON.parse(t.replace(/^```(?:json)?|```$/g,''));}catch(e){throw new Error('Gemini no devolvió un formato válido.');}}
async function redactar(texto,ctx){
  const sys=`Eres el asistente que pasa a receta médica (México) la indicación terapéutica que escribió un médico. Reglas:
1. Usa SOLO lo que viene en el texto. No inventes ni completes dosis, presentaciones, vías, frecuencias, duraciones ni cantidades: si algo no viene, déjalo "" y ponlo en "dudas".
2. Denominación genérica en "gen" (art. 31 del Reglamento de Insumos para la Salud); si escribió una marca, va en "com" y en "gen" el genérico solo si estás seguro, si no, deja "gen" con lo que escribió y anótalo en "dudas".
3. Escribe para que el paciente entienda, sin abreviaturas: "VO" → "vía oral", "c/8h" → "cada 8 horas", "x 7 d" → "por 7 días".
4. Lo que no es medicamento (dieta, reposo, cuidados, datos de alarma, cuándo regresar) va en "indicaciones".
5. Los datos que identifican al paciente vienen tapados como [PACIENTE]; déjalos así.
Responde SOLO JSON: {"meds":[{"gen":"","com":"","pres":"tabletas de 500 mg","dosis":"1 tableta","via":"vía oral","frec":"cada 8 horas","dur":"por 7 días","cant":"1 caja con 21 tabletas","ind":"con alimentos"}],"indicaciones":"","dudas":[]}`;
  const user='Indicación del médico:\n"""\n'+(ctx?.tapar?ctx.tapar(texto):texto)+'\n"""';
  let j=null,quien='';
  if(window.cerebroInfo?.().ok&&window.cerebroJSON&&ctx?.motor!=='nube'&&ctx?.motor!=='manual'){j=await window.cerebroJSON(sys,user).catch(()=>null);if(j)quien='tu GPU';}
  if(!j&&ctx?.motor!=='local'&&ctx?.motor!=='manual'){
    if(ctx?.nubeOk||confirm('El cerebro de tu GPU no está disponible.\n\n¿Mandar el tratamiento a Google Gemini para acomodarlo en la receta? Solo va el texto del tratamiento'+(ctx?.tapar?', con los datos del paciente tapados':'')+'.')){
      ctx?.nubeSi?.();j=await geminiJSON(sys,user).catch(e=>{log?.('receta: '+String(e.message).slice(0,60),'w');return null;});if(j)quien='Gemini';}}
  const base=leeTexto(texto);
  if(!j)return {...base,quien:'Capri (sin IA, leyendo tu texto)',dudas:[]};
  const fuente=new Set(nums(texto));
  const meds=(Array.isArray(j.meds)?j.meds:[]).map(x=>{const m={id:uid(),ia:1};for(const k of ['gen','com','pres','dosis','via','frec','dur','cant','ind'])m[k]=String(x?.[k]??'').replace(/\[PACIENTE\]/g,'').trim();
    m.nuevas=[...new Set(nums(Object.values(m).join(' ')).filter(n=>!fuente.has(n)&&!/^[0-9]$/.test(n)))];m.gen=cap(m.gen);return m;}).filter(m=>m.gen);
  if(!meds.length&&base.meds.length)return {...base,quien:'Capri (sin IA, leyendo tu texto)',dudas:['La IA no devolvió medicamentos; los saqué de tu texto.']};
  return {meds,ind:String(j.indicaciones||'').replace(/\[PACIENTE\]/g,'el paciente').trim(),dudas:(Array.isArray(j.dudas)?j.dudas:[]).map(String),quien};}

// ---------- la hoja (la misma para vista previa e impresión) ----------
const renglonTxt=m=>{const toma=[m.dosis&&((/^(crema|ung|gel|gotas)/i.test(m.pres)?'Aplicar ':'Tomar ')+m.dosis),m.via,m.frec,m.dur].filter(Boolean).join(' ');
  return {tit:[m.gen,m.com?'('+m.com+')':'',m.pres].filter(Boolean).join(' '),toma:toma?cap(toma)+'.':'',extra:[m.ind&&cap(m.ind).replace(/\.?$/,'.'),m.cant&&'Surtir: '+m.cant+'.'].filter(Boolean).join(' ')};};
function hojaHTML(r,D,op={}){D=D||C;const E=r.emisor||{},P=r.pac||{},col=D.color||'#0e5a8a',media=D.tam==='media',pl=D.plantilla;
  const borr=!r.revisada,svs=[P.peso&&'Peso '+P.peso+' kg',P.talla&&'Talla '+P.talla+' m',P.ta&&'TA '+P.ta+' mmHg',P.temp&&'Temp. '+P.temp+' °C',P.fc&&'FC '+P.fc+' lpm'].filter(Boolean);
  const cab=`<div class="cab">${D.logo?`<img class="logo" src="${esc(D.logo)}">`:''}<div class="who"><div class="nom">${esc(E.nombre||'Nombre del médico')}</div>
     <div>${esc([E.esp||'Médico cirujano',E.inst].filter(Boolean).join(' · '))}</div>
     <div class="ced">Céd. Prof. ${esc(E.ced||'________')}${E.cedEsp?' · Céd. Esp. '+esc(E.cedEsp):''}</div></div>
     <div class="rx-fol"><div>${esc(fechaL(r.fecha))}</div><small>Folio ${esc(r.folio||'')}</small></div></div>`;
  const pac=`<table class="pac"><tr><td colspan="2"><b>Paciente:</b> ${esc(P.nombre||'')}</td><td><b>Edad:</b> ${esc(P.edad||'')}</td><td><b>Sexo:</b> ${esc(P.sexo||'')}</td></tr>
     ${D.mostrarSV&&svs.length?`<tr><td colspan="4">${esc(svs.join(' · '))}</td></tr>`:''}
     ${P.alergias?`<tr><td colspan="4" class="al"><b>Alergias:</b> ${esc(P.alergias)}</td></tr>`:''}
     ${D.mostrarDx&&r.dx?`<tr><td colspan="4"><b>Diagnóstico:</b> ${esc(r.dx)}</td></tr>`:''}</table>`;
  const meds=`<div class="rx">℞</div><ol class="meds">${(r.meds||[]).map(m=>{const t=renglonTxt(m);return `<li><b>${esc(t.tit)}</b>${t.toma?'<br>'+esc(t.toma):''}${t.extra?'<br><span class="ex">'+esc(t.extra)+'</span>':''}</li>`;}).join('')||'<li class="vac">— sin medicamentos —</li>'}</ol>
     ${r.ind?`<div class="ind"><b>Indicaciones:</b> ${esc(r.ind).replace(/\n/g,'<br>')}</div>`:''}${r.cita?`<div class="ind"><b>Próxima cita:</b> ${esc(r.cita)}</div>`:''}`;
  const pie=`<div class="pie"><div class="dom">${esc([E.dom,E.tel&&'Tel. '+E.tel,E.correo,E.horario].filter(Boolean).join(' · '))}${D.leyenda?'<br>'+esc(D.leyenda):''}${r.estudiante?'<br>Elaboró: '+esc(r.estudiante)+' (estudiante de medicina), bajo supervisión del médico que firma.':''}</div>
     <div class="firma"><div class="ln"></div>${esc(E.nombre||'Firma del médico')}<br><small>Firma autógrafa</small></div></div>`;
  const hoja=`<section class="hoja ${pl}">${pl==='moderna'?`<aside>${cab}</aside><main>${pac}${meds}</main>${pie}`:cab+pac+meds+pie}${borr?'<div class="borr">BORRADOR</div>':''}</section>`;
  const W=media?'8.5in':'8.5in',Hh=media?'5.5in':'11in';
  const css=`*{box-sizing:border-box}body{margin:0;background:${op.prev?'#d9dde2':'#fff'};font:${media?'11px':'12.5px'}/1.4 ${pl==='clasica'?'Georgia,"Times New Roman",serif':'"Segoe UI",Arial,Helvetica,sans-serif'};color:#111}
  .hoja{position:relative;width:${W};height:${Hh};padding:${media?'.32in .4in':'.55in .6in'};display:flex;flex-direction:column;overflow:hidden;background:#fff;page-break-after:always;${op.prev?'margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,.25)':''}}
  .cab{display:flex;gap:14px;align-items:center;border-bottom:2px solid ${col};padding-bottom:6px}.logo{max-height:${media?'52px':'70px'};max-width:110px;object-fit:contain}
  .who{flex:1}.nom{font-size:${media?'17px':'21px'};font-weight:700;color:${col};letter-spacing:.02em}.ced{font-size:.92em;color:#333}.rx-fol{text-align:right;font-size:.95em}.rx-fol small{color:#666}
  .pac{width:100%;border-collapse:collapse;margin:6px 0 2px;font-size:.95em}.pac td{border-bottom:1px solid #ccc;padding:2px 4px;vertical-align:top}.pac .al{color:#b00000}
  .rx{font:700 ${media?'26px':'34px'}/1 Georgia,serif;color:${col};margin:4px 0 0}.meds{margin:2px 0 4px;padding-left:22px;flex:1}.meds li{margin-bottom:${media?'4px':'8px'}}.meds .ex{color:#333;font-style:italic}.vac{color:#999}
  .ind{margin:2px 0;font-size:.95em}.pie{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;border-top:1px solid ${col};padding-top:4px;margin-top:auto;font-size:.85em;color:#333}
  .firma{text-align:center;min-width:${media?'190px':'230px'}}.firma .ln{border-bottom:1px solid #111;height:${media?'26px':'40px'};margin-bottom:2px}.firma small{color:#777}
  .borr{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 ${media?'64px':'90px'} Arial;color:rgba(200,0,0,.13);transform:rotate(-18deg);pointer-events:none}
  .hoja.moderna{display:grid;grid-template-columns:${media?'1.9in':'2.2in'} 1fr;grid-template-rows:1fr auto;column-gap:16px;padding-left:0}
  .moderna aside{background:${col};color:#fff;padding:${media?'.25in .2in':'.4in .25in'};grid-row:1/3}.moderna aside .cab{flex-direction:column;align-items:flex-start;border:0;gap:6px}
  .moderna aside .nom{color:#fff}.moderna aside .ced{color:#e6eef5}.moderna aside .rx-fol{text-align:left;margin-top:8px}.moderna aside .rx-fol small{color:#dfe8ef}.moderna .logo{background:#fff;padding:3px;border-radius:4px}
  .moderna main{display:flex;flex-direction:column;min-height:0}.moderna .pie{grid-column:2}
  .minima .cab{border-bottom:1px solid #111}.minima .nom,.minima .rx{color:#111}.minima .pie{border-top:1px solid #111}
  @page{size:${W} ${Hh};margin:0}@media print{body{background:#fff}.hoja{margin:0;box-shadow:none}}`;
  const n=Math.max(1,Math.min(3,+D.copias||1));
  const hojas=Array.from({length:n},(_,i)=>i&&!op.prev?hoja.replace('<section class="hoja','<section data-copia class="hoja').replace('</section>',`<div style="position:absolute;top:6px;right:10px;font:600 10px Arial;color:#888">COPIA ${i}</div></section>`):hoja).slice(0,op.prev?1:n).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Receta ${esc(r.folio||'')} · ${esc(P.nombre||'')}</title><style>${css}</style></head><body>${hojas}${op.print?'<script>onload=()=>setTimeout(()=>print(),250)<\/script>':''}</body></html>`;}
function imprimirHoja(r){const w=window.open('','_blank');if(!w)return alert('Permite ventanas emergentes para imprimir la receta.');w.document.write(hojaHTML(r,C,{print:true}));w.document.close();}

// ---------- ventana del diseñador ----------
const st=document.createElement('style');st.textContent=`
.rxo{position:fixed;inset:0;z-index:9000;background:rgba(4,1,2,.9);backdrop-filter:blur(3px);display:flex;flex-direction:column;font:13px/1.45 var(--mono,monospace);color:#ffd9dc}
.rxo .top{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #3b1418}.rxo .top h3{margin:0;font:600 15px var(--sans,sans-serif);letter-spacing:.12em;color:var(--hr,#ff4d5e);text-transform:uppercase}
.rxo .sp{flex:1}.rxo .body{flex:1;display:grid;grid-template-columns:minmax(360px,1fr) minmax(380px,1.15fr);gap:14px;min-height:0;padding:12px 16px}
.rxo .ed{overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding-right:6px}.rxo .pv{display:flex;flex-direction:column;gap:8px;min-height:0}
.rxo .pvw{flex:1;overflow:auto;background:#1a0b0e;border:1px solid #3b1418;padding:10px}.rxo iframe{border:0;background:transparent;transform-origin:0 0;display:block}
.rxo fieldset{border:1px solid #3b1418;padding:9px 11px;margin:0;display:flex;flex-direction:column;gap:7px;background:rgba(10,4,6,.6)}
.rxo legend{color:var(--hr,#ff4d5e);font:600 11px var(--sans,sans-serif);letter-spacing:.14em;text-transform:uppercase;padding:0 6px}.rxo legend i{color:#a0565e;font-style:normal;font-weight:400}
.rxo input,.rxo select,.rxo textarea{background:#0a0506;border:1px solid #3b1418;color:#ffe3e6;font:12.5px var(--mono,monospace);padding:6px 8px;width:100%;box-sizing:border-box}
.rxo textarea{resize:vertical;min-height:52px}.rxo input:focus,.rxo textarea:focus,.rxo select:focus{outline:0;border-color:var(--hc,#5ef6ff)}
.rxo label{display:flex;flex-direction:column;gap:3px;font:11px var(--mono,monospace);color:#c98d93}.rxo .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px}
.rxo .row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.rxo .mini{font:11px var(--mono,monospace);background:none;border:1px solid #3b1418;color:#ffd9dc;padding:5px 9px;cursor:pointer}
.rxo .mini:hover{border-color:var(--hc,#5ef6ff);color:var(--hc,#5ef6ff)}.rxo .med{border-left:2px solid #3b1418;padding:6px 8px;display:flex;flex-direction:column;gap:5px;background:rgba(255,77,94,.03)}
.rxo .med.ia{border-color:var(--hc,#5ef6ff)}.rxo .med.nv{border-color:var(--hg,#f3c84b)}.rxo .med .hd{display:flex;gap:6px;align-items:center}.rxo .med .hd b{color:#ffe3e6;flex:1}
.rxo .chk{margin:0;padding-left:18px;font-size:12px}.rxo .chk li{margin-bottom:2px}.rxo .f li{color:var(--hr,#ff4d5e)}.rxo .s3{color:#ff6b78;font-weight:600}.rxo .s2{color:#ffa94d}.rxo .s1{color:var(--hg,#f3c84b)}.rxo .inf li{color:#9fd3ff}
.rxo .ok{color:#7dff9b}.rxo .msg{color:#c98d93;font-size:11.5px}.rxo .bot{display:flex;gap:10px;align-items:center;padding:10px 16px;border-top:1px solid #3b1418;flex-wrap:wrap}
.rxo .seg{display:flex;gap:4px;flex-wrap:wrap}.rxo .seg button.on{border-color:var(--hc,#5ef6ff);color:var(--hc,#5ef6ff)}.rxo .hist{display:flex;flex-direction:column;gap:3px}
@media (max-width:900px){.rxo .body{grid-template-columns:minmax(0,1fr);overflow-y:auto;padding:10px}.rxo .ed{overflow:visible;padding-right:0}.rxo .pvw{min-height:300px}.rxo .g{grid-template-columns:repeat(auto-fit,minmax(110px,1fr))}}`;document.head.appendChild(st);

let ov=null,R=null,ctx=null,pvT=0;
const $x=id=>ov?.querySelector('#'+id);
function vacia(){return {id:uid(),fecha:hoyISO(),folio:'',pac:{nombre:'',edad:'',sexo:'',peso:'',talla:'',ta:'',temp:'',fc:'',alergias:''},dx:'',meds:[],ind:'',cita:'',revisada:false};}
function emisorDe(){const E={...C.emisor},X=ctx?.emisor||{};for(const k in X)if(!E[k]&&X[k])E[k]=X[k];return E;}
// abrir: ctx viene del expediente (o nada, si es una receta suelta)
window.recetaAbrir=(c={})=>{ctx=c;R=c.receta?JSON.parse(JSON.stringify(c.receta)):vacia();
  if(!c.receta&&c.pac)Object.assign(R.pac,c.pac);if(!c.receta&&c.dx)R.dx=c.dx;if(!R.folio)R.folio=folioNuevo();
  R.emisor=emisorDe();R.estudiante=C.estudiante||ctx?.estudiante||'';if(c.receta)R.revisada=false;
  pinta();if(!c.receta&&c.tx&&!R.meds.length){$x('rxDict').value=c.tx;}};
window.recetaCerrar=()=>{ov?.remove();ov=null;};
window.ripRecetaDesde=(txt,extra={})=>window.recetaAbrir({...extra,tx:txt});
function pinta(){if(!ov){ov=document.createElement('div');ov.className='rxo';document.body.appendChild(ov);eventos();}
  const P=R.pac,E=R.emisor,res=revisar(R),hist=ctx?.recetas?.()||[];
  ov.innerHTML=`<div class="top"><h3>℞ Receta médica</h3><small class="msg">${ctx?.pac?'del expediente · se guarda cifrada con el paciente':'receta suelta · no se guarda nada del paciente'}</small><span class="sp"></span>
   <button class="mini" data-a="cerrar">✕ Cerrar</button></div>
  <div class="body"><div class="ed">
   <fieldset><legend>Capri la redacta <i>· pega o dicta el tratamiento</i></legend>
    <textarea id="rxDict" placeholder="Ej.: Amoxicilina 500 mg VO c/8h x 7 días, 1 caja con 21 cápsulas&#10;Paracetamol 500 mg 1 tab c/8h si hay fiebre o dolor&#10;Dieta blanda, abundantes líquidos, regresar si hay dificultad para respirar"></textarea>
    <div class="row"><button class="hbtn c" data-a="redactar">◆ Capri, redáctala</button><button class="mini" data-a="dictar">🎙 Dictar</button>${ctx?.tx&&ctx?.pac?'<button class="mini" data-a="desdeNota">Usar el tratamiento de la última nota</button>':''}<span class="sp"></span><small class="msg" id="rxMsg"></small></div></fieldset>
   <fieldset><legend>Paciente</legend><div class="g">
    ${[['nombre','Nombre completo'],['edad','Edad'],['sexo','Sexo'],['peso','Peso (kg)'],['talla','Talla (m)'],['ta','TA (mmHg)'],['temp','Temp. (°C)'],['fc','FC (lpm)']].map(([k,l])=>`<label><span>${l}</span><input data-p="${k}" value="${esc(P[k]||'')}"></label>`).join('')}</div>
    <label><span>Alergias</span><input data-p="alergias" value="${esc(P.alergias||'')}" placeholder="negadas / penicilina…"></label>
    <label><span>Diagnóstico (opcional en la hoja)</span><input data-r="dx" value="${esc(R.dx||'')}"></label>
    <label><span>Fecha</span><input type="date" data-r="fecha" value="${esc(R.fecha)}"></label></fieldset>
   <fieldset><legend>Medicamentos <i>· genérico, presentación, dosis, vía, frecuencia y duración (art. 30–31 RIS)</i></legend>
    ${R.meds.map((m,i)=>`<div class="med${m.ia?' ia':''}${m.nuevas?.length?' nv':''}" data-m="${i}"><div class="hd"><b>${i+1}. ${esc(m.gen||'Nuevo medicamento')}</b>
      <button class="mini" data-a="sube" title="Subir">↑</button><button class="mini" data-a="baja" title="Bajar">↓</button><button class="mini" data-a="quita" title="Quitar">✕</button></div>
      <div class="g">${[['gen','Genérico *'],['com','Marca (opcional)'],['pres','Presentación *'],['dosis','Dosis *'],['via','Vía *'],['frec','Frecuencia *'],['dur','Duración *'],['cant','Surtir (cantidad)']].map(([k,l])=>`<label><span>${l}</span><input data-k="${k}" value="${esc(m[k]||'')}"></label>`).join('')}</div>
      <label><span>Indicación especial</span><input data-k="ind" value="${esc(m.ind||'')}" placeholder="con alimentos, en ayunas…"></label>
      ${m.nuevas?.length?`<small class="s1">⚠ Capri puso cifras que no escribiste: ${esc(m.nuevas.join(', '))}</small>`:''}</div>`).join('')}
    <div class="row"><button class="mini" data-a="agrega">+ Agregar medicamento</button></div></fieldset>
   <fieldset><legend>Indicaciones generales</legend><textarea data-r="ind" placeholder="Dieta, cuidados, datos de alarma…">${esc(R.ind||'')}</textarea>
    <label><span>Próxima cita</span><input data-r="cita" value="${esc(R.cita||'')}" placeholder="en 7 días / 18 de noviembre"></label></fieldset>
   <fieldset><legend>Revisión</legend><div id="rxRev">${pintaRev(res)}</div></fieldset>
   <fieldset><legend>Quien prescribe <i>· art. 29 RIS · se guarda para la próxima</i></legend><div class="g">
    ${[['nombre','Nombre completo *'],['ced','Cédula profesional *'],['esp','Especialidad / título'],['cedEsp','Cédula de especialidad'],['inst','Institución o universidad'],['tel','Teléfono'],['correo','Correo'],['horario','Horario de consulta']].map(([k,l])=>`<label><span>${l}</span><input data-e="${k}" value="${esc(E[k]||'')}"></label>`).join('')}</div>
    <label><span>Domicilio completo del consultorio *</span><input data-e="dom" value="${esc(E.dom||'')}"></label>
    <label><span>Si eres estudiante: tu nombre (sale como «Elaboró»; firma el médico de arriba)</span><input data-r="estudiante" value="${esc(R.estudiante||'')}"></label></fieldset>
   <fieldset><legend>Diseño</legend>
    <div class="row"><span class="msg">Estilo</span><div class="seg">${[['clasica','Clásica'],['moderna','Moderna'],['minima','Mínima (ahorra tinta)']].map(([k,t])=>`<button class="mini${C.plantilla===k?' on':''}" data-pl="${k}">${t}</button>`).join('')}</div></div>
    <div class="row"><span class="msg">Tamaño</span><div class="seg">${[['media','Media carta'],['carta','Carta']].map(([k,t])=>`<button class="mini${C.tam===k?' on':''}" data-tam="${k}">${t}</button>`).join('')}</div>
     <span class="msg">Color</span><input type="color" data-d="color" value="${esc(C.color)}" style="width:44px;padding:1px">
     <span class="msg">Copias</span><select data-d="copias" style="width:auto">${[1,2,3].map(n=>`<option ${+C.copias===n?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="row"><button class="mini" data-a="logo">🖼 ${C.logo?'Cambiar':'Poner'} logo</button>${C.logo?'<button class="mini" data-a="sinLogo">Quitar logo</button>':''}<input type="file" id="rxLogo" accept="image/*" style="display:none">
     <label style="flex-direction:row;gap:5px;align-items:center"><input type="checkbox" data-d="mostrarDx" ${C.mostrarDx?'checked':''} style="width:auto"> Diagnóstico</label>
     <label style="flex-direction:row;gap:5px;align-items:center"><input type="checkbox" data-d="mostrarSV" ${C.mostrarSV?'checked':''} style="width:auto"> Peso y signos</label></div>
    <label><span>Leyenda al pie (opcional)</span><input data-d="leyenda" value="${esc(C.leyenda||'')}" placeholder="Esta receta es válida por 30 días / Universidad…"></label></fieldset>
   ${hist.length?`<fieldset><legend>Recetas anteriores de este paciente</legend><div class="hist">${hist.slice().reverse().slice(0,12).map(h=>`<div class="row"><span>${esc(h.fecha)} · ${esc(h.folio)} · ${esc(h.meds.map(m=>m.gen).join(', ').slice(0,60))}</span><span class="sp"></span><button class="mini" data-h="${h.id}">Reusar</button></div>`).join('')}</div></fieldset>`:''}
  </div><div class="pv"><div class="row"><span class="msg">Vista previa · así sale impresa</span><span class="sp"></span><small class="msg">${C.tam==='media'?'media carta (8.5 × 5.5 in)':'carta'} · ${C.copias>1?C.copias+' copias':'1 copia'}</small></div>
   <div class="pvw" id="rxPvw"><iframe id="rxPv" title="Vista previa de la receta"></iframe></div></div></div>
  <div class="bot"><label style="flex-direction:row;gap:7px;align-items:center;font-size:12px;color:#ffd9dc"><input type="checkbox" id="rxOk" ${R.revisada?'checked':''} style="width:auto">
   Ya la revisé: los datos, dosis y alertas son correctos (quita la marca BORRADOR)</label><span class="sp"></span>
   ${ctx?.guardar?'<button class="mini" data-a="guardar">Guardar en el expediente</button>':''}<button class="hbtn c" data-a="imprimir">🖨 Imprimir / PDF</button></div>`;
  preview();}
function pintaRev(res){const {F,A,I}=res;
  return (F.length?`<div class="msg">Falta (${F.length})</div><ul class="chk f">${F.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<div class="ok">✓ Tiene lo que pide el Reglamento de Insumos para la Salud (arts. 29–31).</div>')+
   (A.length?`<div class="msg" style="margin-top:5px">Alertas</div><ul class="chk">${A.map(a=>`<li class="s${a.s}">${esc(a.t)}</li>`).join('')}</ul>`:'')+
   (I.length?`<ul class="chk inf">${I.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'')+
   `<small class="msg">Capri revisa con reglas y con el verificador de R.I.P; que no salga nada no garantiza que no haya interacción. La receta la decide y la firma el médico.</small>`;}
function preview(){clearTimeout(pvT);pvT=setTimeout(()=>{const f=$x('rxPv'),w=$x('rxPvw');if(!f||!w)return;R.emisor=R.emisor||emisorDe();
  f.srcdoc=hojaHTML(R,C,{prev:true});const W=816,H=C.tam==='media'?528:1056,s=Math.min(1,(w.clientWidth-22)/W);
  f.style.width=W+'px';f.style.height=(H+12)+'px';f.style.transform=`scale(${s})`;f.parentElement.style.height='';f.style.marginBottom=((H+12)*(s-1))+'px';},120);}
function lee(){if(!ov)return;ov.querySelectorAll('[data-p]').forEach(e=>R.pac[e.dataset.p]=e.value.trim());
  ov.querySelectorAll('[data-r]').forEach(e=>R[e.dataset.r]=e.value.trim?e.value.trim():e.value);
  ov.querySelectorAll('[data-m]').forEach(box=>{const m=R.meds[+box.dataset.m];if(!m)return;box.querySelectorAll('[data-k]').forEach(e=>{const v=e.value.trim();if(m[e.dataset.k]!==v){m[e.dataset.k]=v;if(m.nuevas?.length)m.nuevas=m.nuevas.filter(n=>nums(Object.values(m).join(' ')).includes(n)&&!nums(v).includes(n)||false);}});});
  ov.querySelectorAll('[data-e]').forEach(e=>{R.emisor[e.dataset.e]=e.value.trim();C.emisor[e.dataset.e]=e.value.trim();});C.estudiante=R.estudiante||'';
  R.revisada=!!$x('rxOk')?.checked;guardaC();}
const refresca=()=>{const r=$x('rxRev');if(r)r.innerHTML=pintaRev(revisar(R));preview();};
let rec=null;
function eventos(){
  ov.addEventListener('input',e=>{ctx?.toque?.();if(e.target.id==='rxDict')return;lee();
    if(e.target.dataset.k==='gen'){const b=e.target.closest('[data-m]')?.querySelector('.hd b');if(b)b.textContent=(+e.target.closest('[data-m]').dataset.m+1)+'. '+(e.target.value||'Nuevo medicamento');}
    clearTimeout(eventos.t);eventos.t=setTimeout(refresca,250);});
  ov.addEventListener('change',async e=>{const t=e.target;
    if(t.dataset.d){C[t.dataset.d]=t.type==='checkbox'?t.checked:t.dataset.d==='copias'?+t.value:t.value;guardaC();lee();return pinta();}
    if(t.id==='rxOk'){lee();if(R.revisada){const res=revisar(R);if(res.F.length&&!confirm('Todavía falta:\n- '+res.F.slice(0,6).join('\n- ')+'\n\n¿Quitar la marca BORRADOR de todos modos?')){t.checked=false;R.revisada=false;}}return preview();}
    if(t.id==='rxLogo'&&t.files[0]){const f=t.files[0];if(f.size>1.5e6)return alert('Usa una imagen de menos de 1.5 MB.');
      const rd=new FileReader();rd.onload=()=>{C.logo=rd.result;guardaC();lee();pinta();};rd.readAsDataURL(f);}});
  ov.addEventListener('click',async e=>{ctx?.toque?.();const pl=e.target.closest('[data-pl]'),tm=e.target.closest('[data-tam]'),h=e.target.closest('[data-h]'),b=e.target.closest('[data-a]');
    if(pl){lee();C.plantilla=pl.dataset.pl;guardaC();return pinta();}
    if(tm){lee();C.tam=tm.dataset.tam;guardaC();return pinta();}
    if(h){const o=(ctx?.recetas?.()||[]).find(x=>x.id===h.dataset.h);if(!o)return;lee();R.meds=JSON.parse(JSON.stringify(o.meds)).map(m=>({...m,id:uid(),ia:0,nuevas:[]}));R.ind=o.ind||R.ind;R.revisada=false;return pinta();}
    if(!b)return;const a=b.dataset.a;
    if(a==='cerrar'){lee();rec?.stop();return window.recetaCerrar();}
    if(a==='agrega'){lee();R.meds.push({id:uid(),gen:'',com:'',pres:'',dosis:'',via:'',frec:'',dur:'',cant:'',ind:''});pinta();return ov.querySelector(`[data-m="${R.meds.length-1}"] [data-k="gen"]`)?.focus();}
    const box=b.closest('[data-m]');
    if(box){lee();const i=+box.dataset.m;if(a==='quita')R.meds.splice(i,1);if(a==='sube'&&i>0)[R.meds[i-1],R.meds[i]]=[R.meds[i],R.meds[i-1]];
      if(a==='baja'&&i<R.meds.length-1)[R.meds[i+1],R.meds[i]]=[R.meds[i],R.meds[i+1]];R.revisada=false;return pinta();}
    if(a==='desdeNota'){$x('rxDict').value=ctx.tx;return;}
    if(a==='redactar'){const txt=$x('rxDict').value.trim(),m=$x('rxMsg');if(!txt)return m.textContent='Escribe, pega o dicta el tratamiento primero.';
      lee();b.disabled=true;m.textContent='Capri está redactando…';
      try{const r=await redactar(txt,ctx);if(!r.meds.length&&!r.ind)throw new Error('no encontré medicamentos en ese texto.');
        R.meds.push(...r.meds);if(r.ind)R.ind=(R.ind?R.ind+'\n':'')+r.ind;R.revisada=false;pinta();
        $x('rxMsg').textContent=`◆ ${r.meds.length} medicamento(s) con ${r.quien}.`+(r.meds.some(m=>m.ia)?' Lo marcado en cian lo puso ella: revísalo.':' Revisa cada renglón.')+(r.dudas?.length?' Dudas: '+r.dudas.join(' · '):'');}
      catch(err){m.textContent='✖ '+err.message;}finally{const bb=ov?.querySelector('[data-a="redactar"]');if(bb)bb.disabled=false;}return;}
    if(a==='dictar'){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return alert('Aquí no se puede dictar; escribe o pega el texto.');
      if(rec){rec.stop();return;}rec=new SR();rec.lang='es-MX';rec.continuous=true;const ta=$x('rxDict');b.textContent='■ Detener';
      rec.onresult=ev=>{for(let i=ev.resultIndex;i<ev.results.length;i++)if(ev.results[i].isFinal)ta.value+=(ta.value&&!/\s$/.test(ta.value)?'\n':'')+ev.results[i][0].transcript.trim();};
      rec.onend=()=>{rec=null;const bb=ov?.querySelector('[data-a="dictar"]');if(bb)bb.textContent='🎙 Dictar';};rec.start();return;}
    if(a==='logo')return $x('rxLogo').click();
    if(a==='sinLogo'){C.logo='';guardaC();lee();return pinta();}
    if(a==='guardar'||a==='imprimir'){lee();const res=revisar(R);
      if(a==='imprimir'){const graves=res.A.filter(x=>x.s>=3);
        if(graves.length&&!confirm('Alertas graves:\n- '+graves.map(x=>x.t).join('\n- ')+'\n\n¿Imprimir de todos modos?'))return;
        if(!R.emisor.ced&&!confirm('Sin cédula profesional la receta no es válida (art. 29 RIS). ¿Imprimirla así (por ejemplo, para práctica)?'))return;}
      const copia=JSON.parse(JSON.stringify(R));if(ctx?.guardar){try{await ctx.guardar(copia,a);}catch(err){}}
      if(a==='imprimir')imprimirHoja(R);else $x('rxMsg').textContent='✓ Guardada en el expediente (cifrada).';return;}});
  addEventListener('resize',()=>ov&&preview());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ov&&!e.defaultPrevented){lee();window.recetaCerrar();}});}

// ---------- comando en el chat ----------
const _send=send;
send=async v=>{const raw=(v||'').trim(),k=raw.toLowerCase();
  if(/^(receta|recetas|receta m[eé]dica|hacer receta|nueva receta)$/.test(k)&&!busy){line('u',raw);window.recetaAbrir({});return;}
  const m=raw.match(/^receta\s*:\s*([\s\S]+)/i);if(m&&!busy){line('u',raw);window.recetaAbrir({tx:m[1]});return;}
  await _send(v);if(k==='help')line('t','  receta — Diseñar e imprimir una receta médica (desde un paciente del expediente, botón ℞)\n  receta: amoxicilina 500 mg c/8h x 7 días… — Capri la arma con eso');};
window.__recetaTest={leeRenglon,leeTexto,revisar,hojaHTML,renglonTxt,frecuencia,duracion};
})();
