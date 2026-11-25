// ================= REGISTRO GRANDE (2.28.2) =================
// Kiga: «pon el registro en otra parte, donde está no se ve nada y es muy pequeño». Antes el registro solo vivía en la
// tarjeta CAPRI / SISTEMA de los widgets (letra de 11 px, una línea cortada con «…» y escondido si los widgets están cerrados).
// Ahora hay un panel REGISTRO aparte: letra grande, líneas completas, filtros, copiar, se puede mover y agrandar.
// Se abre con el botón ▤ de la terminal, con Ctrl+Shift+L, desde TODO (Ctrl+K) o tocando la tarjeta SISTEMA.
// Si algo truena, el botón ▤ se pone rojo hasta que lo abras.
(()=>{
const $=id=>document.getElementById(id);
const st=()=>store.get('registro',{});const guarda=o=>store.set('registro',Object.assign(st(),o));
const MAX=400,lineas=[];let filtro=st().filtro||'todo',sinVer=0;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------- estilos ----------
const css=document.createElement('style');css.textContent=`
#regP{position:fixed;right:16px;bottom:112px;width:min(620px,calc(100vw - 32px));height:min(58vh,560px);min-width:280px;min-height:180px;
  max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);z-index:75;display:none;flex-direction:column;background:#0b0a0f;border:2px solid var(--red);
  box-shadow:0 0 0 1px #000,0 12px 40px rgba(0,0,0,.7),0 0 24px rgba(255,42,77,.25);resize:both;overflow:hidden}
#regP.on{display:flex}
#regP .rh{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--red);color:#120006;font:700 13px var(--pix);letter-spacing:.08em;cursor:move;user-select:none}
#regP .rh b{flex:1}
#regP .rh button{background:#120006;color:var(--ink);border:0;font:600 13px var(--mono);padding:4px 10px;cursor:pointer}
#regP .rh button:hover{background:#000;color:var(--yel)}
#regP .rf{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;border-bottom:1px solid #2a2733}
#regP .rf button{background:transparent;color:var(--mut);border:1px solid #3a3644;font:600 13px var(--mono);padding:5px 10px;cursor:pointer}
#regP .rf button.on{color:#000;background:var(--yel);border-color:var(--yel)}
#regP .rf .n{margin-left:auto;color:var(--dim);font:12px var(--mono);align-self:center}
#regL{flex:1;overflow:auto;padding:8px 12px 12px;font:15px/1.55 var(--mono);color:var(--ink)}
#regL div{white-space:pre-wrap;word-break:break-word;padding:3px 0;border-bottom:1px dashed #1d1b24}
#regL time{color:var(--dim);margin-right:10px;font-size:13px}
#regL .w{color:#ff8ab0}#regL .w::before{content:'⚠ ';}#regL .y{color:var(--yel)}#regL .g{color:var(--grn)}
#regL .vac{color:var(--dim);border:0;text-align:center;padding:24px 0}
#regB{color:var(--ink)}#regB.alerta{background:var(--red)!important;color:#fff!important;animation:regPulso 1s steps(2) infinite}
@keyframes regPulso{50%{filter:brightness(1.6)}}
.logout{cursor:pointer;font-size:12.5px!important}.logout:hover{outline:1px dashed var(--red);outline-offset:3px}
@media (max-width:640px){#regP{right:8px;left:8px;width:auto;bottom:90px;height:60vh;resize:vertical}#regL{font-size:14px}}`;
document.head.appendChild(css);

// ---------- panel ----------
const P=document.createElement('div');P.id='regP';P.setAttribute('role','dialog');P.setAttribute('aria-label','Registro de Capri');
P.innerHTML=`<div class="rh" id="regH"><b>▤ REGISTRO DE CAPRI</b><button id="regCp" title="Copiar todo el registro (para mandarlo)">Copiar</button><button id="regX" title="Cerrar (Esc)">✕</button></div>
<div class="rf" id="regF"><button data-f="todo">Todo</button><button data-f="w">Errores y avisos</button><button data-f="cer">Cerebros</button><button data-f="limpia" title="Vaciar el registro">Limpiar</button><span class="n" id="regN"></span></div>
<div id="regL" aria-live="polite"></div>`;
document.body.appendChild(P);
const L=$('regL');
const pasa=x=>filtro==='todo'||(filtro==='w'?x.c==='w'||x.c==='y':/cerebro|GPU|Gemini|Claude|Ollama|🧠|⚡/i.test(x.t));
const fila=x=>`<div class="${x.c||''}"><time>${x.h}</time>${esc(x.t)}</div>`;
function pinta(){const v=lineas.filter(pasa);const abajo=L.scrollHeight-L.scrollTop-L.clientHeight<40;
  L.innerHTML=v.length?v.map(fila).join(''):'<div class="vac">Nada por aquí todavía.</div>';
  $('regN').textContent=v.length+' de '+lineas.length;
  P.querySelectorAll('#regF [data-f]').forEach(b=>b.classList.toggle('on',b.dataset.f===filtro));if(abajo||!pinta.ya){L.scrollTop=1e9;pinta.ya=1;}}
function abrir(){P.classList.add('on');sinVer=0;$('regB')?.classList.remove('alerta');pinta();L.scrollTop=1e9;guarda({abierto:true});}
function cerrar(){P.classList.remove('on');guarda({abierto:false});}
const alterna=()=>P.classList.contains('on')?cerrar():abrir();
window.registroAbrir=abrir;

$('regX').onclick=cerrar;
$('regCp').onclick=async()=>{const t=lineas.filter(pasa).map(x=>x.h+'  '+x.t).join('\n');
  try{await navigator.clipboard.writeText(t);$('regCp').textContent='¡Copiado!';}catch(e){$('regCp').textContent='No se pudo';}setTimeout(()=>$('regCp').textContent='Copiar',1500);};
$('regF').onclick=e=>{const f=e.target.dataset?.f;if(!f)return;if(f==='limpia'){lineas.length=0;}else{filtro=f;guarda({filtro});}pinta();};
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='L'||e.key==='l')){e.preventDefault();alterna();}
  else if(e.key==='Escape'&&P.classList.contains('on')&&!document.querySelector('.modal.show'))cerrar();});

// mover con la barra roja (y recordar dónde lo dejaste y su tamaño)
{let d=null;$('regH').addEventListener('pointerdown',e=>{if(e.target.tagName==='BUTTON')return;const r=P.getBoundingClientRect();d={x:e.clientX-r.left,y:e.clientY-r.top};$('regH').setPointerCapture(e.pointerId);});
  $('regH').addEventListener('pointermove',e=>{if(!d)return;const x=Math.max(0,Math.min(innerWidth-80,e.clientX-d.x)),y=Math.max(0,Math.min(innerHeight-40,e.clientY-d.y));
    Object.assign(P.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'});});
  $('regH').addEventListener('pointerup',()=>{if(!d)return;d=null;guarda({left:P.style.left,top:P.style.top});});
  const s=st();if(s.left&&parseInt(s.left)<innerWidth-80&&parseInt(s.top)<innerHeight-40)Object.assign(P.style,{left:s.left,top:s.top,right:'auto',bottom:'auto'});
  if(s.w)P.style.width=s.w;if(s.h)P.style.height=s.h;
  new ResizeObserver(()=>{if(P.classList.contains('on')&&P.style.width)guarda({w:P.style.width,h:P.style.height});}).observe(P);}

// ---------- botón ▤ en la terminal ----------
const tb=document.querySelector('.win.chat .tb');
if(tb){const b=document.createElement('button');b.className='wb';b.id='regB';b.title='Registro (Ctrl+Shift+L)';b.textContent='▤';b.onclick=alterna;tb.insertBefore(b,$('bMini2'));}
// la tarjeta CAPRI / SISTEMA de los widgets también lo abre
$('log')?.addEventListener('click',abrir);$('log')?.setAttribute('title','Toca para ver el registro en grande (Ctrl+Shift+L)');

// ---------- captura todo lo que entra al registro ----------
const hh=()=>new Date().toTimeString().slice(0,8);
const _log=window.log;
window.log=function(txt,cls){try{_log(txt,cls);}catch(e){}
  lineas.push({h:hh(),t:String(txt),c:cls||''});if(lineas.length>MAX)lineas.splice(0,lineas.length-MAX);
  if(cls==='w'&&!P.classList.contains('on')){sinVer++;$('regB')?.classList.add('alerta');}
  if(P.classList.contains('on')){clearTimeout(pinta.t);pinta.t=setTimeout(pinta,80);}};
// lo que ya estaba escrito antes de que cargara este módulo
document.querySelectorAll('#log > div').forEach(d=>{const m=d.textContent.match(/^(\d\d:\d\d:\d\d)\s+([\s\S]*)$/);lineas.push({h:m?m[1]:'',t:m?m[2]:d.textContent,c:d.className||''});});
if(st().abierto)abrir();
})();
