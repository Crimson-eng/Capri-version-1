// ================= INTERFAZ AMABLE (2.23) =================
// Kiga pidió que Capri sea más fácil de usar y más rápida sin esconder nada de lo que ya le gusta.
//  · Dock: 6 botones fijos (Manos, Mirar, Voz, Vida, Mini, Ajustes) + «TODO». Los demás siguen existiendo (los módulos
//    los buscan por id y les cambian la clase .act), solo se esconden del dock. Fija tus favoritos con ★.
//  · TODO / Ctrl+K: un lanzador con buscador: pestañas, botones y comandos agrupados. Escribe «receta», «relic», «inglés»…
//  · Chips de modos activos encima del chat (estudio, inglés, médico…): tócalos para abrir o apagar ese modo.
//  · Ajustes por secciones: una barra arriba con cada sección y un buscador; «Todo» enseña la lista completa como antes.
//  · Modo ligero (Ajustes → Interfaz): sin scanlines, fragmentos, rayas ni brillos pesados, para laptop o la GTX 1650.
//  · Lo que no se ve se pausa: con la ventana oculta se congelan las animaciones CSS.
(function(){
const $=id=>document.getElementById(id);
const st={get(k,d){try{const v=localStorage.getItem('capri_'+k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('capri_'+k,JSON.stringify(v));}catch(e){}}};
const ui=Object.assign({ligero:false,bootCorto:false},st.get('ui',{}));const saveUI=()=>st.set('ui',ui);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

// ---------- estilos ----------
const css=document.createElement('style');css.textContent=`
.dock .tools .btn.dk-hid{display:none}
.dock .tools{flex-wrap:wrap;justify-content:center}
#bTodo .gl .ci{color:var(--cyan,#22e5f0)}
/* lanzador / Ctrl+K */
#kPal{position:fixed;inset:0;z-index:250;display:none;align-items:flex-start;justify-content:center;padding:8vh 16px 16px;background:rgba(3,2,5,.72)}
#kPal.on{display:flex}
#kPal .kp{width:min(760px,100%);max-height:80vh;display:flex;flex-direction:column;background:#0b0a10;border:1px solid #ff4d5e66;box-shadow:0 0 0 1px #000,0 18px 60px #000,0 0 30px rgba(255,77,94,.15)}
#kPal .kh{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #2a1418}
#kPal .kh b{font:700 14px/1 var(--mono);color:#ff4d5e}
#kPal input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:var(--ink,#fff);font:16px/1.4 var(--mono);caret-color:#5ef6ff}
#kPal .kh kbd{font:10px/1 var(--mono);color:#8d8a99;border:1px solid #2e2a3a;padding:3px 5px}
#kPal .kb{overflow-y:auto;padding:8px 10px 12px;scrollbar-width:thin;scrollbar-color:#2a2733 transparent}
#kPal .kg{font:10px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:#5ef6ff;margin:12px 4px 6px}
#kPal .kgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
#kPal .ki{position:relative;display:flex;align-items:center;gap:9px;padding:9px 30px 9px 10px;background:#14121b;border:1px solid #221f2b;color:var(--ink,#f2f0f5);font:13px/1.2 var(--sans);text-align:left;cursor:pointer;min-width:0}
#kPal .ki span.n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#kPal .ki small{display:block;font:10.5px/1.3 var(--mono);color:#8d8a99;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#kPal .ki:hover,#kPal .ki.sel{border-color:#ff4d5e;background:#1c1018}
#kPal .ki.act{border-left:3px solid #2dff8f}
#kPal .ki .ic{flex:0 0 22px;height:22px;display:grid;place-items:center;font-size:16px;color:#ff4d5e}
#kPal .ki .ic svg{width:20px;height:20px}#kPal .ki .ic svg.vi{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round}
#kPal .ki>span:nth-child(2){flex:1;min-width:0;overflow:hidden}
#kPal .ki .pin{position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:0;color:#55525f;font-size:15px;cursor:pointer;padding:4px}
#kPal .ki .pin.on{color:#f3c84b}
#kPal .klist .ki{width:100%;margin-bottom:4px}
#kPal .kfoot{font:10.5px/1.4 var(--mono);color:#6d6a79;padding:8px 14px;border-top:1px solid #1d1a24}
#kPal .vac{font:13px var(--mono);color:#8d8a99;padding:16px 6px}
/* chips de modos activos */
#modeChips{display:none;flex-wrap:wrap;gap:6px;margin-top:8px}
#modeChips.on{display:flex}
#modeChips button{font:700 10.5px/1 var(--mono);letter-spacing:.1em;color:#2dff8f;background:#0f1f17;border:1px solid #2dff8f55;padding:5px 8px;cursor:pointer}
#modeChips button:hover{border-color:#2dff8f;color:#fff}
#modeChips button::before{content:'● '}
/* ajustes por secciones */
#ajNav{position:sticky;top:-1px;z-index:2;display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:8px 0 10px;margin-bottom:6px;background:var(--panel,#0d0c11);border-bottom:1px dashed #2a2733}
#ajNav button{font:11px/1 var(--mono);color:#8d8a99;background:#14121b;border:1px solid #2e2a3a;padding:5px 8px;cursor:pointer}
#ajNav button.on{color:#5ef6ff;border-color:#5ef6ff88}
#ajNav input{flex:1 1 140px;min-width:120px;background:#0c0b12;border:1px solid #2e2a3a;color:var(--ink,#fff);font:12px var(--mono);padding:5px 8px;outline:0}
.aj-off{display:none!important}
/* lo que no se ve, no se mueve */
body.oculta *,body.oculta *::before,body.oculta *::after{animation-play-state:paused!important}
/* modo ligero */
body.ligero::before,body.ligero::after{display:none!important}
body.ligero #shards,body.ligero #hfx,body.ligero .deco{display:none!important}
body.ligero *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body.ligero .eq i,body.ligero .chev i{animation:none!important}
body.ligero #boot::before{display:none}
`;document.head.appendChild(css);

// ---------- catálogo: qué es cada botón y dónde va ----------
const FIJOS=['bHands','bWatch','bVoice','bAlive','bMini','bCfg'];
const GRUPO={bHands:'Hablar y ver',bWatch:'Hablar y ver',bVoice:'Hablar y ver',bMini:'Hablar y ver',bFull:'Hablar y ver',bMore:'Hablar y ver',
 bStudy:'Estudio',bEng:'Estudio',bSaber:'Estudio',bRedac:'Estudio',
 bMed:'Salud',bClinica:'Salud',
 bAlive:'Mente de Capri',bCerebro:'Mente de Capri',bClaudeBrain:'Mente de Capri',bClaude:'Mente de Capri',bCrimson:'Mente de Capri',
 bTecnico:'Herramientas',bManos:'Herramientas',bMundo:'Herramientas',bCfg:'Herramientas'};
const ORDEN=['Pestañas','Hablar y ver','Estudio','Salud','Mente de Capri','Herramientas','Más','Comandos'];
// palabras extra para que el buscador encuentre las cosas como las dirías tú
const CLAVES={bStudy:'biblioteca apuntes pdf estudiar',bEng:'ingles english toefl profe',bSaber:'certeza fuentes verificar',bRedac:'redaccion escribir ortografia',
 bMed:'medico salud reservorio medlineplus',bClinica:'notas clinicas pacientes practica soap',bCerebro:'gpu ollama local',bClaudeBrain:'coprocesador anthropic',
 bClaude:'claude segunda opinion',bCrimson:'eco recuerdos familia capsulas',bTecnico:'taller informatica usb reparar',bManos:'abrir programas actuar pc',
 bMundo:'clima lluvia mapa trafico camaras',bHands:'voz microfono escuchar',bWatch:'pantalla ver mirar',bVoice:'hablar voz alta',bAlive:'vida propia hablar sola',
 bMini:'flotante minimizar',bCfg:'ajustes configuracion key',bFull:'pantalla completa',bMore:'widgets reloj ojos sistema'};
const tools=()=>document.querySelector('.dock .tools');
const label=b=>(b.querySelector('.tx')?.textContent||b.title||b.id).replace(/\s+/g,' ').trim();
const btns=()=>[...(tools()?.querySelectorAll('.btn[id]')||[])].filter(b=>b.id!=='bTodo');
// algunos módulos ponen botones invisibles (style display:none) solo para que CIBERWARE los active: esos no van al dock
const dockables=()=>btns().filter(b=>b.style.display!=='none');

let favs=st.get('dockFav',null);if(!Array.isArray(favs))favs=FIJOS.slice();
const saveFavs=()=>st.set('dockFav',favs);

// ---------- dock: fijos + TODO ----------
const todo=document.createElement('button');todo.className='btn';todo.id='bTodo';todo.title='Todo lo de Capri (Ctrl+K)';
todo.innerHTML='<span class="gl"><svg class="ci" viewBox="0 0 24 24" aria-hidden="true"><path class="k" d="M3 3 H9 V9 H3 Z M15 3 H21 V9 H15 Z M3 15 H9 V21 H3 Z"/><path class="a" d="M15 15 H21 V21 H15 Z"/></svg></span><span class="tx">TODO</span>';
todo.onclick=()=>abrir('');
function arreglaDock(){const t=tools();if(!t)return;
  for(const b of dockables())b.classList.toggle('dk-hid',!favs.includes(b.id));
  // orden: favoritos en el orden en que los fijaste, luego TODO
  for(const id of favs){const b=$(id);if(b&&b.parentNode===t)t.appendChild(b);}t.appendChild(todo);}
// los módulos agregan sus botones al cargar (algunos tarde): se acomodan solos
let dkT=0;const mo=new MutationObserver(()=>{clearTimeout(dkT);dkT=setTimeout(()=>{if(dockables().some(b=>!favs.includes(b.id)&&!b.classList.contains('dk-hid'))||todo.nextElementSibling)arreglaDock();},30);});
function iniciaDock(){const t=tools();if(!t)return;arreglaDock();mo.observe(t,{childList:true});}
// clic derecho en un botón del dock: quitarlo del dock
document.addEventListener('contextmenu',e=>{const b=e.target.closest?.('.dock .tools .btn[id]');if(!b||b===todo)return;e.preventDefault();
  if(confirm('¿Quitar «'+label(b)+'» del dock? Sigue en TODO (Ctrl+K).')){favs=favs.filter(x=>x!==b.id);saveFavs();arreglaDock();}});

// ---------- lanzador / Ctrl+K ----------
const pal=document.createElement('div');pal.id='kPal';pal.setAttribute('role','dialog');pal.setAttribute('aria-label','Todo lo de Capri');
pal.innerHTML=`<div class="kp"><div class="kh"><b>&gt;_</b><input id="kQ" placeholder="busca o abre: relic, receta, inglés, clima…" autocomplete="off"><kbd>Esc</kbd></div><div class="kb" id="kB"></div>
<div class="kfoot">↑ ↓ para elegir · Enter abre · ★ fija en el dock · clic derecho en el dock para quitar · Ctrl+K abre esto desde donde sea</div></div>`;
document.body.appendChild(pal);
const kQ=pal.querySelector('#kQ'),kB=pal.querySelector('#kB');
const VIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5 H20 V19 H4 Z M4 9 H20"/></svg>';
function vistas(){return [...document.querySelectorAll('.hnav .htabs button.t[data-v]')].map(b=>({k:'v:'+b.dataset.v,g:'Pestañas',n:b.textContent.trim(),d:'pestaña',
  ic:b.querySelector('svg')?.outerHTML||VIC,kw:b.dataset.v,run:()=>window.hudGo?.(b.dataset.v),act:b.classList.contains('on')}));}
function botones(){return btns().map(b=>({k:'b:'+b.id,id:b.id,g:GRUPO[b.id]||'Más',n:label(b),d:b.title||'',ic:b.querySelector('.gl')?.innerHTML||'◆',solo:b.style.display==='none',kw:CLAVES[b.id]||'',
  run:()=>{if(window.hudView&&window.hudView()!=='capri'&&!['bCfg','bMini','bFull','bClaude'].includes(b.id))window.hudGo?.('capri',true);setTimeout(()=>b.click(),40);},act:b.classList.contains('act')}));}
function comandos(){const c=[];const add=(n,d,kw,run,ok=true)=>ok&&c.push({k:'c:'+n,g:'Comandos',n,d,kw,ic:'›',run});
  add('Receta médica','abre la receta en blanco para imprimir','receta rx imprimir',()=>window.recetaAbrir?.(),!!window.recetaAbrir);
  add('Notas clínicas','registro de práctica','clinica notas',()=>window.openClinica?.(),!!window.openClinica);
  add('Expediente clínico','pacientes reales (NOM-004)','expediente paciente',()=>window.hudGo?.('expediente'));
  add('Profe de TOEFL','pestaña INGLÉS: practica y te califica, sin IA','toefl ingles english profe examen practicar vocabulario',()=>window.toeflIr?.(),!!window.toeflIr);
  add('Voz de Capri','RELIC → Voz: motor, afinar, entrenar','voz rvc piper cantar',()=>window.relicAbrir?.(4),!!window.relicAbrir);
  add(ui.ligero?'Apagar modo ligero':'Modo ligero','menos efectos, más rápido','ligero rapido lento rendimiento efectos',()=>ligero(!ui.ligero));
  add('Esconder a Capri','como Ctrl+Alt+H','sigilo esconder ocultar compartir',()=>$('sigiloChip')?.click(),!!$('sigiloChip')&&!!window.capriDesk);
  for(const s of seccionesAj())add('Ajustes: '+s.n,'abre Ajustes en esa sección','ajustes '+s.kw,()=>abreAj(s.n));
  return c;}
let items=[],sel=0;
const fila=(it,i)=>`<button class="ki${it.act?' act':''}${i===sel?' sel':''}" data-i="${i}" title="${esc(it.d)}"><span class="ic">${it.ic}</span><span style="min-width:0"><span class="n">${esc(it.n)}</span>${it.d&&it.g!=='Pestañas'?`<small>${esc(it.d)}</small>`:''}</span>${it.id&&!it.solo?`<span class="pin${favs.includes(it.id)?' on':''}" data-pin="${it.id}" title="${favs.includes(it.id)?'Quitar del dock':'Fijar en el dock'}">★</span>`:''}</button>`;
function pinta(){const q=norm(kQ.value.trim());const todos=[...vistas(),...botones(),...comandos()];
  if(!q){items=todos;let h='',i=0;for(const g of ORDEN){const gs=items.filter(x=>x.g===g);if(!gs.length)continue;h+=`<div class="kg">${g}</div><div class="kgrid">${gs.map(x=>fila(x,items.indexOf(x))).join('')}</div>`;i++;}
    kB.innerHTML=h;return;}
  const ws=q.split(/\s+/);items=todos.map(x=>{const t=norm(x.n+' '+x.d+' '+x.kw+' '+x.g);if(!ws.every(w=>t.includes(w)))return null;
    const n=norm(x.n);return [x,(n.startsWith(ws[0])?0:n.includes(ws[0])?1:2)];}).filter(Boolean).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
  sel=Math.min(sel,Math.max(0,items.length-1));
  kB.innerHTML=items.length?`<div class="klist">${items.map(fila).join('')}</div>`:`<div class="vac">Nada con «${esc(kQ.value)}». Prueba otra palabra, o pregúntale a Capri.</div>`;}
function abrir(q){pal.classList.add('on');kQ.value=q||'';sel=0;pinta();kQ.focus();setTimeout(()=>{if(pal.classList.contains('on')&&document.activeElement!==kQ)kQ.focus();},80);}
// si el foco se escapó (otra parte de Capri enfocó el chat), lo que escribas va al buscador
addEventListener('keydown',e=>{if(!pal.classList.contains('on')||e.target===kQ||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key.length===1||e.key==='Backspace'||e.key==='Enter'||e.key==='Escape'||e.key.startsWith('Arrow')){kQ.focus();if(e.key.length===1){e.preventDefault();kQ.value+=e.key;sel=0;pinta();}else if(e.key==='Escape'){e.preventDefault();cierra();}}},true);
function cierra(){pal.classList.remove('on');}
function corre(i){const it=items[i];if(!it)return;cierra();it.run();}
kQ.addEventListener('input',()=>{sel=0;pinta();});
kQ.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cierra();}
  else if(e.key==='Enter'){e.preventDefault();corre(sel);}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+items.length)%Math.max(1,items.length);pinta();kB.querySelector('.ki.sel')?.scrollIntoView({block:'nearest'});}});
pal.addEventListener('click',e=>{const p=e.target.closest('[data-pin]');if(p){e.stopPropagation();const id=p.dataset.pin;
    favs=favs.includes(id)?favs.filter(x=>x!==id):[...favs,id];saveFavs();arreglaDock();pinta();return;}
  const k=e.target.closest('.ki[data-i]');if(k)return corre(+k.dataset.i);if(e.target===pal)cierra();});
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&(e.key==='k'||e.key==='K')){e.preventDefault();pal.classList.contains('on')?cierra():abrir('');}},true);
window.capriLanzador=abrir;

// ---------- chips de modos activos ----------
const MODOS=[['bStudy','ESTUDIO'],['bEng','INGLÉS'],['bMed','MÉDICO'],['bSaber','CERTEZA'],['bRedac','REDACCIÓN'],['bMundo','MUNDO'],['bManos','MANOS PC'],['bTecnico','TALLER'],['bCrimson','CRIMSON'],['bCerebro','GPU'],['bClaudeBrain','CLAUDE']];
const chips=document.createElement('div');chips.id='modeChips';
let chipKey='';
function pintaChips(){const on=MODOS.filter(([id])=>$(id)?.classList.contains('act'));const k=on.map(x=>x[0]).join();if(k===chipKey)return;chipKey=k;
  chips.innerHTML=on.map(([id,n])=>`<button data-b="${id}" title="Modo ${n.toLowerCase()} activo: toca para abrirlo o apagarlo">${n}</button>`).join('');chips.classList.toggle('on',on.length>0);}
chips.addEventListener('click',e=>{const b=e.target.closest('[data-b]');if(b)$(b.dataset.b)?.click();});
function iniciaChips(){const r=$('inrow');if(!r)return;r.after(chips);pintaChips();
  new MutationObserver(pintaChips).observe(tools(),{attributes:true,subtree:true,attributeFilter:['class']});}

// ---------- ajustes por secciones ----------
const modal=$('modal'),cuerpo=()=>modal?.querySelector('.panel>div');
const ajNav=document.createElement('div');ajNav.id='ajNav';let ajSec='Todo';
// cada sección empieza en un <h3> directo o en un bloque que trae un <h3>; la fila de Guardar siempre se queda
function seccionesAj(){const c=cuerpo();if(!c)return [];const out=[];let cur=null;
  for(const el of c.children){if(el===ajNav||el.tagName==='H2')continue;
    if(el.querySelector?.('#cClose')){continue;}
    const h=el.tagName==='H3'?el:el.querySelector?.('h3');
    if(h){const n=h.textContent.replace(/\s*·.*$/,'').replace(/\s*\(.*\)\s*$/,'').replace(/[🔐🔒⚙]/gu,'').trim();cur={n,els:[],kw:''};out.push(cur);}
    if(!cur){cur={n:'General',els:[],kw:''};out.push(cur);}
    cur.els.push(el);cur.kw+=' '+(el.textContent||'').slice(0,400);}
  // juntar secciones con el mismo nombre
  const m=new Map();for(const s of out){if(m.has(s.n)){const t=m.get(s.n);t.els.push(...s.els);t.kw+=s.kw;}else m.set(s.n,s);}return [...m.values()];}
function pintaAj(){const c=cuerpo();if(!c)return;if(ajNav.parentNode!==c){const h2=c.querySelector('h2');h2?h2.after(ajNav):c.prepend(ajNav);}
  const ss=seccionesAj(),q=norm(ajNav.querySelector('input')?.value||'');
  if(!ss.some(s=>s.n===ajSec))ajSec='Todo';
  const btn=n=>`<button data-s="${esc(n)}" class="${n===ajSec&&!q?'on':''}">${esc(n)}</button>`;
  const prev=ajNav.querySelector('input')?.value||'';
  ajNav.innerHTML=btn('Todo')+ss.map(s=>btn(s.n)).join('')+`<input placeholder="buscar en ajustes…" value="${esc(prev)}">`;
  for(const s of ss){const ver=q?norm(s.n+' '+s.kw).includes(q):(ajSec==='Todo'||s.n===ajSec);for(const el of s.els)el.classList.toggle('aj-off',!ver);}}
ajNav.addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;ajSec=b.dataset.s;const i=ajNav.querySelector('input');if(i)i.value='';pintaAj();cuerpo()?.parentNode?.scrollTo?.({top:0});modal.querySelector('.panel')?.scrollTo?.({top:0});});
ajNav.addEventListener('input',e=>{if(e.target.tagName!=='INPUT')return;const pos=e.target.selectionStart;pintaAj();const i=ajNav.querySelector('input');i.focus();try{i.setSelectionRange(pos,pos);}catch(_){}});
function abreAj(n){ajSec=n||'Todo';$('bCfg')?.click();setTimeout(pintaAj,60);}
if(modal)new MutationObserver(()=>{if(modal.classList.contains('show'))setTimeout(pintaAj,30);}).observe(modal,{attributes:true,attributeFilter:['class']});

// sección «Interfaz» dentro de Ajustes
function iniciaAjustesUI(){const c=cuerpo();if(!c||$('uiBox'))return;const fin=$('cClose')?.closest('.row');
  const box=document.createElement('div');box.id='uiBox';box.innerHTML=`<h3>Interfaz</h3>
  <label class="ck"><input type="checkbox" id="uiLig"> Modo ligero: sin scanlines, fragmentos, rayas ni brillos pesados (más fluida en laptop o GPU modesta)</label>
  <label class="ck"><input type="checkbox" id="uiBoot"> Arranque corto siempre (si no, la animación completa sale solo la primera vez del día)</label>
  <small>El dock trae 6 botones fijos; todo lo demás está en <b>TODO</b> o con <b>Ctrl+K</b>. Fija tus favoritos con ★ ahí mismo, y quítalos con clic derecho en el dock.</small>
  <div class="row" style="justify-content:flex-start"><button class="btn" id="uiReset" style="width:auto;padding:0 12px">Restablecer dock</button><button class="btn" id="uiTodo" style="width:auto;padding:0 12px">Abrir TODO</button></div>`;
  fin?c.insertBefore(box,fin):c.appendChild(box);
  const lg=box.querySelector('#uiLig'),bt=box.querySelector('#uiBoot');lg.checked=ui.ligero;bt.checked=ui.bootCorto;
  lg.onchange=()=>ligero(lg.checked);bt.onchange=()=>{ui.bootCorto=bt.checked;saveUI();};
  box.querySelector('#uiReset').onclick=()=>{favs=FIJOS.slice();saveFavs();arreglaDock();};
  box.querySelector('#uiTodo').onclick=()=>{modal.classList.remove('show');abrir('');};}
function ligero(v){ui.ligero=!!v;saveUI();document.body.classList.toggle('ligero',ui.ligero);const c=$('uiLig');if(c)c.checked=ui.ligero;}
document.body.classList.toggle('ligero',ui.ligero);

// ---------- arranque ----------
function inicia(){iniciaDock();iniciaChips();iniciaAjustesUI();}
// después de que todos los módulos pusieron sus botones (algunos esperan un momento)
if(document.readyState==='complete')setTimeout(inicia,0);else addEventListener('load',()=>setTimeout(inicia,0));
setTimeout(()=>{arreglaDock();pintaChips();iniciaAjustesUI();},2500);
window.__uiTest={abrir,cierra,items:()=>items,favs:()=>favs,secciones:seccionesAj,ligero};
})();
