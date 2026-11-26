// ================= 2.30: CAPRI VE TUS IMÁGENES =================
// Antes Capri solo veía tu pantalla (👁). Ahora le puedes mandar imágenes en el chat:
//   · botón 🖼 junto al micrófono (elige una o varias)
//   · pegar con Ctrl+V (una captura, una foto copiada de una página)
//   · arrastrar y soltar la imagen sobre el chat
// Se ven en miniatura arriba de donde escribes (✕ para quitarla) y se mandan junto con tu mensaje al cerebro que
// pueda verlas: Gemini, Claude (si lo tienes prendido) o tu GPU si su modelo ve imágenes (gemma3:4b sí).
// Groq y OpenRouter solo leen texto: con imagen no se usan. Si mandas solo la imagen, Capri te dice qué ve.
// Las imágenes se achican a 1600 px (JPEG) antes de mandarlas: se suben más rápido y gastan menos.
(()=>{
const MAX=4,LADO=1600,$=id=>document.getElementById(id);
let fotos=[];   // [{data(base64), mimeType, url(miniatura), nombre}]
const css=document.createElement('style');
css.textContent=`#bImg{flex:0 0 auto;width:40px;height:36px;border:1px solid #2a2733;background:var(--panel2);cursor:pointer;display:grid;place-items:center;color:var(--cyan);
 clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}#bImg:hover{border-color:var(--cyan)}#bImg.act{background:#062a30;border-color:var(--cyan)}
#bImg svg{width:18px;height:18px}
#adjBar{display:none;gap:8px;flex-wrap:wrap;padding:8px 0 0;align-items:center}#adjBar.on{display:flex}
#adjBar .ad{position:relative;width:64px;height:64px;border:1px solid var(--cyan);background:#000 center/cover no-repeat;box-shadow:0 0 8px #5ef6ff44}
#adjBar .ad button{position:absolute;top:-7px;right:-7px;width:20px;height:20px;border:1px solid #ff1f55;background:#2a0712;color:#ff8aa3;font:700 11px/1 var(--mono);cursor:pointer;padding:0}
#adjBar .tx{font:12px/1.3 var(--mono);color:var(--dim)}
.chat.soltar .out{outline:2px dashed var(--cyan);outline-offset:-6px}
#term .adjU{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 2px}#term .adjU img{max-width:160px;max-height:120px;border:1px solid #2a2733}`;
document.head.appendChild(css);

const row=$('inrow'),q=$('q');if(!row||!q)return;
const btn=document.createElement('button');btn.id='bImg';btn.type='button';btn.title='Mandarle una imagen (también puedes pegarla con Ctrl+V o arrastrarla)';
btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5 H21 V19 H3 Z"/><path d="M3 16 L9 10 L14 15 L17 12 L21 16"/><path d="M15.5 8.5 h.01" stroke-width="3"/></svg>';
const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.multiple=true;inp.hidden=true;
const mic=$('mic');row.insertBefore(btn,mic||null);row.appendChild(inp);
const bar=document.createElement('div');bar.id='adjBar';row.before(bar);
btn.onclick=()=>inp.click();
inp.onchange=()=>{agrega([...inp.files]);inp.value='';};

// achica la imagen y la pasa a JPEG base64 (las transparencias quedan en negro como el HUD)
function lee(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{try{const k=Math.min(1,LADO/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*k)),h=Math.max(1,Math.round(im.naturalHeight*k));
      const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);
      const d=c.toDataURL('image/jpeg',.85);URL.revokeObjectURL(url);res({data:d.split(',')[1],mimeType:'image/jpeg',url:d,nombre:file.name||'imagen',w,h});}catch(e){rej(e);}};
  im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('no pude abrir '+(file.name||'la imagen')));};im.src=url;});}
async function agrega(files){const imgs=files.filter(f=>/^image\//.test(f.type));if(!imgs.length)return false;
  for(const f of imgs){if(fotos.length>=MAX){line('s','(Máximo '+MAX+' imágenes por mensaje.)');break;}
    try{const r=await lee(f);fotos.push(r);log('🖼 imagen lista: '+r.nombre+' ('+r.w+'×'+r.h+')','g');}catch(e){line('s','('+e.message+')');}}
  pinta();q.focus();return true;}
function pinta(){bar.innerHTML=fotos.map((f,i)=>`<div class="ad" style="background-image:url(${f.url})" title="${String(f.nombre).replace(/"/g,'')}"><button data-i="${i}" title="Quitar">✕</button></div>`).join('')+
  (fotos.length?`<span class="tx">${fotos.length>1?fotos.length+' imágenes':'1 imagen'} · escribe qué quieres saber, o solo dale enviar</span>`:'');
  bar.classList.toggle('on',fotos.length>0);btn.classList.toggle('act',fotos.length>0);}
bar.onclick=e=>{const b=e.target.closest('button[data-i]');if(!b)return;fotos.splice(+b.dataset.i,1);pinta();};

// pegar (Ctrl+V) una imagen: en cualquier parte de la ventana del chat, no solo en la caja de texto
document.addEventListener('paste',e=>{const it=[...(e.clipboardData?.items||[])].filter(i=>i.kind==='file'&&/^image\//.test(i.type));if(!it.length)return;
  const a=document.activeElement;if(a&&a!==q&&a!==document.body&&/^(INPUT|TEXTAREA)$/.test(a.tagName))return;   // otro campo (ajustes, expediente…): no es para el chat
  e.preventDefault();agrega(it.map(i=>i.getAsFile()).filter(Boolean));},true);
// arrastrar y soltar sobre el chat
const chat=row.closest('.chat')||row.parentElement;
const conFotos=e=>[...(e.dataTransfer?.items||[])].some(i=>i.kind==='file'&&(/^image\//.test(i.type)||!i.type));
chat.addEventListener('dragover',e=>{if(!conFotos(e))return;e.preventDefault();chat.classList.add('soltar');});
chat.addEventListener('dragleave',e=>{if(!chat.contains(e.relatedTarget))chat.classList.remove('soltar');});
chat.addEventListener('drop',e=>{chat.classList.remove('soltar');const f=[...(e.dataTransfer?.files||[])].filter(x=>/^image\//.test(x.type));if(!f.length)return;e.preventDefault();e.stopPropagation();agrega(f);});

window.capriHayAdjuntos=()=>fotos.length>0;
window.capriAdjuntar=agrega;
// index.html → send(): se lleva las imágenes (y las deja en miniatura bajo tu mensaje)
window.capriTomaAdjuntos=()=>{if(!fotos.length)return null;const fs=fotos;fotos=[];pinta();
  const u=[...document.querySelectorAll('#term > .u')].pop();
  if(u){const d=document.createElement('div');d.className='adjU';for(const f of fs){const im=document.createElement('img');im.src=f.url;im.alt=f.nombre;d.appendChild(im);}u.after(d);}
  log('🖼 mando '+fs.length+' imagen(es) al cerebro','g');
  return fs.map(f=>({inlineData:{mimeType:f.mimeType,data:f.data}}));};
})();
