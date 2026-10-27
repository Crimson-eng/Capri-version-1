// ================= CORRECTOR DE REDACCIÓN =================
// Capri revisa lo que escribes: ortografía, acentos, puntuación y claridad, con el cambio exacto que sugiere.
// - Prendido en CIBERWARE → Lóbulo frontal: mientras mira tu pantalla (👁), si ve que estás escribiendo, lo revisa.
// - Cuando quieras: «revisa mi redacción» (o «corrige esto»). Usa lo que ve en tu pantalla, con más resolución
//   para leer bien, o si no está mirando, lo que copiaste con Ctrl+C.
(()=>{
const red=Object.assign({on:false},store.get('redac',{}));
const REGLAS=n=>`Revisa ortografía, acentos, puntuación, concordancia y claridad. Da hasta 5 cambios, uno por línea, así: «como está» → «como queda» (por qué, en pocas palabras). Si vale la pena, al final pon la versión mejorada del párrafo principal. Respeta la voz de ${n}: no lo vuelvas formal si no lo es, y no cambies lo que ya está bien. Si está bien escrito, dilo en una línea. Sin markdown. Sigues siendo tú, pero aquí el contenido manda.`;
window.watchExtra=n=>red.on?` Además eres su correctora: si en la captura hay texto que ${n} está escribiendo (documento, tarea, correo, mensaje), en lugar de comentar otra cosa revisa su redacción. ${REGLAS(n)} No repitas una revisión de un texto que no ha cambiado.`:'';
const PIDE=/^(revisa(r)?|checa|corrige|mejora)\s+(mi\s+|la\s+)?(redacci[oó]n|ortograf[ií]a|escrito|texto|esto)\b|^redacci[oó]n$/i;
const _send=send;
send=async v=>{const t=(v||'').trim();if(!PIDE.test(t)||busy)return _send(v);
  askNotif();window.speechSynthesis?.cancel();bump();line('u',t);const n=cfg.name||'Kiga';
  if(watching){const g=grab(1600);if(g){lastSig=g.sig;await respond(`${t}. Lee el texto que estoy escribiendo en mi pantalla y revísalo. ${REGLAS(n)}`,{inlineData:{mimeType:'image/jpeg',data:g.b64}},'user');schedule();return;}}
  let copiado='';try{copiado=(await navigator.clipboard.readText()||'').trim();}catch(e){}
  if(copiado){await respond(`${t}. Este es el texto que copié:\n"""\n${copiado.slice(0,6000)}\n"""\n${REGLAS(n)}`,null,'user');return;}
  line('c','CAPRI');line('t','Enséñame qué reviso, choom: prende 👁 Mirar para que vea tu pantalla, o copia el texto con Ctrl+C y vuelve a pedírmelo.');setState('presumida');};
const btn=document.createElement('button');btn.id='bRedac';btn.className='btn';btn.style.display='none';btn.title='Corrector de redacción';
const sync=()=>btn.classList.toggle('act',red.on);sync();
btn.onclick=()=>{red.on=!red.on;store.set('redac',red);sync();
  line('s',red.on?'(✎ Corrector activo: cuando mire tu pantalla y te vea escribiendo, te dirá cómo mejorar tu redacción. También: «revisa mi redacción».)':'(Corrector de redacción apagado. «revisa mi redacción» sigue funcionando cuando lo pidas.)');};
document.querySelector('.dock .tools')?.appendChild(btn);
})();
