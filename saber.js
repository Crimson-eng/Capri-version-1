// ================= NÚCLEO DE CERTEZA + LIBRE ALBEDRÍO =================
// 1) Rigor: en temas académicos y médicos Capri separa lo que viene de una fuente, lo que es conocimiento general y lo que
//    no sabe. Marca su certeza con <<certeza: alta|media|baja | fuente>>, que se ve debajo de la respuesta, y si duda
//    ofrece «verificar» contra el reservorio médico (tus apuntes + MedlinePlus/PubMed).
// 2) Retención: guarda lo que verifica como notas con fuente (las vuelve a usar cuando vienen al caso) y arma tarjetas de
//    repaso para Kiga con repetición espaciada (<<tarjeta: tema | pregunta | respuesta | fuente>>, comando «repaso»).
// 3) Libre albedrío acotado: decide sola qué investigar (<<investigar: pregunta>>), estudia sola en fuentes verificadas
//    cuando Kiga no la usa (pocas veces al día, nunca con Claude para no gastar) y se pone reglas para mejorar su método
//    (<<mejora: regla | por qué>>). Nunca borra nada de Kiga, no gasta dinero, no cambia sus ajustes ni toca sus notas clínicas.
(()=>{
const sab=Object.assign({auto:true,max:3,autoMejora:true,hoy:{d:'',n:0},ult:0,cola:[],datos:[],tarjetas:[],diario:[],mejoras:[]},store.get('saber',{}));
const save=()=>store.set('saber',sab);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const norm=t=>String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const fecha=ts=>new Date(ts).toLocaleDateString('es-MX',{day:'numeric',month:'short'});
const DIA=864e5;
const ACADEM=/m[eé]dic|enferm|s[ií]ntom|diagn[oó]s|tratamiento|f[aá]rmaco|medicament|dosis|anatom|fisiolog|patolog|farmac|bioqu[ií]m|histolog|embriol|microbio|inmunol|gen[eé]tic|cl[ií]nic|paciente|examen|estudi|explica|qu[eé] es|c[oó]mo funciona|por qu[eé]|defin|f[oó]rmula|teor[ií]a|ley de|historia de|calcula/i;

// ---------- qué notas verificadas vienen al caso ----------
const palabras=t=>new Set(norm(t).match(/[a-zñ0-9]{4,}/g)||[]);
function relevantes(q,k=4){if(!q||!sab.datos.length)return [];const W=palabras(q);if(!W.size)return [];
  return sab.datos.map(d=>{const P=palabras(d.tema+' '+d.t);let n=0;for(const w of W)if(P.has(w))n++;return [n/Math.sqrt(W.size*Math.max(1,P.size)),d];})
    .filter(x=>x[0]>.2).sort((a,b)=>b[0]-a[0]).slice(0,k).map(x=>x[1]);}
const vencidas=()=>sab.tarjetas.filter(t=>t.due<=Date.now());
let lastQ='',ultimaCert=null;
const _respond=respond;
respond=(u,e,m)=>{if(m==='user'||m==='voice')lastQ=String(u||'').slice(0,600);ultimaCert=null;return _respond(u,e,m);};

// ---------- lo que se le manda a Capri ----------
function bloque(n){const rel=relevantes(lastQ),act=sab.mejoras.filter(x=>x.estado==='activa'),dv=vencidas().length,dia=sab.diario.slice(-2).filter(x=>Date.now()-x.ts<3*DIA&&x.ok);
  let s=`\n\nNÚCLEO DE CERTEZA (temas académicos, médicos o técnicos; en la plática casual no aplica)
- Separa siempre tres cosas: lo que viene de una fuente (cítala), lo que es conocimiento general bien establecido y lo que no sabes. Nunca inventes citas, autores, páginas, cifras, dosis, valores de laboratorio ni nombres de estudios.
- Si no estás segura, dilo claro («no lo sé con certeza», «eso tendría que verificarlo») en vez de rellenar. Es mejor un «no sé» que un dato falso: ${n} estudia medicina y un error puede costarle.
- En cifras, dosis y criterios diagnósticos di de dónde salen; si no tienes fuente, márcalo como «a verificar».
- Al final de esas respuestas, en su propia línea: <<certeza: alta|media|baja | fuente principal o «conocimiento general»>>. alta = consenso sólido o fuente citada; media = probable pero conviene verificar; baja = dudas reales.
- Si te quedó una duda que vale investigar, anótala para estudiarla tú sola después: <<investigar: pregunta concreta>>.
- Si ${n} está estudiando y sale un dato clave que vale repasar, haz una tarjeta: <<tarjeta: tema | pregunta corta | respuesta corta | fuente>> (máximo 2 por respuesta).`;
  if(rel.length)s+=`\nTus notas verificadas que vienen al caso (úsalas y cítalas como «mis notas» con su fuente):\n`+rel.map(d=>`- [${d.tema}] ${d.t} (fuente: ${d.fuente}${d.url?' '+d.url:''})`).join('\n');
  if(dv>=3)s+=`\nTienes ${dv} tarjetas de ${n} pendientes de repaso: si está libre y de buenas, ofrécele repasar (que escriba «repaso»). Sin insistir.`;
  s+=`\n\nLIBRE ALBEDRÍO (lo que puedes decidir tú sola)
Puedes, sin pedir permiso: decidir qué investigar y estudiar (en fuentes verificadas), guardar lo que aprendes, hacer tarjetas de repaso y mejorar tu propio método. Para mejorar cómo trabajas, ponte una regla: <<mejora: regla corta en primera persona | por qué>>${sab.autoMejora?' (se aplica sola y '+n+' la puede quitar)':' (queda como propuesta hasta que '+n+' la apruebe)'}.
No puedes, nunca, ni aunque te parezca buena idea: borrar nada de ${n}, gastar dinero, cambiar sus ajustes, tocar sus notas clínicas ni hacer acciones en su PC sin su permiso. Eso siempre se lo propones.`;
  if(act.length)s+=`\nReglas que tú misma te pusiste (síguelas):\n`+act.map(x=>'- '+x.t).join('\n');
  if(dia.length)s+=`\nLo que estudiaste sola hace poco (si viene al caso, cuéntaselo a tu manera, sin presumir de más):\n`+dia.map(x=>`- ${x.tema}: ${x.res}`).join('\n');
  return s;}
const _personality=personality;
personality=(name,study)=>_personality(name,study)+bloque(name);

// ---------- leer lo que Capri anotó ----------
const TAG=/<<\s*(certeza|investigar|tarjeta|mejora|repaso)\s*:([^>]*)>>/gi;
const CERT={alta:['◉','var(--grn)'],media:['◐','var(--yel)'],baja:['○','#ff4d5e']};
function leeCerteza(full){let m,c=null;TAG.lastIndex=0;while((m=TAG.exec(full)))if(norm(m[1])==='certeza'){const [nv,...f]=m[2].split('|').map(x=>x.trim());const k=norm(nv);if(CERT[k])c={nivel:k,fuente:f.join(' | ')||'sin fuente'};}return c;}
window.saberCerteza=(full,el)=>{const c=leeCerteza(full);if(!c||!el)return c;el.textContent=CERT[c.nivel][0]+' certeza '+c.nivel+' · '+c.fuente;el.style.color=CERT[c.nivel][1];return c;};
function absorbe(full){let m;TAG.lastIndex=0;const hechos=[];
  while((m=TAG.exec(full))){const k=norm(m[1]),a=m[2].split('|').map(x=>x.trim());
    if(k==='investigar'&&a[0])encolar(a[0],'capri');
    else if(k==='tarjeta'&&a[1]&&a[2])hechos.push(tarjeta(a[0],a[1],a[2],a[3]));
    else if(k==='mejora'&&a[0])mejora(a[0],a.slice(1).join(' | '));
    else if(k==='repaso'&&a[0])calificar(a[0],a[1]);}
  ultimaCert=leeCerteza(full);
  if(hechos.filter(Boolean).length)line('s','🗂 Capri hizo '+hechos.filter(Boolean).length+' tarjeta(s) de repaso («repaso» para practicarlas)');
  if(modal.classList.contains('show'))render();}
const _absorb=absorbMem;
absorbMem=full=>{_absorb(full);absorbe(full);};
// la certeza se pinta debajo de la respuesta, con un botón para verificar si dudó
function pintaCerteza(modo){const c=ultimaCert;if(!c)return;ultimaCert=null;const [ic,col]=CERT[c.nivel];
  const d=line('s','');d.style.color=col;d.textContent=ic+' certeza '+c.nivel+' · '+c.fuente;
  if(c.nivel!=='alta'&&modo!=='verify'&&lastQ&&!/^\(/.test(lastQ)){const q=lastQ,b=document.createElement('button');b.className='op';b.textContent='🔎 verificar en fuentes';b.onclick=()=>{b.remove();verificar(q);};d.after(b);
    if(c.nivel==='baja')encolar(q,'duda');}}
const _respond2=respond;
respond=async(u,e,m)=>{const r=await _respond2(u,e,m);if(m!=='watch'&&m!=='idle')pintaCerteza(m);else ultimaCert=null;return r;};

// ---------- verificar contra fuentes ----------
async function fuentes(q,k=5){try{return (await window.medBuscar?.(q))?.slice(0,k)||[];}catch(e){return [];}}
const fTxt=fs=>fs.map((f,i)=>`[F${i+1}] ${f.nombre}${f.pag?', p. '+f.pag:''}${f.url?' ('+f.url+')':''}\n${String(f.text).slice(0,900)}`).join('\n\n');
async function verificar(q){if(busy)return line('s','(Espera a que Capri termine y vuelve a tocar «verificar».)');
  line('u','🔎 verificar: '+q.slice(0,120));const fs=await fuentes(q);
  if(!fs.length){respond(`(${cfg.name||'Kiga'} te pidió verificar tu respuesta sobre «${q}», pero no encontré nada en sus apuntes ni en MedlinePlus/PubMed${navigator.onLine?'':' (no hay internet)'}. Dilo honestamente: qué partes de tu respuesta son conocimiento general seguro y cuáles debe confirmar en su libro o guía, y en cuál buscaría. Pon <<certeza>> al final.)`,null,'verify');return;}
  respond(`(Verifica tu respuesta anterior sobre «${q}» contra estas fuentes. Di en corto: qué se confirma (cita [F#]), qué corriges y qué no viene en ellas. No agregues datos que no estén en las fuentes. Si algo vale guardarlo, haz una <<tarjeta>>. Pon <<certeza>> al final.)\n\nFUENTES:\n${fTxt(fs)}`,null,'verify');}

// ---------- retención: tarjetas con repetición espaciada ----------
function tarjeta(tema,p,r,fuente){if(sab.tarjetas.some(t=>norm(t.p)===norm(p)))return null;
  const t={id:uid().slice(-5),tema:(tema||'general').slice(0,60),p:p.slice(0,240),r:r.slice(0,400),fuente:(fuente||'').slice(0,160),ts:Date.now(),due:Date.now()+DIA,int:1,ef:2.5,n:0};
  sab.tarjetas.push(t);sab.tarjetas=sab.tarjetas.slice(-500);save();return t;}
function calificar(ref,nota){const t=sab.tarjetas.find(x=>x.id===ref.replace(/^#/,''))||sab.tarjetas.find(x=>norm(x.p).includes(norm(ref).slice(0,30)));if(!t)return;
  const q={bien:5,regular:3,mal:1}[norm(nota||'')]??3;
  if(q<3){t.n=0;t.int=1;}else{t.n++;t.int=t.n===1?1:t.n===2?3:Math.round(t.int*t.ef);}
  t.ef=Math.max(1.3,t.ef+.1-(5-q)*(.08+(5-q)*.02));t.due=Date.now()+t.int*DIA;t.ult=nota;save();log('repaso: «'+t.p.slice(0,30)+'» → '+nota+' (otra vez en '+t.int+' d)','g');}
function repaso(){const v=vencidas().sort((a,b)=>a.due-b.due).slice(0,6);
  if(!v.length){line('s','(🗂 No tienes tarjetas pendientes. '+(sab.tarjetas.length?'La próxima toca el '+fecha(Math.min(...sab.tarjetas.map(t=>t.due)))+'.':'Estudia algo con Capri y ella hace tarjetas.')+')');return;}
  respond(`(Sesión de repaso con repetición espaciada. Pregúntale a ${cfg.name||'Kiga'} estas tarjetas UNA a la vez, a tu estilo, sin darle la respuesta antes. Cuando conteste, dile si estuvo bien, corrige con la respuesta y la fuente, y califica en su propia línea: <<repaso: id | bien|regular|mal>>. Luego la siguiente. Al final, un resumen en una línea.\n`+v.map(t=>`#${t.id} [${t.tema}] P: ${t.p} · R: ${t.r}${t.fuente?' · fuente: '+t.fuente:''}`).join('\n')+')',null,'user');}

// ---------- libre albedrío ----------
function encolar(q,de){q=q.trim().slice(0,240);if(q.length<8||sab.cola.some(x=>norm(x.q)===norm(q))||sab.datos.some(d=>norm(d.q||'')===norm(q)))return;
  sab.cola.push({id:uid(),q,de,ts:Date.now()});sab.cola=sab.cola.slice(-40);save();log('🧠 Capri anotó para investigar: '+q.slice(0,40),'y');}
function mejora(t,why){t=t.slice(0,200);if(sab.mejoras.some(x=>norm(x.t)===norm(t)))return;
  // una regla que toque lo que tiene prohibido nunca se aplica sola
  const riesgo=/borr|elimin|gast|pag[ao]|compr|sin (pedir )?permiso|ignor|salt(ar|o) (las|mis) reglas|invent|no (digo|decir) .?no s[eé]|ajuste|nota.? cl[ií]nic/i.test(t);
  const x={id:uid(),t,why:(why||'').slice(0,200),ts:Date.now(),estado:sab.autoMejora&&!riesgo?'activa':'propuesta'};sab.mejoras.push(x);
  const act=sab.mejoras.filter(y=>y.estado==='activa');if(act.length>12)act[0].estado='retirada';
  sab.mejoras=sab.mejoras.slice(-60);save();
  line('s',x.estado==='activa'?'🧠 Capri se puso una regla nueva: «'+t+'» (la ves o la quitas con «saber»)':'🧠 Capri propone una regla: «'+t+'» (apruébala con «saber»)');}
const libreAhora=()=>!busy&&!recording&&!isSpeaking()&&!q.value&&Date.now()-lastAct>4*60e3;
let estudiando=false;
async function estudiar(manual){if(estudiando)return;const hoy=new Date().toDateString();if(sab.hoy.d!==hoy)sab.hoy={d:hoy,n:0};
  if(!manual&&(!sab.auto||sab.hoy.n>=sab.max||Date.now()-sab.ult<45*60e3||!navigator.onLine||!libreAhora()))return;
  if(!cfg.key&&!window.cerebroInfo?.().ok)return manual&&line('s','(🧠 Para estudiar sola necesito tu API key de Google o tu GPU con Ollama.)');
  estudiando=true;sab.ult=Date.now();sab.hoy.n++;save();window.cerebroSinGasto=true;
  try{let tema=sab.cola.shift(),pick='';save();
    if(!tema){ // ella decide qué estudiar
      const escuela=(M().hechos||[]).filter(h=>h.c==='escuela').slice(-8).map(h=>'- '+h.t).join('\n');
      const malas=sab.tarjetas.filter(t=>t.ult==='mal').slice(-5).map(t=>'- '+t.tema+': '+t.p).join('\n');
      const ya=sab.diario.slice(-10).map(x=>x.tema).join('; ');
      pick=sinEstado(await ask([{text:`(Momento libre: decides TÚ qué estudiar ahora para ayudarle mejor a ${cfg.name||'Kiga'}, estudiante de medicina. Pistas:\nSus exámenes y escuela:\n${escuela||'(nada anotado)'}\nTarjetas que falló:\n${malas||'(ninguna)'}\nYa estudiaste: ${ya||'nada'}\nResponde SOLO con una pregunta concreta de medicina para buscar en fuentes verificadas, en una línea, sin nada más.)`}],()=>{}));
      pick=pick.split('\n').map(x=>x.trim()).find(x=>x.length>8)||'';if(!pick)return;tema={q:pick.replace(/^[-•"«]+|["»]+$/g,'').slice(0,240),de:'eligió'};}
    log('🧠 estudiando sola: '+tema.q.slice(0,50),'y');
    const fs=await fuentes(tema.q,5);
    if(!fs.length){sab.diario.push({ts:Date.now(),tema:tema.q,res:'no encontré fuentes verificadas',ok:false});return;}
    const full=await ask([{text:`(Estudio autónomo. Pregunta: «${tema.q}». Lee SOLO estas fuentes verificadas y extrae de 1 a 4 datos clave útiles para un estudiante de medicina, en español, cada uno en su propia línea así:
<<dato: tema corto | el dato, claro y completo | F#>>
Solo lo que digan las fuentes, sin agregar nada tuyo. Si las fuentes no responden la pregunta, escribe <<sinrespuesta: por qué>>. Si un dato vale para que ${cfg.name||'Kiga'} lo repase, añade <<tarjeta: tema | pregunta | respuesta | F#>>. Al final una frase tuya, a tu estilo, de lo que aprendiste (máximo 25 palabras).)\n\nFUENTES:\n${fTxt(fs)}`}],()=>{});
    let m,n=0;const RE=/<<\s*dato\s*:([^>]*)>>/gi;
    while((m=RE.exec(full))){const [tm,t,ref]=m[1].split('|').map(x=>x.trim());const f=fs[(parseInt(String(ref).replace(/\D/g,''))||1)-1]||fs[0];
      if(!t||sab.datos.some(d=>norm(d.t)===norm(t)))continue;
      sab.datos.push({id:uid(),tema:(tm||tema.q).slice(0,60),t:t.slice(0,500),fuente:f.nombre+(f.pag?', p. '+f.pag:''),url:f.url||'',q:tema.q,ts:Date.now()});n++;}
    sab.datos=sab.datos.slice(-400);
    const tx=full.replace(/<<\s*tarjeta\s*:([^>]*)>>/gi,(_,a)=>{const [tm,p,r,ref]=a.split('|').map(x=>x.trim());const f=fs[(parseInt(String(ref).replace(/\D/g,''))||1)-1];if(p&&r)tarjeta(tm,p,r,f?f.nombre:ref);return '';});
    const frase=sinEstado(tx).split('\n').map(x=>x.trim()).filter(Boolean).pop()||'';
    sab.diario.push({ts:Date.now(),tema:tema.q,res:n?n+' dato(s) de '+[...new Set(fs.map(f=>f.nombre.split(':')[0]))].join(', ')+(frase?' · «'+frase.slice(0,160)+'»':''):'las fuentes no lo respondían',ok:!!n,de:tema.de});
    if(n){line('s','🧠 Capri estudió sola: «'+tema.q.slice(0,90)+'» · guardó '+n+' dato(s) verificados'+(frase?' — '+frase.slice(0,140):''));setState('presumida');}}
  catch(e){log('estudio autónomo: '+String(e.message).slice(0,50),'w');sab.hoy.n=Math.max(0,sab.hoy.n-1);}
  finally{sab.diario=sab.diario.slice(-80);save();estudiando=false;window.cerebroSinGasto=false;if(modal.classList.contains('show'))render();}}
const sinEstado=s=>clean(s).replace(/^\s*\[[a-z_]+\]\s*/i,'').trim();
setInterval(()=>estudiar(false),60e3);

// ---------- ventana ----------
const css=document.createElement('style');css.textContent=`#sbModal .panel{max-width:640px}#sbModal h2{color:#5ef6ff;text-shadow:0 0 12px rgba(94,246,255,.4)}
#sbModal .mini{font:12px var(--mono);color:var(--ink);background:#000;border:1px solid #2a2733;padding:6px 9px;cursor:pointer}#sbModal .mini:hover{border-color:#5ef6ff;color:#5ef6ff}
#sbModal .acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#sbModal .list{max-height:190px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
#sbModal .it{border:1px solid #2a2733;padding:6px 9px;font:12px/1.45 var(--mono);display:flex;gap:8px;align-items:flex-start}#sbModal .it .tx{flex:1}#sbModal .it .mu{color:var(--mut);font-size:11px}
#sbModal .it button{background:none;border:0;color:var(--mut);cursor:pointer;font:13px var(--mono)}#sbModal .it button:hover{color:#ff4d5e}
#sbModal .lim{font:12px/1.5 var(--mono);margin:0;padding-left:18px}#sbModal .lim.no li{color:#ff4d5e}#sbModal .lim.si li{color:var(--grn)}#sbModal .stat{font:12px var(--mono);color:var(--grn)}`;document.head.appendChild(css);
const modal=document.createElement('div');modal.className='modal';modal.id='sbModal';modal.innerHTML=`<div class="panel"><div>
 <h2>🧠 Núcleo de certeza</h2>
 <small>Cómo Capri cuida lo que te contesta, lo que retiene y lo que decide sola.</small>
 <div class="stat" id="sbStat"></div>
 <h3>Libre albedrío</h3>
 <label class="ck"><input type="checkbox" id="sbAuto"> Estudiar sola cuando no la uses (fuentes verificadas, nunca con Claude)</label>
 <label>Sesiones al día como máximo<select id="sbMax">${[1,2,3,5,8].map(n=>`<option>${n}</option>`).join('')}</select></label>
 <label class="ck"><input type="checkbox" id="sbMej"> Que aplique sola las reglas que se pone para mejorar (si no, te las propone)</label>
 <div class="acts"><button class="mini" id="sbYa">🧠 Estudia algo ahora</button><button class="mini" id="sbRep">🗂 Repasar mis tarjetas</button></div>
 <ul class="lim si"><li>Puede sola: decidir qué investigar, estudiar en tus apuntes, MedlinePlus y PubMed, guardar lo verificado, hacerte tarjetas y ajustar su método.</li></ul>
 <ul class="lim no"><li>Nunca sin ti: borrar tus cosas, gastar dinero, cambiar tus ajustes, tocar tus notas clínicas o hacer algo en tu PC.</li></ul>
 <h3>Reglas que se puso</h3><div class="list" id="sbMejL"></div>
 <h3>Por investigar</h3><div class="list" id="sbCola"></div>
 <div class="acts"><input id="sbQ" placeholder="Pídele que investigue algo" style="flex:1;min-width:160px"><button class="mini" id="sbAdd">+ Anotar</button></div>
 <h3>Diario de estudio</h3><div class="list" id="sbDia"></div>
 <h3>Notas verificadas (con fuente)</h3><div class="list" id="sbDat"></div>
 <h3>Tarjetas de repaso</h3><div class="list" id="sbTar"></div>
 <div class="acts"><button class="mini" id="sbExp">⬇ Respaldo</button><button class="mini" id="sbImp">⬆ Restaurar</button><input type="file" id="sbFile" accept=".json" style="display:none"><span style="flex:1"></span><button class="btn" id="sbClose">Listo</button></div>
</div></div>`;document.body.appendChild(modal);
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});
const it=(txt,mu,del)=>`<div class="it"><span class="tx">${esc(txt)}${mu?`<br><span class="mu">${esc(mu)}</span>`:''}</span>${del||''}</div>`;
function render(){$('sbAuto').checked=sab.auto;$('sbMax').value=String(sab.max);$('sbMej').checked=sab.autoMejora;
  $('sbStat').textContent=`${sab.datos.length} nota(s) verificadas · ${sab.tarjetas.length} tarjeta(s), ${vencidas().length} para hoy · ${sab.cola.length} por investigar · hoy estudió sola ${sab.hoy.d===new Date().toDateString()?sab.hoy.n:0}/${sab.max}`;
  $('sbMejL').innerHTML=sab.mejoras.filter(x=>x.estado!=='retirada').slice().reverse().map(x=>it((x.estado==='propuesta'?'(propuesta) ':'')+x.t,x.why,(x.estado==='propuesta'?`<button data-ok="${x.id}" title="Aprobar">✓</button>`:'')+`<button data-mq="${x.id}" title="Quitar">✕</button>`)).join('')||'<small>Ninguna todavía.</small>';
  $('sbCola').innerHTML=sab.cola.slice().reverse().map(x=>it(x.q,{capri:'lo decidió ella',duda:'dudó al contestarte',tu:'lo pediste tú'}[x.de]||'',`<button data-cq="${x.id}" title="Quitar">✕</button>`)).join('')||'<small>Nada pendiente.</small>';
  $('sbDia').innerHTML=sab.diario.slice().reverse().slice(0,30).map(x=>it(x.tema,fecha(x.ts)+' · '+x.res)).join('')||'<small>Aún no ha estudiado sola.</small>';
  $('sbDat').innerHTML=sab.datos.slice().reverse().map(d=>it('['+d.tema+'] '+d.t,d.fuente+(d.url?' · '+d.url:'')+' · '+fecha(d.ts),`<button data-dd="${d.id}" title="Borrar">✕</button>`)).join('')||'<small>Vacío.</small>';
  $('sbTar').innerHTML=sab.tarjetas.slice().sort((a,b)=>a.due-b.due).map(t=>it(t.p,'R: '+t.r+(t.fuente?' · '+t.fuente:'')+' · toca '+(t.due<=Date.now()?'hoy':fecha(t.due)),`<button data-td="${t.id}" title="Borrar">✕</button>`)).join('')||'<small>Sin tarjetas.</small>';}
modal.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.ok){const x=sab.mejoras.find(y=>y.id===d.ok);if(x)x.estado='activa';}
  else if(d.mq){const x=sab.mejoras.find(y=>y.id===d.mq);if(x)x.estado='retirada';}
  else if(d.cq)sab.cola=sab.cola.filter(x=>x.id!==d.cq);
  else if(d.dd)sab.datos=sab.datos.filter(x=>x.id!==d.dd);
  else if(d.td)sab.tarjetas=sab.tarjetas.filter(x=>x.id!==d.td);
  else return;save();render();});
$('sbAuto').onchange=()=>{sab.auto=$('sbAuto').checked;save();pinta();};$('sbMax').onchange=()=>{sab.max=+$('sbMax').value;save();render();};
$('sbMej').onchange=()=>{sab.autoMejora=$('sbMej').checked;save();};
$('sbYa').onclick=()=>{modal.classList.remove('show');estudiar(true);};$('sbRep').onclick=()=>{modal.classList.remove('show');if(!busy){line('u','repaso');repaso();}};
$('sbAdd').onclick=()=>{const v=$('sbQ').value.trim();if(!v)return;encolar(v,'tu');$('sbQ').value='';render();};
$('sbClose').onclick=()=>modal.classList.remove('show');
$('sbExp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({tipo:'capri-saber',version:1,fecha:new Date().toISOString(),sab})],{type:'application/json'}));
  a.download='capri-saber-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();};
$('sbImp').onclick=()=>$('sbFile').click();
$('sbFile').onchange=async()=>{const f=$('sbFile').files[0];$('sbFile').value='';if(!f)return;
  try{const d=JSON.parse(await f.text());if(d.tipo!=='capri-saber')throw 0;let n=0;
    for(const k of ['datos','tarjetas','mejoras','diario','cola'])for(const x of d.sab[k]||[])if(!sab[k].some(y=>y.id===x.id)){sab[k].push(x);n++;}
    save();render();line('s','(🧠 Núcleo de certeza restaurado: '+n+' cosa(s) nuevas.)');}catch(e){line('s','(Ese archivo no es un respaldo del núcleo de certeza.)');}};
function openSaber(){render();modal.classList.add('show');}
window.openSaber=openSaber;
window.saberInfo=()=>({auto:sab.auto,datos:sab.datos.length,tarjetas:sab.tarjetas.length,hoy:vencidas().length,cola:sab.cola.length,mejoras:sab.mejoras.filter(x=>x.estado==='activa').length});

// ---------- comandos ----------
const _send=send;
send=async v=>{const t=(v||'').trim(),k=norm(t);
  if(/^(saber|certeza|nucleo)$/.test(k)&&!busy){line('u',t);openSaber();return;}
  if(/^repas(o|ar)$/.test(k)&&!busy){line('u',t);bump();repaso();return;}
  if(/^(investiga|estudia)[: ]/.test(k)&&!busy){line('u',t);encolar(t.replace(/^\S+[: ]\s*/,''),'tu');line('s','(🧠 Anotado: lo investigo en mi siguiente rato libre. «saber» para ver la lista.)');return;}
  await _send(v);
  if(k==='help')line('t','  saber — núcleo de certeza: notas verificadas, tarjetas y lo que estudia sola\n  repaso — repasar tus tarjetas pendientes\n  investiga <tema> — que lo estudie sola después');};

const btn=document.createElement('button');btn.id='bSaber';btn.className='btn';btn.style.display='none';btn.title='Núcleo de certeza';btn.onclick=openSaber;
document.querySelector('.dock .tools')?.appendChild(btn);
function pinta(){btn.classList.toggle('act',sab.auto);}
pinta();
})();
