// ================= R.I.P =================
// Pestaña R.I.P del HUD (nombre que le puso Kiga): las herramientas de salud que hacen que Capri se equivoque menos.
//  · Fuentes oficiales: GPC (CENETEC/IMSS), NOM y el Compendio Nacional de Insumos se guardan en la biblioteca con su clave
//    y año; en temas de salud Capri las busca primero y las cita (GPC IMSS-000-00, 2020, p. N). Mandan sobre su memoria.
//  · Medicamentos: dosis por día y por kilo, interacciones conocidas, alergias, embarazo y riñón, con la etiqueta oficial de
//    la FDA (openFDA) y tu Compendio como fuente. Lo que no reconoce o no puede confirmar lo marca como «a verificar».
//  · Lector de escaneos: Tesseract corre en tu PC, sin internet ni key (vendor/ocr); marca las palabras que leyó con duda.
//  · Modo estudio: tus tarjetas de repaso espaciado (las mismas de «repaso»), preguntas tipo examen y casos clínicos sacados
//    de tus documentos, con la página de donde sale cada respuesta y aviso si la cita no aparece en el texto.
//  · Respaldo del expediente: copia cifrada automática al día y código de recuperación en papel por si olvidas la llave.
//  · Calculadoras clínicas con fórmula exacta y su referencia.
// Capri no diagnostica: todo esto es apoyo para estudiar y revisar; decide el médico tratante.
(()=>{
const rip=Object.assign({mod:'fuentes',auto:true,ultResp:0,calc:'imc'},store.get('rip',{}));const save=()=>store.set('rip',rip);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=t=>String(t??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const DESK=window.capriDesk;
const MODS=[['fuentes','Fuentes oficiales','GPC · NOM · Compendio'],['meds','Medicamentos','dosis · interacciones · alergias'],['ocr','Lector de escaneos','OCR en tu PC'],
 ['estudio','Modo estudio','tarjetas · examen · casos'],['respaldo','Respaldo','expediente cifrado'],['calc','Calculadoras','fórmulas exactas'],['nube','Entre equipos','pendiente']];
const google=q=>'https://www.google.com/search?q='+encodeURIComponent(q);
const SALUD=/salud|m[eé]dic|enferm|s[ií]ntom|dolor|fiebre|infecci|presi[oó]n|diabet|coraz[oó]n|pulm|renal|ri[ñn][oó]n|h[ií]gado|sangr|alergi|medicament|f[aá]rmaco|dosis|tratamiento|diagn[oó]st|gu[ií]a|nom-|norma|paciente|cl[ií]nic|embaraz|parto|ni[ñn]o|vacun|cirug|urgenc|antibi[oó]t|hipertens|glucosa|insulin|c[aá]ncer|vih|tuberc|criterio|manejo|protocolo/i;

// ================= FUENTES OFICIALES =================
const TIPOS_O=['GPC','NOM','Compendio','Otra oficial'];
// NOM de la Secretaría de Salud que más salen en clínica. La vigencia se confirma en el DOF (botón de cada una).
const NOMS=[['NOM-004-SSA3-2012','Del expediente clínico'],['NOM-024-SSA3-2012','Sistemas de información de registro electrónico para la salud'],
 ['NOM-007-SSA2-2016','Atención de la mujer durante el embarazo, parto y puerperio, y de la persona recién nacida'],['NOM-015-SSA2-2010','Prevención, tratamiento y control de la diabetes mellitus'],
 ['NOM-030-SSA2-2009','Prevención, detección, diagnóstico, tratamiento y control de la hipertensión arterial sistémica'],['NOM-037-SSA2-2012','Prevención, tratamiento y control de las dislipidemias'],
 ['NOM-008-SSA3-2017','Tratamiento integral del sobrepeso y la obesidad'],['NOM-031-SSA2-1999','Atención a la salud del niño'],['NOM-036-SSA2-2012','Vacunas, faboterápicos e inmunoglobulinas'],
 ['NOM-006-SSA2-2013','Prevención y control de la tuberculosis'],['NOM-010-SSA2-2010','Prevención y control de la infección por VIH'],['NOM-039-SSA2-2014','Prevención y control de las infecciones de transmisión sexual'],
 ['NOM-017-SSA2-2012','Vigilancia epidemiológica'],['NOM-045-SSA2-2005','Vigilancia epidemiológica de las infecciones nosocomiales'],['NOM-046-SSA2-2005','Violencia familiar, sexual y contra las mujeres'],
 ['NOM-005-SSA2-1993','Servicios de planificación familiar'],['NOM-014-SSA2-1994','Cáncer del cuello del útero'],['NOM-041-SSA2-2011','Cáncer de mama'],
 ['NOM-027-SSA3-2013','Servicios de urgencias de los establecimientos de atención médica'],['NOM-034-SSA3-2013','Atención médica prehospitalaria'],['NOM-022-SSA3-2012','Terapia de infusión intravenosa'],
 ['NOM-253-SSA1-2012','Disposición de sangre humana y sus componentes'],['NOM-220-SSA1-2016','Instalación y operación de la farmacovigilancia'],['NOM-087-SEMARNAT-SSA1-2002','Residuos peligrosos biológico-infecciosos'],
 ['NOM-011-SSA3-2014','Cuidados paliativos'],['NOM-028-SSA2-2009','Prevención, tratamiento y control de las adicciones'],['NOM-043-SSA2-2012','Orientación alimentaria'],['NOM-047-SSA2-2015','Atención a la salud del grupo etario de 10 a 19 años']];
let ofiCtx='',ofiFuentes=[];
const citaDe=o=>[o.tipo==='Otra oficial'?'':o.tipo,o.clave,o.anio].filter(Boolean).join(' ').replace(/^(GPC|NOM|Compendio) (?=\1)/,'')+'';
async function oficiales(){const ds=await (window.bibDocs?.()||[]);return ds.filter(d=>d.oficial);}
async function preparaOfi(q){ofiCtx='';ofiFuentes=[];if(!q||q.length<6||!SALUD.test(q)||!window.bibBuscar)return;
  const ofi=await oficiales();if(!ofi.length)return;const by=Object.fromEntries(ofi.filter(d=>d.active).map(d=>[d.id,d]));
  const r=(await window.bibBuscar(q,20)).filter(o=>by[o.t.doc]&&o.s>1.2&&o.cov>=.34).slice(0,4);if(!r.length)return;
  ofiFuentes=r.map(o=>({d:by[o.t.doc],pag:o.t.pag,text:o.t.text}));
  ofiCtx=ofiFuentes.map((f,i)=>{const o=f.d.oficial,viejo=o.anio&&new Date().getFullYear()-o.anio>5;
    return `[O${i+1}] ${o.tipo} ${o.clave||''}${o.anio?', '+o.anio:''}${viejo?' (de hace más de 5 años)':''} — «${f.d.name}»${f.pag?', p. '+f.pag:''}\n${f.text}`;}).join('\n\n');
  log('R.I.P: '+ofiFuentes.length+' trozo(s) de fuentes oficiales','g');}
const _prep=window.medPrepare;window.medPrepare=async q=>{await Promise.all([_prep?_prep(q):null,preparaOfi(q).catch(()=>{})]);};
const _prompt=window.medPrompt;window.medPrompt=()=>(_prompt?_prompt():'')+(ofiCtx?`

FUENTES OFICIALES DE MÉXICO QUE ${(cfg.name||'Kiga').toUpperCase()} CARGÓ EN R.I.P (mandan sobre tu memoria)
- Para dosis, criterios, tratamientos y normas, lo que digan estas fuentes va primero. Cítalas así, sin markdown: (GPC IMSS-000-00, 2020, p. N) o (NOM-000-SSA0-0000, p. N).
- Si lo que tú sabes difiere de la fuente, di lo que dice la fuente y señala la diferencia. Si es de hace más de 5 años, avisa que puede haber versión más nueva.
- Si la respuesta no viene en ellas, dilo claro («eso no viene en tus fuentes oficiales») y marca tu certeza.
- No das diagnósticos de personas reales ni sustituyes al médico tratante.
${ofiCtx}`:'');
const _after=window.medAfter;window.medAfter=()=>{_after?.();if(!ofiFuentes.length)return;
  line('s med','🏛 fuentes oficiales: '+[...new Set(ofiFuentes.map(f=>[f.d.oficial.tipo,f.d.oficial.clave,f.d.oficial.anio].filter(Boolean).join(' ')+(f.pag?' p. '+f.pag:'')))].join(' · '));ofiFuentes=[];};

function vFuentes(){return oficiales().then(ofi=>{const y=new Date().getFullYear();
  return `<h3>Fuentes oficiales</h3><div class="sub">lo que Capri cita primero en salud</div>
  <p class="rp-p">Capri contesta mejor cuando cita de una fuente oficial y no de memoria. Baja la guía, norma o el Compendio (PDF) del sitio del gobierno y suéltalo aquí con su clave y año: se guarda en tu biblioteca, en el estante <b>Fuentes oficiales</b>, y en temas de salud Capri lo busca primero.</p>
  <div class="rp-g3">
   <div class="rp-box"><b>Guías de Práctica Clínica</b><small>CENETEC / IMSS / ISSSTE. Busca el tema y baja el PDF de un sitio <b>gob.mx</b>.</small>
    <div class="rp-in"><input id="rpGpcQ" placeholder="tema: diabetes tipo 2, neumonía…"><button class="mini" data-a="gpc">Buscar</button></div></div>
   <div class="rp-box"><b>Normas Oficiales Mexicanas</b><small>Texto vigente en el Diario Oficial de la Federación.</small>
    <div class="rp-in"><select id="rpNom">${NOMS.map(([k,t])=>`<option value="${k}">${k} · ${esc(t)}</option>`).join('')}</select><button class="mini" data-a="nom">DOF</button></div></div>
   <div class="rp-box"><b>Compendio Nacional de Insumos</b><small>Antes Cuadro Básico (Consejo de Salubridad General): dosis, contraindicaciones e interacciones. Baja el <i>libro de medicamentos</i>.</small>
    <div class="rp-in"><button class="mini" data-a="cnis">Buscar el Compendio</button><button class="mini" data-a="mlp">MedlinePlus medicinas</button></div></div></div>
  <small class="rp-warn">Ojo: el dominio cenetec-difusion.com ya no es de CENETEC (hoy es una página de casinos). Usa solo sitios que terminen en <b>.gob.mx</b>.</small>
  <fieldset class="rp-fs"><legend>Agregar una fuente</legend>
   <div class="rp-in"><select id="rpTipo">${TIPOS_O.map(t=>`<option>${t}</option>`).join('')}</select><input id="rpClave" placeholder="clave (IMSS-718-14, NOM-015-SSA2-2010…)"><input id="rpAnio" type="number" min="1990" max="${y}" placeholder="año" style="width:90px"></div>
   <div class="drop rp-drop" id="rpDrop">Suelta aquí el PDF o haz clic para elegirlo<small>se lee en tu PC; si es escaneado lo pasa a texto el lector de escaneos</small></div><input type="file" id="rpFile" multiple accept=".pdf,.docx,.doc,.html,.htm,.txt,.xlsx,.xls" style="display:none">
   ${DESK?.ripBajar?`<div class="rp-in"><input id="rpUrl" placeholder="o pega el enlace directo al PDF (solo sitios .gob.mx)"><button class="mini" data-a="bajar">Bajar</button></div>`:''}
   <div id="rpProg" class="rp-st"></div></fieldset>
  <h3 style="margin-top:18px">Cargadas · ${ofi.length}</h3>
  <div class="rp-ls">${ofi.map(d=>{const o=d.oficial,viejo=o.anio&&y-o.anio>5;return `<div class="rp-it"><span class="fm">${esc(o.tipo)}</span><div><b>${esc(o.clave||d.name)}</b>${o.anio?' · '+o.anio:''}<br><small>${esc(d.name)} · ${d.pags||'?'} pág.${viejo?' · <em>de hace más de 5 años: revisa si ya hay versión nueva</em>':''}${o.tipo==='NOM'?' · confirma que siga vigente en el DOF':''}</small></div><button class="mini" data-q="${d.id}" title="Quitar">✕</button></div>`;}).join('')||'<small class="rp-mut">Todavía no hay. Empieza por la GPC del tema que más estudias y la NOM-004.</small>'}</div>
  ${ofi.length?`<div class="rp-in" style="margin-top:12px"><input id="rpOq" placeholder="¿Qué dicen tus fuentes oficiales sobre…?"><button class="mini" data-a="oq">Buscar</button></div><div id="rpOr"></div>`:''}`;});}
async function agregaOfi(files){const tipo=$r('rpTipo').value,clave=$r('rpClave').value.trim().toUpperCase(),anio=+$r('rpAnio').value||null,p=$r('rpProg');
  if(!clave&&!confirm('No pusiste la clave. Capri la va a citar solo por el nombre del archivo. ¿Seguir?'))return;
  p.textContent='Leyendo '+files.length+' archivo(s)…';
  await window.bibAgregar(files,{estante:'Fuentes oficiales',oficial:{tipo,clave,anio}});p.textContent='✓ Listo. Capri ya la consulta.';render();}

// ================= MEDICAMENTOS =================
// nombre en español → principio activo (como lo nombra la etiqueta de la FDA) y sus grupos
const F=(en,...c)=>({en,c});
const DIC={paracetamol:F('acetaminophen','analg'),acetaminofen:F('acetaminophen','analg'),ibuprofeno:F('ibuprofen','aine'),naproxeno:F('naproxen','aine'),diclofenaco:F('diclofenac','aine'),
 ketorolaco:F('ketorolac','aine'),meloxicam:F('meloxicam','aine'),celecoxib:F('celecoxib','aine'),indometacina:F('indomethacin','aine'),ketoprofeno:F('ketoprofen','aine'),piroxicam:F('piroxicam','aine'),
 metamizol:F('','aine'),dipirona:F('','aine'),'acido acetilsalicilico':F('aspirin','antiag','aine'),aspirina:F('aspirin','antiag','aine'),clopidogrel:F('clopidogrel','antiag'),
 warfarina:F('warfarin','avk'),acenocumarol:F('','avk'),rivaroxaban:F('rivaroxaban','doac'),apixaban:F('apixaban','doac'),dabigatran:F('dabigatran','doac'),edoxaban:F('edoxaban','doac'),
 enoxaparina:F('enoxaparin','hep'),heparina:F('heparin','hep'),
 tramadol:F('tramadol','opio','sero'),morfina:F('morphine','opio'),oxicodona:F('oxycodone','opio'),fentanilo:F('fentanyl','opio','sero'),buprenorfina:F('buprenorphine','opio'),codeina:F('codeine','opio'),
 tapentadol:F('tapentadol','opio','sero'),metadona:F('methadone','opio','qt'),nalbufina:F('nalbuphine','opio'),meperidina:F('meperidine','opio','sero'),
 diazepam:F('diazepam','benzo'),clonazepam:F('clonazepam','benzo'),alprazolam:F('alprazolam','benzo'),lorazepam:F('lorazepam','benzo'),midazolam:F('midazolam','benzo'),bromazepam:F('','benzo'),
 gabapentina:F('gabapentin','gaba'),pregabalina:F('pregabalin','gaba'),
 sertralina:F('sertraline','isrs','sero'),fluoxetina:F('fluoxetine','isrs','sero'),paroxetina:F('paroxetine','isrs','sero'),citalopram:F('citalopram','isrs','sero','qt'),escitalopram:F('escitalopram','isrs','sero','qt'),
 venlafaxina:F('venlafaxine','sero'),duloxetina:F('duloxetine','sero'),desvenlafaxina:F('desvenlafaxine','sero'),amitriptilina:F('amitriptyline','sero','qt'),imipramina:F('imipramine','sero'),
 clomipramina:F('clomipramine','sero'),selegilina:F('selegiline','imao'),fenelzina:F('phenelzine','imao','sero'),linezolid:F('linezolid','imao','sero'),
 sumatriptan:F('sumatriptan','sero','trip'),rizatriptan:F('rizatriptan','sero','trip'),dextrometorfano:F('dextromethorphan','sero'),
 haloperidol:F('haloperidol','qt'),quetiapina:F('quetiapine','qt'),olanzapina:F('olanzapine'),risperidona:F('risperidone'),litio:F('lithium','litio'),'carbonato de litio':F('lithium','litio'),
 valproato:F('valproic acid','teratog'),'acido valproico':F('valproic acid','teratog'),carbamazepina:F('carbamazepine','inductor'),fenitoina:F('phenytoin','inductor'),levetiracetam:F('levetiracetam'),
 enalapril:F('enalapril','ieca'),captopril:F('captopril','ieca'),lisinopril:F('lisinopril','ieca'),ramipril:F('ramipril','ieca'),
 losartan:F('losartan','ara2'),valsartan:F('valsartan','ara2'),telmisartan:F('telmisartan','ara2'),irbesartan:F('irbesartan','ara2'),candesartan:F('candesartan','ara2'),
 metoprolol:F('metoprolol','bb'),propranolol:F('propranolol','bb'),atenolol:F('atenolol','bb'),bisoprolol:F('bisoprolol','bb'),carvedilol:F('carvedilol','bb'),
 amlodipino:F('amlodipine'),nifedipino:F('nifedipine'),verapamilo:F('verapamil','nodhp','cyp3a'),diltiazem:F('diltiazem','nodhp','cyp3a'),
 hidroclorotiazida:F('hydrochlorothiazide','diur','tiaz'),clortalidona:F('chlorthalidone','diur','tiaz'),furosemida:F('furosemide','diur','asa'),bumetanida:F('bumetanide','diur','asa'),
 espironolactona:F('spironolactone','ahk'),eplerenona:F('eplerenone','ahk'),amilorida:F('amiloride','ahk'),'cloruro de potasio':F('potassium chloride','kplus'),potasio:F('potassium chloride','kplus'),
 isosorbide:F('isosorbide','nitrato'),'dinitrato de isosorbide':F('isosorbide dinitrate','nitrato'),'mononitrato de isosorbide':F('isosorbide mononitrate','nitrato'),nitroglicerina:F('nitroglycerin','nitrato'),
 sildenafil:F('sildenafil','pde5'),tadalafil:F('tadalafil','pde5'),tamsulosina:F('tamsulosin','alfa'),doxazosina:F('doxazosin','alfa'),prazosina:F('prazosin','alfa'),
 simvastatina:F('simvastatin','statin3a'),lovastatina:F('lovastatin','statin3a'),atorvastatina:F('atorvastatin','statin'),rosuvastatina:F('rosuvastatin','statin'),pravastatina:F('pravastatin','statin'),
 digoxina:F('digoxin','digox'),amiodarona:F('amiodarone','amio','qt'),sotalol:F('sotalol','bb','qt'),
 metformina:F('metformin','metf'),glibenclamida:F('glyburide','su'),glimepirida:F('glimepiride','su'),insulina:F('insulin','insul'),
 omeprazol:F('omeprazole','ipp','ipp2c19'),esomeprazol:F('esomeprazole','ipp','ipp2c19'),pantoprazol:F('pantoprazole','ipp'),ranitidina:F('ranitidine'),
 ondansetron:F('ondansetron','qt','sero'),metoclopramida:F('metoclopramide'),domperidona:F('','qt'),
 amoxicilina:F('amoxicillin','pen'),'amoxicilina con clavulanato':F('amoxicillin','pen'),ampicilina:F('ampicillin','pen'),penicilina:F('penicillin','pen'),'bencilpenicilina':F('penicillin g','pen'),dicloxacilina:F('dicloxacillin','pen'),
 cefalexina:F('cephalexin','cef'),cefuroxima:F('cefuroxime','cef'),ceftriaxona:F('ceftriaxone','cef'),cefotaxima:F('cefotaxime','cef'),cefepima:F('cefepime','cef'),cefixima:F('cefixime','cef'),
 meropenem:F('meropenem','carba'),imipenem:F('imipenem','carba'),ertapenem:F('ertapenem','carba'),
 azitromicina:F('azithromycin','macro','qt'),claritromicina:F('clarithromycin','macro','qt','cyp3a'),eritromicina:F('erythromycin','macro','qt','cyp3a'),
 ciprofloxacino:F('ciprofloxacin','quino','qt','quel'),levofloxacino:F('levofloxacin','quino','qt','quel'),moxifloxacino:F('moxifloxacin','quino','qt','quel'),
 doxiciclina:F('doxycycline','tetra','quel'),tetraciclina:F('tetracycline','tetra','quel'),minociclina:F('minocycline','tetra','quel'),
 'trimetoprim con sulfametoxazol':F('sulfamethoxazole','sulfa','tmp'),'trimetoprima con sulfametoxazol':F('sulfamethoxazole','sulfa','tmp'),'trimetoprim sulfametoxazol':F('sulfamethoxazole','sulfa','tmp'),'tmp-smx':F('sulfamethoxazole','sulfa','tmp'),bactrim:F('sulfamethoxazole','sulfa','tmp'),
 metronidazol:F('metronidazole','metro'),nitrofurantoina:F('nitrofurantoin'),clindamicina:F('clindamycin'),vancomicina:F('vancomycin','nefro'),gentamicina:F('gentamicin','amino','nefro'),amikacina:F('amikacin','amino','nefro'),
 fluconazol:F('fluconazole','azol','qt'),itraconazol:F('itraconazole','azol','cyp3a'),ketoconazol:F('ketoconazole','azol','cyp3a'),rifampicina:F('rifampin','inductor'),
 hidroxicloroquina:F('hydroxychloroquine','qt'),colchicina:F('colchicine','colch'),alopurinol:F('allopurinol','alop'),azatioprina:F('azathioprine','tiop'),mercaptopurina:F('mercaptopurine','tiop'),
 metotrexato:F('methotrexate','mtx','teratog'),isotretinoina:F('isotretinoin','teratog'),misoprostol:F('misoprostol','teratog'),ciclosporina:F('cyclosporine','cyp3a'),ritonavir:F('ritonavir','cyp3a'),
 levotiroxina:F('levothyroxine','levo'),prednisona:F('prednisone','cort'),dexametasona:F('dexamethasone','cort'),hidrocortisona:F('hydrocortisone','cort'),metilprednisolona:F('methylprednisolone','cort'),
 'sulfato ferroso':F('ferrous sulfate','catio'),hierro:F('ferrous sulfate','catio'),'carbonato de calcio':F('calcium carbonate','catio'),calcio:F('calcium carbonate','catio'),
 'hidroxido de aluminio':F('aluminum hydroxide','catio'),'hidroxido de magnesio':F('magnesium hydroxide','catio'),magnesio:F('magnesium','catio'),zinc:F('zinc','catio'),antiacido:F('','catio'),
 teofilina:F('theophylline','teof'),aminofilina:F('aminophylline','teof'),salbutamol:F('albuterol'),loratadina:F('loratadine'),cetirizina:F('cetirizine'),clorfenamina:F('chlorpheniramine'),
 etinilestradiol:F('ethinyl estradiol','aco'),levonorgestrel:F('levonorgestrel','aco'),anticonceptivo:F('','aco'),'anticonceptivos orales':F('','aco'),
 'medio de contraste':F('','contraste'),contraste:F('','contraste')};
const NOMBRE_G={aine:'AINE',analg:'analgésico',antiag:'antiagregante',avk:'anticoagulante (antivitamina K)',doac:'anticoagulante oral directo',hep:'heparina',opio:'opioide',benzo:'benzodiacepina',
 isrs:'ISRS',sero:'serotoninérgico',imao:'IMAO',ieca:'IECA',ara2:'ARA II',bb:'betabloqueador',diur:'diurético',ahk:'ahorrador de potasio',statin:'estatina',statin3a:'estatina',pen:'penicilina',cef:'cefalosporina',
 macro:'macrólido',quino:'fluoroquinolona',tetra:'tetraciclina',azol:'antifúngico azol',cort:'corticoide',gaba:'gabapentinoide'};
const ALG=new Set(['pen','cef','carba','sulfa','aine','macro','quino','tetra','amino','opio']);   // grupos con alergia cruzada
const DUP=new Set(['aine','avk','doac','opio','benzo','isrs','ieca','ara2','bb','statin','statin3a','ipp','su','gaba']);   // dos del mismo grupo = posible duplicidad
// interacciones bien conocidas (lista corta, no exhaustiva). x: grupo o principio activo de un lado; y: del otro; z: un tercero si hace falta
const IX=[
 {x:['avk'],y:['aine','antiag'],s:2,t:'Más riesgo de sangrado.'},
 {x:['doac','hep'],y:['aine','antiag'],s:2,t:'Más riesgo de sangrado.'},
 {x:['avk'],y:['metro','tmp','amio','fluconazol'],s:2,t:'Sube el efecto del anticoagulante (INR alto, sangrado). Si se usan juntos, se vigila el INR de cerca.'},
 {x:['avk','doac'],y:['inductor'],s:2,t:'El inductor baja el efecto del anticoagulante (riesgo de trombosis).'},
 {x:['ieca','ara2'],y:['ahk','kplus','tmp'],s:2,t:'Riesgo de potasio alto (hiperkalemia).'},
 {x:['ahk'],y:['kplus'],s:2,t:'Riesgo de potasio alto (hiperkalemia).'},
 {x:['ieca'],y:['ara2'],s:2,t:'Doble bloqueo del sistema renina-angiotensina: más hiperkalemia, daño renal e hipotensión; en general se evita.'},
 {x:['aine'],y:['ieca','ara2'],z:['diur'],s:2,t:'«Triple golpe»: AINE + IECA/ARA II + diurético aumentan el riesgo de lesión renal aguda.'},
 {x:['imao'],y:['sero'],s:3,t:'IMAO con otro serotoninérgico: riesgo de síndrome serotoninérgico; combinación contraindicada en general.'},
 {x:['isrs','sero'],y:['tramadol','fentanilo','meperidina','metadona','tapentadol','trip','dextrometorfano','ondansetron'],s:1,t:'Dos serotoninérgicos: vigilar síntomas de síndrome serotoninérgico.'},
 {x:['opio'],y:['benzo'],s:3,t:'Opioide + benzodiacepina: sedación profunda y depresión respiratoria (advertencia en recuadro de la FDA).'},
 {x:['opio'],y:['gaba'],s:2,t:'Opioide + gabapentina/pregabalina: más riesgo de depresión respiratoria.'},
 {x:['nitrato'],y:['pde5'],s:3,t:'Hipotensión grave: combinación contraindicada.'},
 {x:['pde5'],y:['alfa'],s:1,t:'Pueden bajar mucho la presión (mareo, desmayo).'},
 {x:['statin3a'],y:['claritromicina','eritromicina','itraconazol','ketoconazol','ritonavir','ciclosporina'],s:3,t:'Riesgo de miopatía y rabdomiólisis: con simvastatina o lovastatina la combinación está contraindicada.'},
 {x:['atorvastatina'],y:['claritromicina','itraconazol','ketoconazol','ritonavir','ciclosporina'],s:2,t:'Sube la atorvastatina: más riesgo de miopatía; se limita la dosis o se evita.'},
 {x:['simvastatina','lovastatina'],y:['amio','verapamilo','diltiazem'],s:2,t:'Más riesgo de miopatía; la etiqueta limita la dosis de la estatina.'},
 {x:['clopidogrel'],y:['ipp2c19'],s:1,t:'Omeprazol o esomeprazol bajan el efecto del clopidogrel (la etiqueta pide evitarlos juntos).'},
 {x:['digox'],y:['amio','verapamilo','claritromicina','eritromicina'],s:2,t:'Sube la digoxina en sangre (toxicidad).'},
 {x:['litio'],y:['aine','ieca','ara2','tiaz'],s:2,t:'Sube el litio en sangre (toxicidad).'},
 {x:['mtx'],y:['tmp'],s:3,t:'Metotrexato + trimetoprim/sulfametoxazol: toxicidad en médula ósea.'},
 {x:['mtx'],y:['aine'],s:2,t:'Más toxicidad del metotrexato (sobre todo a dosis altas).'},
 {x:['quel'],y:['catio'],s:1,t:'Calcio, hierro, magnesio, aluminio o zinc bajan la absorción del antibiótico: separar las tomas.'},
 {x:['levo'],y:['catio'],s:1,t:'Calcio o hierro bajan la absorción de la levotiroxina: separar las tomas.'},
 {x:['alop'],y:['tiop'],s:3,t:'Alopurinol + azatioprina/mercaptopurina: toxicidad grave en médula ósea.'},
 {x:['inductor'],y:['aco'],s:2,t:'Baja la eficacia del anticonceptivo hormonal.'},
 {x:['colch'],y:['cyp3a','claritromicina'],s:3,t:'Sube la colchicina: toxicidad que puede ser mortal.'},
 {x:['ketorolaco'],y:['aine'],s:3,t:'Ketorolaco con otro AINE o aspirina: contraindicado.'},
 {x:['metf'],y:['contraste'],s:1,t:'Con medio de contraste yodado se suele suspender la metformina según la función renal.'},
 {x:['bb'],y:['nodhp'],s:2,t:'Bradicardia y bloqueo AV.'},
 {x:['amino'],y:['asa','vancomicina'],s:2,t:'Más riesgo de daño al riñón y al oído.'},
 {x:['quino'],y:['teof'],s:2,t:'Sube la teofilina (toxicidad), sobre todo con ciprofloxacino.'},
 {x:['fluconazol'],y:['su'],s:1,t:'Más riesgo de hipoglucemia.'},
 {x:['qt'],y:['qt'],s:2,t:'Los dos alargan el QT: riesgo de arritmia (torsade de pointes). Pide ECG y vigila potasio y magnesio.'}];
const SEV=[,'moderada','importante','grave'];
// dosis máxima de referencia en adultos (mg/día) y en niños (mg/kg/día); se dice de dónde sale y se pide confirmarla en la etiqueta
const MAX={paracetamol:{a:4000,n:75,ref:'etiqueta FDA del paracetamol (máx. 4 g/día adulto); niños 75 mg/kg/día sin pasar de 4 g'},
 ibuprofeno:{a:3200,n:40,ref:'etiqueta FDA de ibuprofeno de receta (3,200 mg/día); niños 40 mg/kg/día'},naproxeno:{a:1500,ref:'etiqueta FDA de naproxeno (hasta 1,500 mg/día por tiempo limitado)'},
 diclofenaco:{a:150,ref:'ficha técnica de diclofenaco (150 mg/día)'},ketorolaco:{a:40,iv:120,ref:'etiqueta FDA de ketorolaco: oral 40 mg/día; IV/IM 120 mg/día (60 en ≥65 años o <50 kg); máximo 5 días en total'},
 metamizol:{a:4000,ref:'ficha técnica europea de metamizol (hasta 4,000 mg/día en adultos)'},tramadol:{a:400,ref:'etiqueta FDA de tramadol (400 mg/día; 300 en >75 años)'},
 metformina:{a:2550,ref:'etiqueta FDA de metformina de liberación inmediata (2,550 mg/día; la prolongada 2,000)'}};
const EMB={ieca:'IECA: contraindicado en el embarazo (daño fetal, advertencia en recuadro de la FDA).',ara2:'ARA II: contraindicado en el embarazo (daño fetal, advertencia en recuadro de la FDA).',
 avk:'Antivitamina K: teratogénico; en el embarazo se usa heparina.',teratog:'Teratogénico: evitar en el embarazo salvo indicación de especialista.',tetra:'Tetraciclinas: se evitan desde el 2.º trimestre (dientes y hueso del bebé).',
 aine:'AINE: la FDA pide evitarlos desde la semana 20 (daño renal fetal, poco líquido amniótico).',quino:'Fluoroquinolonas: en general se evitan en el embarazo.',statin:'Estatinas: en general se suspenden durante el embarazo.',statin3a:'Estatinas: en general se suspenden durante el embarazo.'};
function busca(nombre){const n=norm(nombre).replace(/[®™]/g,'').trim();if(!n)return null;
  const keys=Object.keys(DIC).sort((a,b)=>b.length-a.length);const k=keys.find(k=>n===k||n.startsWith(k+' ')||(' '+n+' ').includes(' '+k+' '));
  return k?{k,...DIC[k]}:null;}
function parsea(lin){const L=norm(lin);const d=busca(L.replace(/\d.*$/,'').trim()||L);
  const m=L.match(/(\d+(?:[.,]\d+)?)\s*(mg|g|mcg|µg|ug|ui|u\b|ml)\b/);let dosis=m?parseFloat(m[1].replace(',','.')):null,uni=m?m[2]:null;
  if(uni==='g'){dosis*=1000;uni='mg';}if(uni==='mcg'||uni==='µg'||uni==='ug'){dosis/=1000;uni='mg';}
  let veces=null;const h=L.match(/(?:c\/?|cada)\s*(\d+)\s*(?:h|hr|hrs|horas?)\b/);if(h)veces=24/+h[1];
  const v=L.match(/(\d+)\s*(?:veces|tomas)\s*(?:al|por|x)\s*d[ií]a/);if(v)veces=+v[1];
  if(/dosis unica|una sola dosis|stat\b/.test(L))veces=1;else if(!veces&&/(al|por|x)\s*d[ií]a|diari|c\/24|cada 24|en la (manana|noche)/.test(L))veces=1;
  const via=/\b(iv|im|intraven|intramus|ev)\b/.test(L)?'par':/\b(vo|oral|tableta|tab|capsula|jarabe|suspension)\b/.test(L)?'vo':null;
  const mgkg=L.match(/(\d+(?:[.,]\d+)?)\s*mg\/kg/);
  return {lin:lin.trim(),d,dosis:mgkg?null:dosis,uni,veces,via,mgkg:mgkg?parseFloat(mgkg[1].replace(',','.')):null};}
const tiene=(m,lista)=>lista.some(x=>m.d&&(m.d.k===x||m.d.c.includes(x)));
function revisa(meds,op){const out=[];const ok=meds.filter(m=>m.d),add=(s,t,quien,ref)=>out.push({s,t,quien,ref});
  for(const m of meds)if(!m.d)add(0,'No reconozco «'+m.lin+'». Revisa la ortografía o escribe el principio activo (no la marca); este no se revisó.',m.lin);
  // duplicidad
  for(let i=0;i<ok.length;i++)for(let j=i+1;j<ok.length;j++){const a=ok[i],b=ok[j];
    if(a.d.k===b.d.k||(a.d.en&&a.d.en===b.d.en))add(2,'Está dos veces el mismo principio activo.',a.d.k+' + '+b.d.k,'regla de Capri');
    else{const g=a.d.c.find(c=>DUP.has(c)&&b.d.c.includes(c));if(g)add(1,'Dos del mismo grupo ('+(NOMBRE_G[g]||g)+'): posible duplicidad terapéutica.',a.d.k+' + '+b.d.k,'regla de Capri');}}
  // interacciones
  const vistos=new Set();
  for(const r of IX)for(const a of ok)for(const b of ok){if(a===b||!tiene(a,r.x)||!tiene(b,r.y))continue;    if(r.z){const c=ok.find(c=>c!==a&&c!==b&&tiene(c,r.z));if(!c)continue;const key=r.t;if(vistos.has(key))continue;vistos.add(key);add(r.s,r.t,a.d.k+' + '+b.d.k+' + '+c.d.k,'interacción conocida');continue;}
    const key=[a.d.k,b.d.k].sort().join('|')+r.t;if(vistos.has(key))continue;vistos.add(key);add(r.s,r.t,a.d.k+' + '+b.d.k,'interacción conocida');}
  // alergias
  for(const al of op.alergias){const A=busca(al),n=norm(al);
    const grupos=new Set(A?[A.k,...A.c]:[]);if(/penicil|betalact/.test(n))grupos.add('pen');if(/betalact/.test(n)){grupos.add('cef');grupos.add('carba');}if(/cefalospor/.test(n))grupos.add('cef');
    if(/sulfa/.test(n))grupos.add('sulfa');if(/\baines?\b|antiinflamator/.test(n))grupos.add('aine');if(/macrolid/.test(n))grupos.add('macro');if(/quinolon/.test(n))grupos.add('quino');if(/opioid|opiace/.test(n))grupos.add('opio');
    if(!grupos.size){add(0,'No reconozco la alergia «'+al+'»; revísala tú contra la lista.',al);continue;}
    for(const m of ok){const g=m.d.c.find(c=>grupos.has(c)&&ALG.has(c)&&c!=='aine');
      if(m.d.k===A?.k||(A?.en&&m.d.en===A.en)||g==='pen')add(3,'Está en su lista de alergias («'+al+'»).',m.d.k,'alergias del paciente');
      else if(g)add(2,'Es del mismo grupo ('+(NOMBRE_G[g]||g)+') que su alergia («'+al+'»).',m.d.k,'alergias del paciente');
      else if(grupos.has('pen')&&m.d.c.includes('cef'))add(1,'Alergia a penicilina y cefalosporina: el riesgo cruzado es bajo pero existe (más si la alergia fue grave o con cadenas laterales parecidas).',m.d.k,'reactividad cruzada');
      else if(grupos.has('pen')&&m.d.c.includes('carba'))add(1,'Alergia a penicilina y carbapenémico: riesgo cruzado muy bajo; se vigila.',m.d.k,'reactividad cruzada');
      else if(grupos.has('aine')&&m.d.c.includes('aine'))add(2,'Alergia a AINE («'+al+'»): otros AINE pueden dar reacción cruzada.',m.d.k,'reactividad cruzada');}}
  // dosis
  for(const m of ok){const mx=MAX[m.d.k];
    if(m.dosis==null&&m.mgkg==null)add(1,'Falta la dosis.',m.d.k);
    if(m.veces==null)add(1,'Falta cada cuándo (frecuencia).',m.d.k);
    if(m.dosis!=null&&m.veces!=null){m.dia=m.dosis*m.veces;if(op.kg)m.kgdia=m.dia/op.kg;}
    if(m.mgkg!=null&&op.kg&&m.veces!=null){m.dia=m.mgkg*op.kg*m.veces;m.kgdia=m.mgkg*m.veces;}
    if(!mx||m.dia==null)continue;const nino=op.edad!=null&&op.edad<12;
    if(nino&&mx.n&&op.kg){const tope=Math.min(mx.n*op.kg,mx.a);if(m.dia>tope*1.001)add(2,`Da ${fmt(m.dia)} mg/día (${fmt(m.kgdia)} mg/kg/día): pasa la máxima de referencia en niños (${mx.n} mg/kg/día = ${fmt(tope)} mg/día).`,m.d.k,mx.ref);}
    else{const tope=m.via==='par'&&mx.iv?mx.iv:mx.a;if(m.dia>tope*1.001)add(2,`Da ${fmt(m.dia)} mg/día: pasa la máxima de referencia en adultos (${fmt(tope)} mg/día).`,m.d.k,mx.ref);}
    if(nino&&!op.kg&&mx.n)add(1,'Es niño: pon el peso para revisar la dosis por kilo.',m.d.k);}
  // embarazo y riñón
  // aspirina a dosis baja (≤150 mg/día) es antiagregante, no AINE de dolor: no se marca por embarazo ni riñón
  const asaBaja=m=>m.d.en==='aspirin'&&m.dia!=null&&m.dia<=150;
  if(op.emb)for(const m of ok){if(asaBaja(m))continue;const k=m.d.c.find(c=>EMB[c]);if(k)add(k==='tetra'||k==='aine'||k==='quino'||k==='statin'||k==='statin3a'?2:3,EMB[k],m.d.k,'embarazo');}
  if(op.tfg!=null)for(const m of ok){if(m.d.c.includes('metf')&&op.tfg<30)add(3,'Metformina con TFG < 30: contraindicada (etiqueta FDA).',m.d.k,'función renal');
    else if(m.d.c.includes('metf')&&op.tfg<45)add(1,'Metformina con TFG 30–45: no se recomienda iniciarla; si ya la toma, se reevalúa (etiqueta FDA).',m.d.k,'función renal');
    if(m.d.c.includes('aine')&&!asaBaja(m)&&op.tfg<30)add(2,'AINE con TFG < 30: se evitan.',m.d.k,'función renal');
    if(m.d.c.includes('doac')&&op.tfg<50)add(1,'Anticoagulante directo con TFG < 50: revisa el ajuste de dosis en su etiqueta.',m.d.k,'función renal');
    if(m.d.k==='nitrofurantoina'&&op.tfg<30)add(2,'Nitrofurantoína con TFG < 30: se evita.',m.d.k,'función renal');}
  return out.sort((a,b)=>b.s-a.s);}
const fmt=n=>(Math.round(n*10)/10).toLocaleString('es-MX');

// etiqueta oficial de la FDA (openFDA). En Capri de escritorio se pide desde la app; en el navegador, directo.
const fdaCache={};
async function bajaJSON(url){try{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(r.ok)return r.json();if(r.status===404)return null;}catch(e){}
  if(DESK?.ripBajar){const r=await DESK.ripBajar(url);if(r?.ok)return JSON.parse(new TextDecoder().decode(r.data));if(r?.status===404)return null;}throw new Error('sin conexión con openFDA');}
async function etiqueta(en){if(!en)return null;if(fdaCache[en]!==undefined)return fdaCache[en];
  const j=await bajaJSON('https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22'+encodeURIComponent(en)+'%22&limit=8');
  const rs=(j?.results||[]).filter(x=>x.drug_interactions||x.dosage_and_administration);
  const solo=rs.find(x=>(x.openfda?.generic_name||[]).some(g=>norm(g)===norm(en)))||rs[0]||null;
  return fdaCache[en]=solo&&{nombre:(solo.openfda?.brand_name||[])[0]||en,gen:(solo.openfda?.generic_name||[en])[0],fecha:solo.effective_time||'',id:solo.set_id||solo.id,
   box:(solo.boxed_warning||[]).join(' '),contra:(solo.contraindications||[]).join(' '),inter:(solo.drug_interactions||[]).join(' '),dosis:(solo.dosage_and_administration||[]).join(' ')};}
const EN_G={aine:['NSAID','nonsteroidal'],antiag:['antiplatelet','aspirin'],avk:['warfarin','anticoagulant'],doac:['anticoagulant'],hep:['heparin','anticoagulant'],opio:['opioid'],benzo:['benzodiazepine','CNS depressant'],
 sero:['serotonergic','serotonin'],imao:['MAO'],ieca:['ACE inhibitor'],ara2:['angiotensin receptor'],diur:['diuretic'],ahk:['potassium-sparing','potassium'],kplus:['potassium'],cyp3a:['CYP3A'],inductor:['inducer'],
 qt:['QT'],catio:['antacid','calcium','iron','magnesium'],pde5:['PDE5','sildenafil','tadalafil'],nitrato:['nitrate'],litio:['lithium'],digox:['digoxin'],statin:['statin'],statin3a:['statin']};
function extracto(txt,terms){if(!txt)return [];const out=[],seen=new Set();for(const t of terms){if(!t)continue;const re=new RegExp('[^.]{0,220}\\b'+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[^.]{0,220}\\.','i');const m=txt.match(re);
  if(m&&!seen.has(m.index)){seen.add(m.index);out.push(m[0].trim());}if(out.length>=2)break;}return out;}
const fdaURL=id=>'https://dailymed.nlm.nih.gov/dailymed/search.cfm?query='+encodeURIComponent(id);

let medRes=null,medBusy=false;
function vMeds(){const r=medRes;return `<h3>Verificador de medicamentos</h3><div class="sub">dosis · interacciones · alergias · embarazo · riñón</div>
  <div class="rp-g2"><div>
   <label class="rp-l">Medicamentos (uno por renglón, como en la receta)<textarea id="rpMeds" rows="7" placeholder="paracetamol 500 mg c/6 h VO&#10;enalapril 10 mg c/12 h&#10;espironolactona 25 mg al día">${esc(rip.meds||'')}</textarea></label>
   <div class="rp-in"><label class="rp-l">Alergias<input id="rpAl" value="${esc(rip.al||'')}" placeholder="penicilina, sulfas…"></label></div>
   <div class="rp-in"><label class="rp-l">Peso (kg)<input id="rpKg" type="number" step="0.1" value="${esc(rip.kg||'')}"></label><label class="rp-l">Edad (años)<input id="rpEd" type="number" step="0.1" value="${esc(rip.ed||'')}"></label>
    <label class="rp-l">TFG / CrCl<input id="rpTfg" type="number" value="${esc(rip.tfg||'')}" title="mL/min; sácala en Calculadoras"></label><label class="rp-chk" style="align-self:flex-end;padding-bottom:8px"><input type="checkbox" id="rpEmb" ${rip.emb?'checked':''}> Embarazo</label></div>
   <div class="rp-in"><button class="hbtn c" data-a="verif">${medBusy?'Revisando…':'Verificar'}</button><label class="rp-chk"><input type="checkbox" id="rpFda" ${rip.fda!==false?'checked':''}> Traer la etiqueta oficial (openFDA, necesita internet)</label></div>
   <small class="rp-mut">Capri revisa con una lista corta de reglas bien conocidas, dosis máximas de referencia y la etiqueta oficial. <b>Que no salga nada no quiere decir que no haya interacción.</b> Las etiquetas de la FDA son de EE. UU.; en México manda la información para prescribir de COFEPRIS y tu Compendio. Esto no es indicación médica.</small>
  </div><div id="rpMedR">${r?pintaMeds(r):'<small class="rp-mut">Escribe la receta y dale Verificar.</small>'}</div></div>`;}
function pintaMeds(r){const ic=['?','◐','▲','✖'],cl=['mut','mod','imp','gra'];
  return `<div class="rp-st">${r.meds.filter(m=>m.d).length}/${r.meds.length} reconocidos · ${r.hall.filter(h=>h.s>=2).length} importante(s) o grave(s)</div>
  ${r.hall.map(h=>`<div class="rp-h ${cl[h.s]}"><b>${ic[h.s]} ${h.s?SEV[h.s]:'a verificar'}</b> · <span>${esc(h.quien)}</span><br>${esc(h.t)}${h.ref?`<small> — ${esc(h.ref)}</small>`:''}</div>`).join('')||'<div class="rp-h ok">✓ Nada en mis reglas. Revisa la etiqueta abajo de todos modos.</div>'}
  ${r.meds.filter(m=>m.dia!=null).length?`<div class="rp-box" style="margin-top:8px"><b>Dosis por día</b>${r.meds.filter(m=>m.dia!=null).map(m=>`<div>${esc(m.d.k)}: ${fmt(m.dia)} mg/día${m.kgdia!=null?' · '+fmt(m.kgdia)+' mg/kg/día':''}</div>`).join('')}</div>`:''}
  ${r.cnis?.length?`<div class="rp-box"><b>Tu Compendio dice</b>${r.cnis.map(c=>`<div class="rp-ex"><small>${esc(c.cita)}</small><br>${esc(c.text.slice(0,500))}…</div>`).join('')}</div>`:''}
  ${r.fda?`<div class="rp-box"><b>Etiqueta oficial de la FDA</b>${r.fda.map(f=>f.err?`<div class="rp-ex"><small>${esc(f.k)}: ${esc(f.err)}</small></div>`:`<div class="rp-ex"><b>${esc(f.k)}</b> <small>(${esc(f.l.gen)}${f.l.fecha?', versión '+f.l.fecha.slice(0,4):''} · <a href="${fdaURL(f.l.gen)}" target="_blank" rel="noopener">DailyMed</a>)</small>
     ${f.l.box?`<div class="rp-q gra">Advertencia en recuadro: ${esc(f.l.box.slice(0,420))}${f.l.box.length>420?'…':''}</div>`:''}
     ${f.cruces.map(c=>`<div class="rp-q">Sobre ${esc(c.con)}: «${esc(c.txt)}»</div>`).join('')}
     ${!f.cruces.length&&r.meds.filter(m=>m.d).length>1?'<small class="rp-mut">Su sección de interacciones no menciona a los otros por nombre ni por grupo.</small>':''}</div>`).join('')}
    <small class="rp-mut">Texto de la etiqueta en inglés, tal cual. openFDA avisa que sus datos no están validados para decidir atención médica.</small></div>`:''}
  <div class="rp-in"><button class="mini" data-a="medcapri">Que Capri me lo explique</button></div>`;}
async function verificar(){const txt=$r('rpMeds').value;rip.meds=txt;rip.al=$r('rpAl').value;rip.kg=$r('rpKg').value;rip.ed=$r('rpEd').value;rip.tfg=$r('rpTfg').value;rip.emb=$r('rpEmb').checked;rip.fda=$r('rpFda').checked;save();
  const meds=txt.split(/\n|;/).map(s=>s.trim()).filter(Boolean).map(parsea);if(!meds.length)return;
  const op={alergias:rip.al.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean),kg:+rip.kg||null,edad:rip.ed===''?null:+rip.ed,tfg:rip.tfg===''?null:+rip.tfg,emb:rip.emb};
  medRes={meds,hall:revisa(meds,op)};medBusy=true;render();
  try{const ok=meds.filter(m=>m.d);
    // tu Compendio (si lo cargaste en Fuentes oficiales)
    const cn=(await oficiales()).filter(d=>d.oficial.tipo==='Compendio');medRes.cnis=[];
    if(cn.length)for(const m of ok.slice(0,6)){const hs=(await window.bibBuscar(m.d.k+' dosis interacciones contraindicaciones',8)).filter(h=>cn.some(d=>d.id===h.t.doc)&&norm(h.t.text).includes(m.d.k));
      if(hs[0])medRes.cnis.push({cita:'Compendio '+(cn.find(d=>d.id===hs[0].t.doc).oficial.anio||'')+', p. '+(hs[0].t.pag||'?')+' · '+m.d.k,text:hs[0].t.text});}
    if(rip.fda){medRes.fda=[];
      for(const m of ok.slice(0,8)){if(!m.d.en){medRes.fda.push({k:m.d.k,err:'no se vende en EE. UU.; búscalo en tu Compendio'});continue;}
        try{const l=await etiqueta(m.d.en);if(!l){medRes.fda.push({k:m.d.k,err:'no encontré su etiqueta'});continue;}
          const cruces=[];for(const o of ok){if(o===m)continue;const terms=[o.d.en,...o.d.c.flatMap(c=>EN_G[c]||[])].filter(Boolean);const ex=extracto(l.inter+' '+l.contra,terms);if(ex.length)cruces.push({con:o.d.k,txt:ex.join(' … ').slice(0,600)});}
          medRes.fda.push({k:m.d.k,l,cruces});}catch(e){medRes.fda.push({k:m.d.k,err:e.message});}}}}
  finally{medBusy=false;render();}}
function medACapri(){const r=medRes;if(!r)return;const n=cfg.name||'Kiga';
  const t=`(${n} usó el verificador de medicamentos de R.I.P. Explícale en español y en corto qué significa cada hallazgo y qué se suele hacer, citando la fuente que aparece entre paréntesis. No inventes interacciones ni dosis que no estén aquí; lo que no esté, dilo como «a verificar». No cambies la receta ni des diagnóstico: eso lo decide el médico tratante.)
Receta: ${r.meds.map(m=>m.lin).join('; ')}
Hallazgos:\n${r.hall.map(h=>'- ['+(h.s?SEV[h.s]:'a verificar')+'] '+h.quien+': '+h.t+(h.ref?' (fuente: '+h.ref+')':'')).join('\n')||'- ninguno en las reglas'}
${(r.fda||[]).filter(f=>f.l).map(f=>'Etiqueta FDA de '+f.k+(f.l.box?'\n  Recuadro: '+f.l.box.slice(0,400):'')+f.cruces.map(c=>'\n  Sobre '+c.con+': '+c.txt).join('')).join('\n')}
${(r.cnis||[]).map(c=>c.cita+': '+c.text.slice(0,500)).join('\n')}`;
  window.hudGo?.('capri',true);setTimeout(()=>respond(t),380);}

// ================= LECTOR DE ESCANEOS (OCR local) =================
const OCR_DIR=()=>new URL('vendor/ocr/',location.href).href;
let tw=null,twT=0;
async function worker(av){if(!window.Tesseract)await loadScript('vendor/ocr/tesseract.min.js');
  if(!tw){av?.('Despertando el lector (la primera vez tarda unos segundos)…');const d=OCR_DIR();
    tw=Tesseract.createWorker('spa+eng',1,{workerPath:d+'worker.min.js',corePath:d,langPath:d,workerBlobURL:false,gzip:true,cacheMethod:'none',
      logger:m=>{if(m.status==='recognizing text'&&av)av('Leyendo… '+Math.round(m.progress*100)+'%');}});}
  clearTimeout(twT);twT=setTimeout(async()=>{const w=await tw;tw=null;w.terminate();},120000);return tw;}
async function reconoce(img,av){const w=await worker(av);const {data}=await w.recognize(img);
  const ws=(data.words||[]).map(x=>({t:x.text,c:x.confidence}));return {text:data.text||'',conf:data.confidence||0,ws};}
async function ocrLocal(buf,mime,av=()=>{}){
  if(/heic|heif/.test(mime||''))throw new Error('las fotos HEIC del iPhone no las abre el lector; pásala a JPG o mándala por WhatsApp a tu PC.');
  if(mime==='application/pdf'){if(!window.pdfjsLib)await pdfText(new ArrayBuffer(0)).catch(()=>{});   // carga pdf.js como lo hace Capri
    const pdf=await pdfjsLib.getDocument({data:buf.slice(0)}).promise;let text='',sum=0,ws=[];
    for(let i=1;i<=pdf.numPages;i++){av('Página '+i+' de '+pdf.numPages+'…');const pg=await pdf.getPage(i),vp=pg.getViewport({scale:2});
      const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      const r=await reconoce(c,m=>av('Página '+i+'/'+pdf.numPages+' · '+m));text+=`\n[Página ${i}]\n`+r.text;sum+=r.conf;ws.push(...r.ws);}
    return {text:text.trim(),conf:sum/Math.max(1,pdf.numPages),ws};}
  return reconoce(new Blob([buf],{type:mime||'image/png'}),av);}
window.ocrLocal=ocrLocal;window.ocrImagen=reconoce;   // una sola página (canvas o imagen): la lectura completa de PDFs la usa para las páginas sin texto
let ocrRes=null;
function vOcr(){const r=ocrRes,modo=store.get('ripOcr','local');
  return `<h3>Lector de escaneos</h3><div class="sub">fotos de apuntes, estudios y PDF escaneados</div>
  <p class="rp-p">El lector corre en tu PC (Tesseract, español e inglés): no necesita internet ni key y la imagen no sale de tu equipo. Lee bien letra impresa; con letra a mano se equivoca más. Las palabras que leyó con duda salen <mark class="dud">marcadas</mark>.</p>
  <div class="rp-in"><span class="rp-mut">En la biblioteca los escaneos los lee:</span><select id="rpOcrM"><option value="local" ${modo==='local'?'selected':''}>El lector de Capri (privado, sin internet)</option><option value="gemini" ${modo==='gemini'?'selected':''}>Gemini (mejor con letra a mano; manda la imagen a Google)</option></select></div>
  <div class="drop rp-drop" id="rpOcrDrop">Suelta una foto o un PDF escaneado para pasarlo a texto<small>JPG · PNG · WEBP · BMP · PDF</small></div><input type="file" id="rpOcrF" accept="image/*,.pdf" style="display:none">
  <div id="rpOcrP" class="rp-st"></div>
  ${r?`<div class="rp-box"><b>${esc(r.name)}</b> · confianza ${Math.round(r.conf)}%${r.conf<70?' · <span class="gra">baja: revisa con cuidado</span>':''}
   <div class="rp-ocr">${pintaOcr(r)}</div>
   <div class="rp-in"><button class="mini" data-a="ocrcp">Copiar</button><button class="mini" data-a="ocrbib">Guardar en la biblioteca</button><button class="mini" data-a="ocrcapri">Que Capri lo ordene</button></div></div>`:''}`;}
function pintaOcr(r){const dud=new Map();for(const w of r.ws)if(w.c<60&&w.t.trim())dud.set(w.t,(dud.get(w.t)||0)+1);
  return esc(r.text).replace(/[^\s<>&]+/g,w=>dud.has(w)?'<mark class="dud" title="leída con duda">'+w+'</mark>':w);}
async function ocrArchivo(f){const p=$r('rpOcrP');try{const buf=await f.arrayBuffer(),mime=f.type||(/\.pdf$/i.test(f.name)?'application/pdf':'image/png');const t0=performance.now();
  const r=await ocrLocal(buf,mime,m=>p.textContent=m);ocrRes={...r,name:f.name};log('R.I.P lector: '+f.name+' en '+Math.round((performance.now()-t0)/1000)+' s','g');render();}
  catch(e){p.textContent='✖ '+e.message;}}

// ================= MODO ESTUDIO =================
// pedirle JSON al cerebro: tu GPU si está lista (nada sale de la PC); si no, Gemini
async function llmJSON(sys,user){if(window.cerebroInfo?.().ok&&window.cerebroInfo().modo!=='gemini'){try{const j=await window.cerebroJSON(sys,user.slice(0,7000));if(j)return j;}catch(e){log('R.I.P: la GPU no pudo ('+e.message+'), uso Gemini','w');}}
  if(!cfg.key||!cfg.model)throw new Error('necesito tu GPU (Ollama) o tu key de Gemini');
  const r=await fetch(API+'models/'+encodeURIComponent(cfg.model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cfg.key},
    body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{temperature:.3,responseMimeType:'application/json',...(thinkCfg(cfg.model)?{thinkingConfig:thinkCfg(cfg.model)}:{})}})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error?.message||('Error '+r.status));
  const t=(j.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&p.text).map(p=>p.text).join('');return JSON.parse(t.replace(/^```(json)?|```$/g,''));}
// toma un pedazo del documento con sus páginas
function pedazo(txt,n){const pags=txt.split(/(?=\[Página \d+\])/);if(txt.length<=n)return txt;let i=Math.floor(Math.random()*pags.length),out='';
  while(out.length<n&&i<pags.length)out+=pags[i++];if(out.length<n/2){out=txt.slice(0,n);}return out.slice(0,n);}
const enTexto=(cita,txt)=>{const c=norm(cita).replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ').trim();if(c.length<12)return false;const t=norm(txt).replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ');
  return t.includes(c)||c.split(' ').length>=6&&t.includes(c.split(' ').slice(0,6).join(' '));};
let est={doc:'',busy:false,msg:'',quiz:null,rep:null};
async function vEstudio(){const ds=(await (window.bibDocs?.()||[]));const venc=window.saberVencidas?.()||[],tot=window.saberTarjetas?.().length||0;
  if(!est.doc&&ds[0])est.doc=ds[0].id;
  return `<h3>Modo estudio</h3><div class="sub">repaso espaciado · examen · casos clínicos</div>
  <div class="rp-g2"><div>
   <div class="rp-box"><b>Tarjetas de repaso</b><small>${tot} tarjeta(s) · <b>${venc.length}</b> para hoy. Son las mismas que Capri hace al platicar (comando «repaso»); se programan solas según qué tan bien te salen.</small>
    ${est.rep?pintaRep():`<div class="rp-in"><button class="hbtn c" data-a="rep" ${venc.length?'':'disabled'}>Repasar ahora</button></div>`}</div>
   <div class="rp-box"><b>Desde un documento de tu biblioteca</b>
    <div class="rp-in"><select id="rpDoc">${ds.map(d=>`<option value="${d.id}" ${d.id===est.doc?'selected':''}>${esc(d.oficial?'🏛 ':'')}${esc(d.name)}</option>`).join('')||'<option value="">(tu biblioteca está vacía)</option>'}</select></div>
    <div class="rp-in"><button class="mini" data-a="tarj" ${ds.length?'':'disabled'}>Hazme 8 tarjetas</button><button class="mini" data-a="quiz" ${ds.length?'':'disabled'}>Examen de 10 preguntas</button><button class="mini" data-a="caso" ${ds.length?'':'disabled'}>Caso clínico</button></div>
    <small class="rp-mut">Capri solo pregunta lo que dice el documento y apunta la página. Si la cita que da no aparece en el texto, la marca con ⚠.</small>
    <div class="rp-st">${esc(est.msg)}</div></div>
  </div><div>${est.quiz?pintaQuiz():'<small class="rp-mut">Aquí sale tu examen.</small>'}</div></div>`;}
function pintaRep(){const r=est.rep,t=r.l[r.i];if(!t)return `<div class="rp-st">✓ Repaso terminado: ${r.bien} bien de ${r.l.length}.</div><div class="rp-in"><button class="mini" data-a="repfin">Cerrar</button></div>`;
  return `<div class="rp-card"><small>${esc(t.tema)} · ${r.i+1}/${r.l.length}</small><p>${esc(t.p)}</p>${r.ver?`<p class="rp-ans">${esc(t.r)}${t.fuente?`<small> — ${esc(t.fuente)}</small>`:''}</p>
   <div class="rp-in"><button class="mini gra" data-n="mal">No me la sabía</button><button class="mini" data-n="regular">Más o menos</button><button class="mini ok" data-n="bien">Bien</button></div>`:'<div class="rp-in"><button class="hbtn c" data-a="ver">Ver respuesta</button></div>'}</div>`;}
function pintaQuiz(){const q=est.quiz,p=q.l[q.i];
  if(!p)return `<div class="rp-box"><b>Resultado: ${q.ok}/${q.l.length}</b><small>${esc(q.doc)}. ${q.l.length-q.ok?'Las que fallaste quedaron como tarjetas de repaso.':'¡Perfecto!'}</small><div class="rp-in"><button class="mini" data-a="quizfin">Cerrar</button></div></div>`;
  return `<div class="rp-card"><small>${esc(q.doc)} · pregunta ${q.i+1}/${q.l.length} · ${q.ok} bien</small><p>${esc(p.p)}</p>
   ${p.ops.map((o,i)=>`<button class="rp-op ${p.r!=null?(i===p.ok?'ok':i===p.r?'gra':''):''}" data-o="${i}" ${p.r!=null?'disabled':''}>${'ABCD'[i]}) ${esc(o)}</button>`).join('')}
   ${p.r!=null?`<p class="rp-ans">${esc(p.exp||'')}<small> — ${esc(q.doc)}${p.pag?', p. '+p.pag:''}${p.v?'':' · ⚠ no encontré esa cita en el documento: verifícala'}</small></p><div class="rp-in"><button class="hbtn c" data-a="sig">Siguiente</button></div>`:''}</div>`;}
async function estudioIA(tipo){const ds=await window.bibDocs();const d=ds.find(x=>x.id===est.doc);if(!d)return;const txt=window.bibTexto(d.id);const n=cfg.name||'Kiga';
  if(tipo==='caso'){window.bibFoco?.(d);window.hudGo?.('capri',true);
    setTimeout(()=>send(`Arma un caso clínico tipo ENARM usando SOLO lo que dice «${d.name}». Preséntalo por partes (motivo de consulta, historia, exploración, estudios) y en cada parte hazme una pregunta y espera mi respuesta. Al final dime qué estuvo bien, corrige con la página del documento y haz tarjetas de lo que fallé. Es un ejercicio de estudio, no un paciente real.`),380);return;}
  est.busy=true;est.msg='Capri está leyendo «'+d.name+'»…';render();
  const trozo=pedazo(txt,cfg.key?14000:6000);
  try{if(tipo==='tarj'){const j=await llmJSON(`Eres Capri, tutora de medicina de ${n}. Haces tarjetas de repaso SOLO con datos que aparecen en el texto que te dan. Nada de conocimiento externo. Devuelve JSON: {"tarjetas":[{"tema":"...","p":"pregunta corta","r":"respuesta corta","pag":N o null,"cita":"frase copiada tal cual del texto que respalda la respuesta"}]}`,
      `Documento «${d.name}». Haz 8 tarjetas de lo más importante para un examen.\n\n${trozo}`);
      let n1=0,n2=0;for(const t of (j.tarjetas||[]).slice(0,10)){if(!t.p||!t.r)continue;const v=enTexto(t.cita||'',txt);
        if(window.saberTarjeta?.(t.tema||d.name,t.p,t.r,d.name+(t.pag?', p. '+t.pag:'')+(v?'':' (⚠ cita sin verificar)')))v?n1++:n2++;}
      est.msg=`✓ ${n1+n2} tarjeta(s) nuevas${n2?' ('+n2+' con cita que no encontré en el texto: revísalas en «saber»)':''}. Salen en tu repaso de mañana.`;}
    else{const j=await llmJSON(`Eres Capri, tutora de medicina de ${n}. Haces preguntas de opción múltiple estilo ENARM SOLO con lo que dice el texto. Cuatro opciones, una correcta, distractores plausibles. Devuelve JSON: {"preguntas":[{"p":"...","ops":["","","",""],"ok":0-3,"exp":"por qué, en una o dos frases","pag":N o null,"cita":"frase copiada tal cual del texto"}]}`,
      `Documento «${d.name}». Haz 10 preguntas.\n\n${trozo}`);
      const l=(j.preguntas||[]).filter(p=>p.p&&Array.isArray(p.ops)&&p.ops.length===4&&p.ok>=0&&p.ok<4).slice(0,10).map(p=>({...p,v:enTexto(p.cita||'',txt),r:null}));
      if(!l.length)throw new Error('no salieron preguntas válidas; intenta otra vez');est.quiz={doc:d.name,l,i:0,ok:0};est.msg='';}}
  catch(e){est.msg='✖ '+e.message;}finally{est.busy=false;render();}}

// ================= RESPALDO DEL EXPEDIENTE =================
let rdb=null;const ridb=()=>rdb||(rdb=new Promise((res,rej)=>{const o=indexedDB.open('capri-rip',1);o.onupgradeneeded=()=>o.result.createObjectStore('kv');o.onsuccess=()=>res(o.result);o.onerror=()=>rej(o.error);}));
const rkv=async(mode,fn)=>{const d=await ridb();return new Promise((res,rej)=>{const t=d.transaction('kv',mode);const r=fn(t.objectStore('kv'));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});};
let codigoNuevo=null,respMsg='';
async function respaldar(por){const j=await window.expRespaldo?.();if(!j)return {ok:false,why:'el expediente está cerrado'};
  const txt=JSON.stringify(j),d=new Date(),p=n=>String(n).padStart(2,'0'),nom=`expediente-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.capriexp`;
  // copia en este equipo (las 7 más nuevas): sirve si se daña el expediente o si olvidas la llave
  const hist=(await rkv('readonly',s=>s.get('hist')).catch(()=>null))||[];hist.unshift({nom,ts:Date.now(),txt});await rkv('readwrite',s=>s.put(hist.slice(0,7),'hist'));
  let donde='en este equipo';
  if(DESK?.guardarRespaldo){const r=await DESK.guardarRespaldo(nom,txt);if(r?.ok)donde='en Documentos\\Capri\\Respaldos';}
  else{const h=await rkv('readonly',s=>s.get('dir')).catch(()=>null);
    if(h&&(await h.queryPermission?.({mode:'readwrite'}))==='granted'){try{const fh=await h.getFileHandle(nom,{create:true}),w=await fh.createWritable();await w.write(txt);await w.close();donde='en tu carpeta «'+h.name+'»';}catch(e){}}
    else if(por==='manual'){const u=URL.createObjectURL(new Blob([txt],{type:'application/json'})),l=document.createElement('a');l.href=u;l.download=nom;l.click();setTimeout(()=>URL.revokeObjectURL(u),2000);donde='en Descargas';}}
  rip.ultResp=Date.now();rip.ultDonde=donde;save();log('R.I.P: respaldo cifrado del expediente '+donde+(por==='auto'?' (automático)':''),'g');return {ok:true,donde};}
addEventListener('exp:guardado',()=>{if(rip.auto&&Date.now()-rip.ultResp>20*36e5)setTimeout(()=>respaldar('auto').catch(()=>{}),1500);});
async function vRespaldo(){const e=window.expEstado?.()||{},hist=(await rkv('readonly',s=>s.get('hist')).catch(()=>null))||[],dir=await rkv('readonly',s=>s.get('dir')).catch(()=>null);
  const f=ts=>ts?new Date(ts).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'nunca';
  return `<h3>Respaldo del expediente</h3><div class="sub">siempre cifrado · AES-256</div>
  <div class="rp-g2"><div>
   <div class="rp-box"><b>Estado</b><small>${!e.existe?'Todavía no creas el expediente.':e.abierto?'Expediente abierto · '+e.pacs+' paciente(s).':'Expediente cerrado: ábrelo con tu llave para respaldar o crear el código.'}</small>
    <small>Último respaldo: <b>${f(rip.ultResp)}</b>${rip.ultDonde?' · '+esc(rip.ultDonde):''}</small>
    <label class="rp-chk"><input type="checkbox" id="rpAuto" ${rip.auto?'checked':''}> Respaldar solo una vez al día cuando guardas algo</label>
    <small class="rp-mut">${DESK?.guardarRespaldo?'Capri de escritorio lo guarda en Documentos\\Capri\\Respaldos (se quedan los 30 más nuevos).':dir?'Se guarda en tu carpeta «'+esc(dir.name)+'».':'En el navegador elige una carpeta (de preferencia una que se sincronice, como OneDrive o Google Drive) para que se guarde sola.'}</small>
    <div class="rp-in"><button class="hbtn c" data-a="respnow" ${e.abierto?'':'disabled'}>Respaldar ahora</button>${DESK?.abrirRespaldos?'<button class="mini" data-a="respdir">Abrir carpeta</button>':window.showDirectoryPicker?'<button class="mini" data-a="respelige">'+(dir?'Cambiar carpeta':'Elegir carpeta')+'</button>':''}</div>
    <div class="rp-st">${esc(respMsg)}</div>
    ${hist.length?`<small class="rp-mut">Copias en este equipo: ${hist.map(h=>f(h.ts)).join(' · ')}</small>`:''}</div>
   <div class="rp-box"><b>Código de recuperación</b>
    <small>Si olvidas la llave, sin esto no hay forma de abrir el expediente. Es un código al azar que <b>solo existe en tu papel</b>: Capri lo usa para sellar una copia extra cada vez que guardas, pero no puede abrirla sin que lo teclees.</small>
    <small>${e.codigo?'✓ Tienes código desde el '+f(e.codigo.ts)+' (huella '+esc(e.codigo.id)+'). Crear otro invalida el anterior para las copias nuevas.':'Todavía no tienes código.'}</small>
    ${codigoNuevo?`<div class="rp-code">${esc(codigoNuevo)}</div><small class="gra">Escríbelo en papel y guárdalo lejos de la PC. No se vuelve a mostrar.</small><div class="rp-in"><button class="mini" data-a="codprint">Imprimir</button><button class="mini" data-a="codok">Ya lo escribí</button></div>`
     :`<div class="rp-in"><button class="hbtn" data-a="codigo" ${e.abierto?'':'disabled'}>${e.codigo?'Crear código nuevo':'Crear código'}</button></div>`}</div>
  </div><div>
   <div class="rp-box"><b>Olvidé mi llave / restaurar con código</b>
    <small>${e.abierto?'Con el expediente abierto, lo que traiga la copia se suma (solo pacientes que falten; no se borra nada).':'Abre la copia sellada de este equipo (o un archivo .capriexp) con tu código y pon una llave nueva.'}</small>
    <label class="rp-l">Código de recuperación<input id="rpCod" autocomplete="off" placeholder="XXXX-XXXX-…"></label>
    <label class="rp-l">Archivo de respaldo (opcional)<input type="file" id="rpRF" accept=".capriexp,.json"></label>
    ${e.abierto?'':'<label class="rp-l">Llave nueva (mín. 8)<input type="password" id="rpN1" autocomplete="new-password"></label><label class="rp-l">Repítela<input type="password" id="rpN2" autocomplete="new-password"></label>'}
    <div class="rp-in"><button class="hbtn c" data-a="recup">${e.abierto?'Restaurar':'Recuperar expediente'}</button></div><div class="rp-st" id="rpRMsg"></div></div>
   <small class="rp-mut">Guarda el expediente al menos 5 años desde el último acto médico (NOM-004-SSA3-2012, 5.4). Los respaldos ya van cifrados: aunque alguien tenga el archivo, sin tu llave o tu código no puede leerlo.</small>
  </div></div>`;}
async function recuperar(){const m=$r('rpRMsg'),e=window.expEstado?.()||{};m.textContent='';
  try{const cod=$r('rpCod').value.trim();if(!cod)throw new Error('escribe tu código');let arch=null;const f=$r('rpRF').files[0];
    if(f){arch=JSON.parse(await f.text());if(arch.app!=='capri-expediente')throw new Error('ese archivo no es un respaldo del expediente');}
    if(!e.abierto){const a=$r('rpN1').value,b=$r('rpN2').value;if(a.length<8)throw new Error('la llave nueva necesita mínimo 8 caracteres');if(a!==b)throw new Error('las llaves no coinciden');
      if(e.existe&&!confirm('Esto reemplaza el expediente cerrado de este equipo por la copia que abre tu código, con la llave nueva. ¿Seguir?'))return;
      const datos=await window.expAbrirConCodigo(cod,arch);const n=await window.expRecibir(datos,a);m.textContent='✓ Recuperado: '+n+' paciente(s). Ya abre con tu llave nueva. Crea un código nuevo.';}
    else{const datos=await window.expAbrirConCodigo(cod,arch);const n=await window.expRecibir(datos);m.textContent='✓ Se sumaron '+n+' paciente(s).';}
    $r('rpCod').value='';}catch(err){m.textContent='✖ '+err.message;}}

// ================= CALCULADORAS =================
// cada una: campos y fórmula; el resultado dice de dónde sale. n=número, s=opciones [valor,texto], c=casilla (suma su valor)
const C=(k,n,ref,campos,f)=>({k,n,ref,campos,f});
const sx=['s','Sexo',[['m','Hombre'],['f','Mujer']]];
const CALC=[
 C('imc','IMC','OMS: bajo peso <18.5 · normal 18.5–24.9 · sobrepeso 25–29.9 · obesidad I 30–34.9 · II 35–39.9 · III ≥40',[['kg','Peso','n','kg'],['cm','Talla','n','cm']],
  v=>{const x=v.kg/(v.cm/100)**2;return [x.toFixed(1)+' kg/m²',x<18.5?'Bajo peso':x<25?'Normal':x<30?'Sobrepeso':x<35?'Obesidad grado I':x<40?'Obesidad grado II':'Obesidad grado III'];}),
 C('sc','Superficie corporal','Mosteller: √(talla cm × peso kg / 3600)',[['kg','Peso','n','kg'],['cm','Talla','n','cm']],v=>[Math.sqrt(v.cm*v.kg/3600).toFixed(2)+' m²']),
 C('dosis','Dosis por peso','dosis = mg/kg × kg; si es por día se divide entre las tomas. Revisa que no pase la dosis máxima del adulto.',
  [['kg','Peso','n','kg'],['mgkg','Dosis','n','mg/kg'],['por','La dosis es','s',[['dia','por día (se divide)'],['toma','por toma']]],['tomas','Tomas al día','n',''],['conc','Concentración (opcional)','n','mg/mL']],
  v=>{const dia=v.por==='dia'?v.mgkg*v.kg:v.mgkg*v.kg*v.tomas,toma=dia/v.tomas;return [fmt(toma)+' mg por toma',fmt(dia)+' mg/día'+(v.conc?' · '+fmt(toma/v.conc)+' mL por toma':'')];}),
 C('goteo','Goteo','gotas/min = volumen (mL) × factor de goteo ÷ minutos (macrogotero 20, microgotero 60)',[['ml','Volumen','n','mL'],['h','Tiempo','n','horas'],['fac','Equipo','s',[['20','Macrogotero (20 gotas/mL)'],['60','Microgotero (60)'],['15','15 gotas/mL']]]],
  v=>[Math.round(v.ml*+v.fac/(v.h*60))+' gotas/min',fmt(v.ml/v.h)+' mL/h']),
 C('glasgow','Escala de Glasgow','Teasdale y Jennett, 1974: 13–15 leve · 9–12 moderado · ≤8 grave (considerar vía aérea)',[
  ['o','Apertura ocular','s',[[4,'4 Espontánea'],[3,'3 Al hablarle'],[2,'2 Al dolor'],[1,'1 No abre']]],
  ['v','Respuesta verbal','s',[[5,'5 Orientada'],[4,'4 Confusa'],[3,'3 Palabras inapropiadas'],[2,'2 Sonidos incomprensibles'],[1,'1 Ninguna']]],
  ['m','Respuesta motora','s',[[6,'6 Obedece'],[5,'5 Localiza el dolor'],[4,'4 Retira al dolor'],[3,'3 Flexión anormal'],[2,'2 Extensión'],[1,'1 Ninguna']]]],
  v=>{const s=+v.o + +v.v + +v.m;return [s+' / 15',`O${v.o} V${v.v} M${v.m} · `+(s>=13?'leve':s>=9?'moderado':'grave')];}),
 C('cha','CHA₂DS₂-VASc','Lip et al., 2010 (riesgo de EVC en fibrilación auricular). La decisión de anticoagular es del médico, según la guía vigente.',[
  ['icc','Insuficiencia cardiaca / disfunción del VI','c',1],['has','Hipertensión','c',1],['ed','Edad','s',[[0,'<65'],[1,'65–74'],[2,'≥75']]],['dm','Diabetes','c',1],
  ['evc','EVC, AIT o tromboembolia previa','c',2],['vas','Enfermedad vascular (IAM, EAP, placa aórtica)','c',1],['sx','Sexo','s',[[0,'Hombre'],[1,'Mujer']]]],
  v=>{const s=v.icc+v.has+ +v.ed+v.dm+v.evc+v.vas+ +v.sx;return [s+' punto(s)',+v.sx&&s===1?'Solo suma por sexo femenino':'Más puntos = más riesgo anual de EVC'];}),
 C('hasbled','HAS-BLED','Pisters et al., 2010 (riesgo de sangrado con anticoagulante): ≥3 = alto, vigilar y corregir factores modificables',[
  ['h','Hipertensión no controlada (PAS >160)','c',1],['r','Función renal anormal','c',1],['l','Función hepática anormal','c',1],['s','EVC previo','c',1],['b','Sangrado previo o predisposición','c',1],
  ['i','INR lábil','c',1],['e','Edad >65 años','c',1],['d','Fármacos (antiagregante o AINE)','c',1],['a','Alcohol (≥8 bebidas/semana)','c',1]],
  v=>{const s=Object.values(v).reduce((a,b)=>a+b,0);return [s+' punto(s)',s>=3?'Riesgo alto de sangrado':'Riesgo bajo a moderado'];}),
 C('cg','Depuración de creatinina (Cockcroft-Gault)','Cockcroft y Gault, 1976: ((140 − edad) × peso) ÷ (72 × creatinina) × 0.85 en mujeres',[['ed','Edad','n','años'],['kg','Peso','n','kg'],['cr','Creatinina sérica','n','mg/dL'],sx],
  v=>{let x=(140-v.ed)*v.kg/(72*v.cr);if(v.s==='f')x*=.85;return [fmt(x)+' mL/min'];}),
 C('ckd','TFG (CKD-EPI 2021)','Inker et al., NEJM 2021 (sin raza): 142 × min(Cr/κ,1)^α × max(Cr/κ,1)^−1.200 × 0.9938^edad × 1.012 si mujer',[['ed','Edad','n','años'],['cr','Creatinina sérica','n','mg/dL'],sx],
  v=>{const f=v.s==='f',k=f?.7:.9,a=f?-.241:-.302,r=v.cr/k;const x=142*Math.min(r,1)**a*Math.max(r,1)**-1.2*.9938**v.ed*(f?1.012:1);
   return [fmt(x)+' mL/min/1.73 m²','Etapa (KDIGO) '+(x>=90?'G1':x>=60?'G2':x>=45?'G3a':x>=30?'G3b':x>=15?'G4':'G5')];}),
 C('curb','CURB-65','Lim et al., Thorax 2003 (neumonía adquirida en la comunidad): 0–1 bajo · 2 moderado · ≥3 alto',[
  ['c','Confusión','c',1],['u','Urea >7 mmol/L (BUN >19 mg/dL)','c',1],['r','FR ≥30','c',1],['b','PAS <90 o PAD ≤60','c',1],['e','Edad ≥65','c',1]],
  v=>{const s=Object.values(v).reduce((a,b)=>a+b,0);return [s+' punto(s)',s<=1?'Riesgo bajo':s===2?'Riesgo moderado':'Riesgo alto'];}),
 C('qsofa','qSOFA','Sepsis-3 (Singer et al., JAMA 2016): ≥2 = más riesgo de mala evolución; no es criterio diagnóstico de sepsis por sí solo',[['r','FR ≥22','c',1],['m','Alteración del estado mental','c',1],['p','PAS ≤100','c',1]],
  v=>{const s=v.r+v.m+v.p;return [s+' / 3',s>=2?'Positivo: buscar disfunción orgánica':'Negativo']}),
 C('wells','Wells para TEP','Wells et al., 2000 (dos niveles): >4 TEP probable · ≤4 poco probable (considerar dímero D)',[
  ['tvp','Signos clínicos de TVP','c',3],['dx','TEP es el diagnóstico más probable','c',3],['fc','FC >100','c',1.5],['inm','Inmovilización ≥3 días o cirugía en 4 semanas','c',1.5],
  ['prev','TVP o TEP previos','c',1.5],['hem','Hemoptisis','c',1],['ca','Cáncer activo','c',1]],
  v=>{const s=Object.values(v).reduce((a,b)=>a+b,0);return [s+' punto(s)',s>4?'TEP probable':'TEP poco probable']}),
 C('ag','Brecha aniónica','Na − (Cl + HCO₃); corregida por albúmina: + 2.5 × (4 − albúmina g/dL)',[['na','Na','n','mEq/L'],['cl','Cl','n','mEq/L'],['hco','HCO₃','n','mEq/L'],['alb','Albúmina (opcional)','n','g/dL']],
  v=>{const x=v.na-(v.cl+v.hco);return [fmt(x)+' mEq/L',v.alb?'Corregida: '+fmt(x+2.5*(4-v.alb))+' mEq/L':'Normal aprox. 8–12 (depende del laboratorio)'];}),
 C('nacorr','Na corregido por glucosa','Katz 1973: Na + 1.6 × (glucosa − 100)/100 (Hillier 1999 propone 2.4)',[['na','Na','n','mEq/L'],['glu','Glucosa','n','mg/dL']],
  v=>[fmt(v.na+1.6*(v.glu-100)/100)+' mEq/L','Con factor 2.4: '+fmt(v.na+2.4*(v.glu-100)/100)]),
 C('cacorr','Calcio corregido','Ca + 0.8 × (4 − albúmina)',[['ca','Calcio','n','mg/dL'],['alb','Albúmina','n','g/dL']],v=>[fmt(v.ca+.8*(4-v.alb))+' mg/dL']),
 C('osm','Osmolaridad sérica calculada','2 × Na + glucosa/18 + BUN/2.8',[['na','Na','n','mEq/L'],['glu','Glucosa','n','mg/dL'],['bun','BUN','n','mg/dL']],v=>[fmt(2*v.na+v.glu/18+v.bun/2.8)+' mOsm/L']),
 C('pam','Presión arterial media','(PAS + 2 × PAD) / 3',[['s','PAS','n','mmHg'],['d','PAD','n','mmHg']],v=>[fmt((v.s+2*v.d)/3)+' mmHg']),
 C('pafi','PaO₂/FiO₂','Berlín 2012 (SDRA, con PEEP ≥5): 200–300 leve · 100–200 moderado · ≤100 grave',[['pao','PaO₂','n','mmHg'],['fio','FiO₂','n','% (21–100)']],
  v=>{const x=v.pao/(v.fio/100);return [fmt(x),x>300?'>300':x>200?'Rango leve':x>100?'Rango moderado':'Rango grave'];}),
 C('parkland','Parkland (quemaduras)','4 mL × kg × % SCQ en 24 h (Hartmann); la mitad en las primeras 8 h desde la quemadura',[['kg','Peso','n','kg'],['scq','Superficie quemada','n','%']],
  v=>{const t=4*v.kg*v.scq;return [fmt(t)+' mL en 24 h',fmt(t/2)+' mL en las primeras 8 h ('+fmt(t/16)+' mL/h) y '+fmt(t/2)+' en las 16 h siguientes'];}),
 C('holliday','Líquidos de mantenimiento','Holliday-Segar: 100 mL/kg los primeros 10 kg, 50 los siguientes 10, 20 por cada kg extra (regla 4-2-1 por hora)',[['kg','Peso','n','kg']],
  v=>{const k=v.kg,d=k<=10?100*k:k<=20?1000+50*(k-10):1500+20*(k-20),h=k<=10?4*k:k<=20?40+2*(k-10):60+(k-20);return [fmt(d)+' mL/día',fmt(h)+' mL/h'];}),
 C('agua','Déficit de agua libre','ACT × (Na/140 − 1); ACT = peso × 0.6 hombre, 0.5 mujer (0.5 y 0.45 en adultos mayores)',[['kg','Peso','n','kg'],['na','Na','n','mEq/L'],['f','Agua corporal','s',[['.6','Hombre adulto (0.6)'],['.5','Mujer adulta u hombre mayor (0.5)'],['.45','Mujer mayor (0.45)']]]],
  v=>[fmt(v.kg*+v.f*(v.na/140-1))+' L']),
 C('child','Child-Pugh','Pugh et al., 1973: A 5–6 · B 7–9 · C 10–15',[
  ['bil','Bilirrubina total','s',[[1,'<2 mg/dL'],[2,'2–3'],[3,'>3']]],['alb','Albúmina','s',[[1,'>3.5 g/dL'],[2,'2.8–3.5'],[3,'<2.8']]],['inr','INR','s',[[1,'<1.7'],[2,'1.7–2.3'],[3,'>2.3']]],
  ['asc','Ascitis','s',[[1,'Ausente'],[2,'Leve'],[3,'Moderada a grave']]],['enc','Encefalopatía','s',[[1,'Ausente'],[2,'Grado I–II'],[3,'Grado III–IV']]]],
  v=>{const s=+v.bil + +v.alb + +v.inr + +v.asc + +v.enc;return [s+' puntos','Clase '+(s<=6?'A':s<=9?'B':'C')];}),
 C('apgar','Apgar','Apgar, 1953: 7–10 normal · 4–6 moderadamente deprimido · 0–3 gravemente deprimido',[
  ['fc','Frecuencia cardiaca','s',[[0,'0 Ausente'],[1,'1 <100'],[2,'2 ≥100']]],['re','Esfuerzo respiratorio','s',[[0,'0 Ausente'],[1,'1 Débil, irregular'],[2,'2 Llanto fuerte']]],
  ['to','Tono muscular','s',[[0,'0 Flácido'],[1,'1 Algo de flexión'],[2,'2 Movimiento activo']]],['ir','Irritabilidad refleja','s',[[0,'0 Sin respuesta'],[1,'1 Mueca'],[2,'2 Llanto o tos']]],
  ['co','Color','s',[[0,'0 Azul o pálido'],[1,'1 Acrocianosis'],[2,'2 Rosado']]]],v=>{const s=+v.fc + +v.re + +v.to + +v.ir + +v.co;return [s+' / 10',s>=7?'Normal':s>=4?'Moderadamente deprimido':'Gravemente deprimido'];}),
 C('silverman','Silverman-Andersen','Silverman y Andersen, 1956: 0 sin dificultad · 1–3 leve · 4–6 moderada · 7–10 grave',[
  ['a','Movimientos toracoabdominales','s',[[0,'0 Rítmicos'],[1,'1 Tórax inmóvil'],[2,'2 Disociación']]],['b','Tiraje intercostal','s',[[0,'0 No'],[1,'1 Leve'],[2,'2 Marcado']]],
  ['c','Retracción xifoidea','s',[[0,'0 No'],[1,'1 Leve'],[2,'2 Marcada']]],['d','Aleteo nasal','s',[[0,'0 No'],[1,'1 Leve'],[2,'2 Marcado']]],['e','Quejido espiratorio','s',[[0,'0 No'],[1,'1 Audible con estetoscopio'],[2,'2 Audible sin estetoscopio']]]],
  v=>{const s=+v.a + +v.b + +v.c + +v.d + +v.e;return [s+' / 10',s===0?'Sin dificultad respiratoria':s<=3?'Dificultad leve':s<=6?'Dificultad moderada':'Dificultad grave'];}),
 C('fpp','Fecha probable de parto','Regla de Naegele: FUR + 280 días; edad gestacional a hoy',[['fur','Fecha de última regla','d','']],
  v=>{const f=new Date(v.fur+'T12:00:00'),p=new Date(f.getTime()+280*864e5),d=Math.floor((Date.now()-f)/864e5);
   return [p.toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}),d>=0?'Hoy: '+Math.floor(d/7)+' semanas '+d%7+' días':'La FUR es futura'];})];
const calcV={};
function vCalc(){const c=CALC.find(x=>x.k===rip.calc)||CALC[0];const v=calcV[c.k]||(calcV[c.k]={});
  return `<h3>Calculadoras clínicas</h3><div class="sub">fórmula exacta · referencia a la vista</div>
  <div class="rp-calc"><div class="rp-cl">${CALC.map(x=>`<button data-c="${x.k}" class="${x.k===c.k?'on':''}">${esc(x.n)}</button>`).join('')}</div>
  <div class="rp-box"><b>${esc(c.n)}</b>
   ${c.campos.map(([k,l,t,o])=>t==='c'?`<label class="rp-chk"><input type="checkbox" data-k="${k}" ${v[k]?'checked':''}> ${esc(l)} <small>(+${o})</small></label>`
    :t==='s'?`<label class="rp-l">${esc(l)}<select data-k="${k}"><option value=""></option>${o.map(([a,b])=>`<option value="${a}" ${String(v[k])===String(a)?'selected':''}>${esc(b)}</option>`).join('')}</select></label>`
    :`<label class="rp-l">${esc(l)}<span class="rp-u"><input type="${t==='d'?'date':'number'}" step="any" data-k="${k}" value="${esc(v[k]??'')}"><em>${esc(o)}</em></span></label>`).join('')}
   <div class="rp-res" id="rpCR">${resCalc(c)}</div><small class="rp-mut">Fuente: ${esc(c.ref)}</small></div></div>
  <small class="rp-mut">Las calculadoras dan el número exacto de la fórmula; la interpretación clínica la hace el médico con el paciente completo.</small>`;}
function resCalc(c){const v=calcV[c.k]||{},o={};
  for(const [k,,t,op] of c.campos){if(t==='c'){o[k]=v[k]?op:0;continue;}const x=v[k];
    if(x===undefined||x===''||x===null){if(/opcional/i.test(c.campos.find(q=>q[0]===k)[1]))continue;return '<span class="rp-mut">Llena los datos.</span>';}
    o[k]=t==='n'?+x:x;if(t==='n'&&!(o[k]>=0))return '<span class="gra">Revisa '+esc(k)+'.</span>';}
  try{const r=c.f(o);if(r.some(s=>/NaN|Infinity/.test(String(s))))return '<span class="gra">Revisa los datos.</span>';return `<b>${esc(r[0])}</b>${r.slice(1).map(s=>'<br>'+esc(s)).join('')}`;}catch(e){return '<span class="gra">Revisa los datos.</span>';}}

// ================= ENTRE EQUIPOS (pendiente) =================
const vNube=()=>`<h3>Memoria entre equipos</h3><div class="sub">pendiente · cerebro Python</div>
  <p class="rp-p">Hoy el expediente, la biblioteca y las tarjetas viven en cada equipo. Para que viajen entre tu PC y tu celular hace falta el cerebro de Capri en Python (un servidor tuyo) que sincronice todo cifrado de punta a punta. Queda anotado como el siguiente paso grande.</p>
  <p class="rp-p">Mientras tanto: el respaldo cifrado del expediente se puede abrir en otro equipo (EXPEDIENTE → Restaurar respaldo) y la biblioteca se puede volver a cargar con los mismos archivos.</p>`;

// ================= SECCIÓN =================
const css=document.createElement('style');css.textContent=`
#vRip{padding:18px 22px}.rp{display:grid;grid-template-columns:200px 1fr;gap:20px;min-height:100%;font:13px/1.5 var(--mono);color:#ffd9dc}
.rp h3{font:600 15px/1 var(--sans);letter-spacing:.1em;color:var(--hr);margin:0 0 4px;text-transform:uppercase}.rp .sub{font:10px var(--mono);letter-spacing:.2em;color:#a0565e;text-transform:uppercase;margin-bottom:12px}
.rp-nav{display:flex;flex-direction:column;gap:3px}.rp-nav .tt{font:700 30px/1 var(--sans);letter-spacing:.18em;color:var(--hr);text-shadow:0 0 18px var(--hr2);margin-bottom:2px}
.rp-nav button{background:none;border:0;border-left:2px solid #3b1418;color:#ffd9dc;text-align:left;padding:7px 10px;font:12px var(--mono);cursor:pointer}.rp-nav button small{display:block;color:#a0565e;font-size:10px}
.rp-nav button:hover{border-color:var(--hr)}.rp-nav button.on{border-color:var(--hc);color:var(--hc);background:rgba(94,246,255,.06)}
.rp-p{max-width:760px;color:#e9c4c8;margin:0 0 12px}.rp-mut{color:#a0565e}.rp-warn{color:var(--hg);display:block;margin:8px 0}
.rp-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}.rp-g2>*,.rp-g3>*{min-width:0}.rp-g2{display:grid;grid-template-columns:minmax(280px,1fr) minmax(280px,1fr);gap:16px;align-items:start}
.rp-box{border:1px solid #3b1418;background:rgba(10,4,6,.6);padding:12px;display:flex;flex-direction:column;gap:7px;margin-bottom:12px}.rp-box>b{color:var(--hc);font:600 13px var(--sans);letter-spacing:.06em}.rp-box small{color:#c98d93}
.rp-in{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.rp input,.rp select,.rp textarea{background:#0a0506;border:1px solid #3b1418;color:#ffe3e6;font:12.5px var(--mono);padding:7px 9px;box-sizing:border-box;min-width:0}
.rp input:focus,.rp textarea:focus,.rp select:focus{outline:0;border-color:var(--hc)}.rp-in input:not([type=checkbox]),.rp-in select{flex:1}.rp textarea{width:100%;resize:vertical}
.rp-l{display:flex;flex-direction:column;gap:3px;font-size:11px;color:#c98d93;flex:1}.rp-chk{display:flex;gap:6px;align-items:center;font-size:12px;color:#ffd9dc}.rp-chk input{flex:0 0 auto!important}
.rp-u{display:flex;align-items:center;gap:6px}.rp-u input{flex:1}.rp-u em{font-style:normal;color:#a0565e;min-width:40px}
.rp .mini{font:11px var(--mono);background:none;border:1px solid #3b1418;color:#ffd9dc;padding:5px 9px;cursor:pointer}.rp .mini:hover{border-color:var(--hc);color:var(--hc)}.rp button:disabled{opacity:.4;cursor:default}
.rp .mini.gra{border-color:#7a1f2a}.rp .mini.ok{border-color:#1f6f5a}
.rp-fs{border:1px solid var(--hr2);padding:12px;margin-top:14px;display:flex;flex-direction:column;gap:8px}.rp-fs legend{color:var(--hr);font:600 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;padding:0 6px}
.rp-drop{border:1px dashed var(--hr2);padding:16px;text-align:center;cursor:pointer;color:#c98d93}.rp-drop:hover,.rp-drop.over{border-color:var(--hc);color:var(--hc)}.rp-drop small{display:block;color:#a0565e;font-size:10.5px;margin-top:4px}
.rp-st{color:var(--hc);font-size:12px;min-height:1em}.rp-ls{display:flex;flex-direction:column}.rp-it{display:grid;grid-template-columns:86px 1fr auto;gap:10px;align-items:center;padding:7px 4px;border-bottom:1px solid #2a0d11}
.rp-it .fm{font:600 10px var(--sans);letter-spacing:.1em;color:var(--hc);border:1px solid var(--hc2);text-align:center;padding:3px 0;text-transform:uppercase}.rp-it em{color:var(--hg);font-style:normal}
.rp-h{border-left:3px solid #3b1418;padding:6px 10px;margin-bottom:6px;background:rgba(20,6,9,.6)}.rp-h b{text-transform:uppercase;font:600 11px var(--sans);letter-spacing:.08em}.rp-h small{color:#a0565e}
.rp-h.gra{border-color:#ff2d45}.rp-h.gra b{color:#ff5d70}.rp-h.imp{border-color:var(--hg)}.rp-h.imp b{color:var(--hg)}.rp-h.mod{border-color:var(--hc)}.rp-h.mod b{color:var(--hc)}.rp-h.mut b{color:#c98d93}.rp-h.ok{border-color:#2fbf8f;color:#9ff0d0}
.gra{color:#ff5d70}.rp-ex{border-top:1px solid #2a0d11;padding-top:6px}.rp-q{font-size:11.5px;color:#e9c4c8;border-left:2px solid var(--hc2);padding-left:8px;margin:4px 0}.rp-q.gra{border-color:#ff2d45;color:#ffb0b9}
.rp a{color:var(--hc)}.rp-ocr{white-space:pre-wrap;max-height:46vh;overflow:auto;font-size:12px;color:#ffe3e6;border-top:1px solid #2a0d11;padding-top:8px}.rp mark.dud{background:rgba(243,200,75,.25);color:inherit;border-bottom:1px dotted var(--hg)}
.rp-card{border:1px solid var(--hc2);padding:14px;background:rgba(4,22,26,.35);display:flex;flex-direction:column;gap:8px}.rp-card p{margin:0;font:14px/1.5 var(--sans);color:#fff}.rp-card .rp-ans{color:var(--hc);font-size:13px}.rp-card small{color:#a0565e}
.rp-op{text-align:left;background:none;border:1px solid #3b1418;color:#ffd9dc;font:12.5px var(--mono);padding:8px 10px;cursor:pointer}.rp-op:hover:not(:disabled){border-color:var(--hg)}.rp-op.ok{border-color:#2fbf8f;color:#9ff0d0}.rp-op.gra{border-color:#ff2d45}
.rp-code{font:700 20px var(--mono);letter-spacing:.12em;color:var(--hg);border:1px dashed var(--hg);padding:12px;text-align:center;word-break:break-all;user-select:all}
.rp-calc{display:grid;grid-template-columns:230px minmax(260px,520px);gap:14px;align-items:start}.rp-cl{display:flex;flex-direction:column;gap:2px;max-height:62vh;overflow:auto}
.rp-cl button{background:none;border:0;border-left:2px solid #3b1418;color:#ffd9dc;text-align:left;padding:5px 9px;font:12px var(--mono);cursor:pointer}.rp-cl button.on{border-color:var(--hc);color:var(--hc)}.rp-cl button:hover{border-color:var(--hr)}
.rp-res{border:1px solid var(--hc2);padding:10px 12px;min-height:44px;color:#ffe3e6}.rp-res b{font:600 20px var(--sans);color:var(--hc)}
@media (max-width:980px){.rp{grid-template-columns:1fr}.rp-nav{flex-direction:row;flex-wrap:wrap}.rp-nav .tt{width:100%}.rp-g3,.rp-g2,.rp-calc{grid-template-columns:1fr}.rp-cl{flex-direction:row;flex-wrap:wrap;max-height:none}}`;document.head.appendChild(css);
let sec=null;const $r=id=>sec?.querySelector('#'+id);
const VISTA={fuentes:vFuentes,meds:vMeds,ocr:vOcr,estudio:vEstudio,respaldo:vRespaldo,calc:vCalc,nube:vNube};
let pint=0;
async function render(){if(!sec)return;const n=++pint;const html=await VISTA[rip.mod]();if(n!==pint)return;
  sec.innerHTML=`<div class="rp"><div class="rp-nav"><div class="tt">R.I.P</div><div class="sub">tu apoyo de salud · no diagnostica</div>
   ${MODS.map(([k,t,s])=>`<button data-m="${k}" class="${rip.mod===k?'on':''}">${t}<small>${s}</small></button>`).join('')}</div><div style="min-width:0">${html}</div></div>`;}
async function accion(a,el){
  if(a==='gpc'){const t=$r('rpGpcQ').value.trim();return open(google('guía de práctica clínica '+t+' filetype:pdf site:gob.mx'),'_blank','noopener');}
  if(a==='nom'){const k=$r('rpNom').value;return open(google('"'+k+'" site:dof.gob.mx'),'_blank','noopener');}
  if(a==='cnis')return open(google('Compendio Nacional de Insumos para la Salud libro de medicamentos site:csg.gob.mx'),'_blank','noopener');
  if(a==='mlp')return open('https://medlineplus.gov/spanish/druginformation.html','_blank','noopener');
  if(a==='bajar'){const u=$r('rpUrl').value.trim(),p=$r('rpProg');if(!u)return;let h='';try{h=new URL(u).hostname;}catch(e){}
    if(!/(^|\.)gob\.mx$/i.test(h))return p.textContent='✖ Solo bajo de sitios oficiales que terminan en .gob.mx.';
    p.textContent='Bajando…';const r=await DESK.ripBajar(u);if(!r?.ok)return p.textContent='✖ No pude bajarlo ('+(r?.why||r?.status||'error')+'). Bájalo con el navegador y suéltalo aquí.';
    const nom=decodeURIComponent(u.split('/').pop().split('?')[0])||'fuente.pdf';return agregaOfi([new File([r.data],/\.\w{2,4}$/.test(nom)?nom:nom+'.pdf',{type:r.type})]);}
  if(a==='oq'){const q=$r('rpOq').value.trim();if(!q)return;const ofi=await oficiales(),by=Object.fromEntries(ofi.map(d=>[d.id,d]));
    const hs=(await window.bibBuscar(q,20)).filter(o=>by[o.t.doc]).slice(0,5);
    $r('rpOr').innerHTML=hs.map(o=>{const d=by[o.t.doc];return `<div class="rp-q"><b>${esc([d.oficial.tipo,d.oficial.clave,d.oficial.anio].filter(Boolean).join(' '))}${o.t.pag?', p. '+o.t.pag:''}</b><br>${esc(o.t.text.slice(0,420))}…</div>`;}).join('')||'<small class="rp-mut">No viene en tus fuentes oficiales.</small>';return;}
  if(a==='verif')return verificar();
  if(a==='medcapri')return medACapri();
  if(a==='ocrcp'){navigator.clipboard?.writeText(ocrRes.text);el.textContent='✓ Copiado';return;}
  if(a==='ocrbib'){await window.bibAgregar([new File([ocrRes.text],ocrRes.name.replace(/\.[^.]+$/,'')+' (texto).txt',{type:'text/plain'})],{});el.textContent='✓ En la biblioteca';return;}
  if(a==='ocrcapri'){window.hudGo?.('capri',true);setTimeout(()=>respond(`(${cfg.name||'Kiga'} pasó a texto un escaneo con el lector de R.I.P; confianza ${Math.round(ocrRes.conf)}%. Ordénalo en apartados claros sin agregar nada que no diga. Las palabras que parezcan mal leídas márcalas entre [¿?] en vez de adivinarlas.)\n\n${ocrRes.text.slice(0,12000)}`),380);return;}
  if(a==='rep'){const l=(window.saberVencidas?.()||[]).slice().sort((x,y)=>x.due-y.due).slice(0,20);est.rep={l,i:0,ver:false,bien:0};return render();}
  if(a==='ver'){est.rep.ver=true;return render();}
  if(a==='repfin'){est.rep=null;return render();}
  if(a==='tarj'||a==='quiz'||a==='caso'){if(est.busy)return;est.doc=$r('rpDoc').value;return estudioIA(a);}
  if(a==='sig'){est.quiz.i++;return render();}
  if(a==='quizfin'){est.quiz=null;return render();}
  if(a==='respnow'){respMsg='Respaldando…';render();const r=await respaldar('manual');respMsg=r.ok?'✓ Guardado '+r.donde+'.':'✖ '+r.why;return render();}
  if(a==='respdir')return DESK.abrirRespaldos();
  if(a==='respelige'){try{const h=await showDirectoryPicker({id:'capri-respaldos',mode:'readwrite'});await rkv('readwrite',s=>s.put(h,'dir'));respMsg='✓ Los respaldos irán a «'+h.name+'».';}catch(e){}return render();}
  if(a==='codigo'){if(window.expEstado?.().codigo&&!confirm('Crear un código nuevo: las copias nuevas solo abrirán con el nuevo. ¿Seguir?'))return;try{codigoNuevo=await window.expCrearCodigo();}catch(e){respMsg='✖ '+e.message;}return render();}
  if(a==='codprint'){const w=open('','_blank');if(w){w.document.write(`<title>Código de recuperación</title><body style="font:16px sans-serif;padding:40px"><h2>Capri · código de recuperación del expediente</h2><p style="font:700 24px monospace;letter-spacing:.1em">${esc(codigoNuevo)}</p><p>Creado el ${new Date().toLocaleString('es-MX')}. Guárdalo en un lugar seguro, lejos de la computadora.</p><script>print()<\/script>`);w.document.close();}return;}
  if(a==='codok'){codigoNuevo=null;return render();}
  if(a==='recup')return recuperar();}
function montar(el){if(sec)return;sec=el;
  sec.addEventListener('click',e=>{const t=e.target;
    const m=t.closest('[data-m]');if(m){rip.mod=m.dataset.m;save();return render();}
    if(t.closest('#rpDrop'))return $r('rpFile').click();if(t.closest('#rpOcrDrop'))return $r('rpOcrF').click();
    const q=t.closest('[data-q]');if(q){if(confirm('¿Quitar esta fuente oficial?'))window.bibQuitar(q.dataset.q).then(render);return;}
    const c=t.closest('[data-c]');if(c){rip.calc=c.dataset.c;save();return render();}
    const n=t.closest('[data-n]');if(n&&est.rep){const tj=est.rep.l[est.rep.i];window.saberCalificar?.(tj.id,n.dataset.n);if(n.dataset.n==='bien')est.rep.bien++;est.rep.i++;est.rep.ver=false;return render();}
    const o=t.closest('[data-o]');if(o&&est.quiz){const p=est.quiz.l[est.quiz.i];if(p.r!=null)return;p.r=+o.dataset.o;
      if(p.r===p.ok)est.quiz.ok++;else window.saberTarjeta?.(est.quiz.doc,p.p,p.ops[p.ok]+(p.exp?' — '+p.exp:''),est.quiz.doc+(p.pag?', p. '+p.pag:''));return render();}
    const a=t.closest('[data-a]');if(a&&!a.disabled)accion(a.dataset.a,a);});
  sec.addEventListener('change',e=>{const t=e.target;
    if(t.id==='rpFile'&&t.files.length){agregaOfi([...t.files]);t.value='';return;}
    if(t.id==='rpOcrF'&&t.files[0]){ocrArchivo(t.files[0]);t.value='';return;}
    if(t.id==='rpOcrM'){store.set('ripOcr',t.value);return;}
    if(t.id==='rpAuto'){rip.auto=t.checked;save();return;}
    if(t.id==='rpDoc'){est.doc=t.value;return;}
    if(t.dataset.k!==undefined){const c=CALC.find(x=>x.k===rip.calc);(calcV[c.k]||(calcV[c.k]={}))[t.dataset.k]=t.type==='checkbox'?t.checked:t.value;$r('rpCR').innerHTML=resCalc(c);}});
  sec.addEventListener('input',e=>{const t=e.target;if(t.dataset.k!==undefined&&t.type!=='checkbox'){const c=CALC.find(x=>x.k===rip.calc);(calcV[c.k]||(calcV[c.k]={}))[t.dataset.k]=t.value;$r('rpCR').innerHTML=resCalc(c);}});
  sec.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='rpOq')accion('oq');if(e.key==='Enter'&&e.target.id==='rpGpcQ')accion('gpc');});
  sec.addEventListener('dragover',e=>{e.preventDefault();sec.querySelector('.rp-drop')?.classList.add('over');});
  sec.addEventListener('dragleave',e=>{if(!sec.contains(e.relatedTarget))sec.querySelector('.rp-drop')?.classList.remove('over');});
  sec.addEventListener('drop',e=>{e.preventDefault();sec.querySelector('.rp-drop')?.classList.remove('over');const fs=[...e.dataTransfer.files];if(!fs.length)return;
    if(rip.mod==='fuentes')agregaOfi(fs);else if(rip.mod==='ocr')ocrArchivo(fs[0]);});}
addEventListener('hud:view',e=>{const {v,el}=e.detail||{};if(v!=='rip'||!el)return;montar(el);render();});
window.ripIr=mod=>{if(mod)rip.mod=mod;save();if(window.hudView?.()==='rip')render();else window.hudGo?.('rip');};
window.ripInfo=()=>({mod:rip.mod,ultResp:rip.ultResp});
const _send=send;
send=async v=>{const raw=(v||'').trim(),k=norm(raw);
  if(/^(r\.?i\.?p\.?|salud)$/.test(k)&&!busy){line('u',raw);window.ripIr();return;}
  const m=raw.match(/^verifica(?:r)?(?:\s+(?:medicamentos|receta))?\s*:\s*([\s\S]+)/i);
  if(m&&!busy){line('u',raw);rip.meds=m[1].split(/[,;]\s*|\n/).join('\n');medRes=null;window.ripIr('meds');setTimeout(()=>sec&&verificar(),450);return;}
  if(/^calcula(dora)?s?$/.test(k)&&!busy){line('u',raw);window.ripIr('calc');return;}
  await _send(v);if(k==='help')line('t','  rip — Pestaña R.I.P: fuentes oficiales, verificador de medicamentos, lector de escaneos, estudio, respaldo y calculadoras\n  verifica: paracetamol 1 g c/8h, … — revisa una receta\n  calculadoras — calculadoras clínicas');};
window.__ripTest={parsea,revisa,busca,CALC,resCalc:(k,v)=>{calcV[k]=v;return resCalc(CALC.find(x=>x.k===k));},enTexto,extracto,pedazo};
})();
