// ================= HILOS DE MEMORIA (2.9.1) =================
// La ventana para ver todo lo que Capri recuerda de tus pláticas, separado por hilos (Día a día, Sobre ti y tu gente,
// Estudio y salud, Planes y pendientes) y por día, con el resumen de cada día. Las pláticas se guardan en cerebro.js.
// Se abre con el comando «hilos» o desde AJUSTES → Cerebro.
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=document.createElement('style');css.textContent=`
#hiModal .panel{max-width:980px;height:88vh}#hiModal .panel>div{height:100%;box-sizing:border-box}
#hiModal .hi-g{display:grid;grid-template-columns:260px 1fr;gap:14px;flex:1;min-height:0}
#hiModal .hi-ch{display:flex;flex-wrap:wrap;gap:5px}#hiModal .hi-ch button{font:11px var(--mono);background:none;border:1px solid #2a2733;color:var(--ink);padding:4px 8px;cursor:pointer}
#hiModal .hi-ch button.on{border-color:var(--cyan);color:var(--cyan)}#hiModal .hi-ch b{color:var(--mut);font-weight:400;margin-left:4px}
#hiModal .hi-ds{overflow:auto;border-right:1px solid #2a2733;padding-right:8px}#hiModal .hi-d{padding:7px 8px;border-left:2px solid #2a2733;margin-bottom:4px;cursor:pointer;font:12px/1.4 var(--mono)}
#hiModal .hi-d:hover{border-color:var(--red)}#hiModal .hi-d.on{border-color:var(--cyan);background:rgba(45,226,230,.06)}#hiModal .hi-d small{display:block;color:var(--mut)}
#hiModal .hi-v{overflow:auto;min-width:0}#hiModal .hi-r{border:1px solid #2a2733;padding:10px 12px;font:13px/1.55 var(--sans);color:var(--ink);margin-bottom:10px;background:#0f0e14}
#hiModal .hi-m{border-bottom:1px dashed #2a2733;padding:7px 0;font:12.5px/1.5 var(--mono);white-space:pre-wrap;word-break:break-word}
#hiModal .hi-m em{font-style:normal;color:var(--mut);font-size:11px;display:flex;gap:8px;align-items:center}
#hiModal .hi-m select{font:11px var(--mono);padding:1px 4px;background:#000;color:var(--mut);border:1px solid #2a2733}#hiModal .hi-m button{background:none;border:0;color:var(--mut);cursor:pointer;margin-left:auto}
#hiModal input.hi-q{padding:7px 10px;font:12px var(--mono)}
@media (max-width:720px){#hiModal .hi-g{grid-template-columns:1fr}#hiModal .hi-ds{max-height:28vh;border-right:0}}`;document.head.appendChild(css);
const modal=document.createElement('div');modal.className='modal';modal.id='hiModal';modal.innerHTML='<div class="panel"><div id="hiIn"></div></div>';document.body.appendChild(modal);
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});
let hilo='todo',dia=null,q='';
const fecha=d=>new Date(d+'T12:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
const hora=ts=>new Date(ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
function pinta(){const I=window.hilosInfo?.();if(!I){$('hiIn').innerHTML='<small>La memoria todavía no carga.</small>';return;}
  const {HILOS,mems,dias}=I,qq=q.trim().toLowerCase();
  const vis=mems.filter(m=>(hilo==='todo'||m.hilo===hilo)&&(!qq||m.t.toLowerCase().includes(qq)));
  const porDia={};for(const m of vis)(porDia[m.dia]=porDia[m.dia]||[]).push(m);const ds=Object.keys(porDia).sort().reverse();
  if(!dia||!porDia[dia])dia=ds[0]||null;const cnt=h=>mems.filter(m=>h==='todo'||m.hilo===h).length;
  const r=dias.find(x=>x.dia===dia);
  $('hiIn').innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h2>🧵 Hilos de memoria</h2><small>Todo lo que platicas con Capri se guarda aquí, en tu dispositivo, separado por hilos y por día. Así recuerda tu día a día («¿qué te conté ayer?») sin revolverlo con lo que estudias.</small></div><button class="btn" id="hiX" style="width:auto;padding:6px 10px">✕</button></div>
   <div class="hi-ch">${[['todo','Todo'],...Object.entries(HILOS)].map(([k,n])=>`<button data-h="${k}" class="${hilo===k?'on':''}">${esc(n)}<b>${cnt(k)}</b></button>`).join('')}</div>
   <input class="hi-q" id="hiQ" placeholder="Buscar en tus pláticas…" value="${esc(q)}">
   <div class="hi-g"><div class="hi-ds">${ds.map(d=>{const rr=dias.find(x=>x.dia===d);return `<div class="hi-d${d===dia?' on':''}" data-d="${d}">${esc(fecha(d))}<small>${porDia[d].length} plática(s)${rr?' · resumido':''}</small></div>`;}).join('')||'<small>Aún no hay pláticas guardadas. Si no se guardan, revisa en AJUSTES → Cerebro que «Aprender de las pláticas» esté en Sí.</small>'}</div>
    <div class="hi-v">${dia?`<div class="hi-r"><b>${esc(fecha(dia))}</b><br>${r?.resumen?esc(r.resumen):'<span style="color:var(--mut)">Este día aún no tiene resumen. Capri lo hace sola cuando el día termina y no la estás usando.</span>'}
      <div class="row" style="justify-content:flex-start;margin-top:6px"><button class="btn" id="hiRes" style="width:auto;padding:5px 10px;font-size:11px">${r?'↻ Volver a resumir':'Resumir este día'}</button><small id="hiMsg"></small></div></div>
      ${porDia[dia].map(m=>`<div class="hi-m"><em>${hora(m.ts)}<select data-m="${m.id}">${Object.entries(HILOS).map(([k,n])=>`<option value="${k}" ${m.hilo===k?'selected':''}>${esc(n)}</option>`).join('')}</select><button data-x="${m.id}" title="Olvidar esta plática">✕</button></em>${esc(m.t)}</div>`).join('')}`:''}</div></div>`;}
modal.addEventListener('click',async e=>{const t=e.target;
  if(t.id==='hiX')return modal.classList.remove('show');
  const h=t.closest('[data-h]');if(h){hilo=h.dataset.h;dia=null;return pinta();}
  const d=t.closest('[data-d]');if(d){dia=d.dataset.d;return pinta();}
  const x=t.closest('[data-x]');if(x){if(!confirm('¿Que Capri olvide esta plática?'))return;await window.hilosBorrar(+x.dataset.x);return pinta();}
  if(t.id==='hiRes'){$('hiMsg').textContent=' resumiendo…';const ok=await window.hilosResumir(dia);if(!ok)$('hiMsg').textContent=' no pude (necesita tu GPU o la key de Gemini)';else pinta();}});
modal.addEventListener('change',async e=>{const m=e.target.dataset.m;if(m){await window.hilosCambiar(+m,e.target.value);pinta();}});
modal.addEventListener('input',e=>{if(e.target.id!=='hiQ')return;q=e.target.value;clearTimeout(pinta.t);pinta.t=setTimeout(()=>{pinta();const i=$('hiQ');i.focus();i.setSelectionRange(q.length,q.length);},200);});
window.openHilos=()=>{hilo='todo';dia=null;q='';pinta();modal.classList.add('show');};
const ce=$('ceDel');if(ce){const b=document.createElement('button');b.className='btn';b.id='ceHilos';b.style.cssText='width:auto;flex:1;padding:8px 10px';b.textContent='🧵 Ver hilos de memoria';b.onclick=window.openHilos;ce.before(b);}
const _send=send;
send=async v=>{const k=(v||'').trim().toLowerCase();if(/^(hilos|memoria|mis platicas|mis pláticas)$/.test(k)&&!busy){line('u',v.trim());window.openHilos();return;}
  await _send(v);if(k==='help')line('t','  hilos — Tus pláticas guardadas por hilo y por día, con el resumen de cada día');};
})();
