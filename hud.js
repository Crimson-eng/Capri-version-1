// HUD por secciones, al estilo del menú de Cyberpunk 2077: CAPRI · CIBERWARE · MÉDICO · DIARIO.
// CIBERWARE: las habilidades de Capri como implantes en un cuerpo holográfico (se activan desde ahí).
// MÉDICO: cuerpo por sistemas para consultar o estudiar, y el interruptor del reservorio médico.
// DIARIO: lo que Capri recuerda de ti, como lista de misiones, y las tarjetas de perfil.
// Cambiar de sección pasa con rayas de glitch; la primera vez de cada sección, con la pantalla CONNECT.
(()=>{
// también corre en el .exe: ahí Capri completa es la misma página en modo escritorio, expandida
const css=document.createElement('style');css.textContent=`
:root{--hr:#ff4d5e;--hr2:rgba(255,77,94,.35);--hr3:rgba(255,77,94,.1);--hc:#5ef6ff;--hc2:rgba(94,246,255,.35);--hg:#f3c84b}
.hnav{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:0 18px;height:46px;background:linear-gradient(#0b0608,#07070a);border-bottom:1px solid var(--hr2);font:12px/1 var(--mono);position:relative;z-index:3}
.hnav .st{display:flex;gap:16px;align-items:baseline;color:var(--hc);white-space:nowrap}
.hnav .st b{font:600 22px/1 var(--sans);color:var(--hc)}.hnav .st small{font:10px var(--mono);letter-spacing:.12em;color:#9fdfe3;text-transform:uppercase}
.hnav .st.r{margin-left:auto;color:var(--hr)}.hnav .st.r b{color:var(--hr)}
.htabs{display:flex;align-items:center;gap:4px;margin:0 auto;overflow-x:auto;scrollbar-width:none}
.htabs .k{border:1px solid var(--hc2);color:var(--hc);font:11px var(--mono);padding:2px 6px;cursor:pointer;background:none}
.htabs button.t{background:none;border:0;border-bottom:2px solid transparent;color:var(--hr);font:600 13px/1 var(--sans);letter-spacing:.08em;padding:14px 12px 12px;cursor:pointer;white-space:nowrap;position:relative}
.htabs button.t:hover{color:#ffc2c8}.htabs button.t.on{color:var(--hc);border-bottom-color:var(--hc);text-shadow:0 0 12px var(--hc2)}
.htabs button.t::after{content:'';position:absolute;left:0;right:0;bottom:-2px;height:2px;background:var(--hr2)}.htabs button.t.on::after{background:var(--hc)}
body:not([data-view=capri]) .app .desk>:not(.hview){visibility:hidden}body:not([data-view=capri]) .dock{display:none}
.hview{position:absolute;inset:0;display:none;padding:22px 30px;overflow:auto;color:#ffd9dc;font:13px/1.5 var(--mono);
 background:radial-gradient(ellipse at 50% 55%,rgba(255,77,94,.13),transparent 60%),repeating-linear-gradient(0deg,rgba(255,77,94,.035) 0 1px,transparent 1px 4px),#070406}
.hview.on{display:block;animation:hvIn .35s ease-out}
@keyframes hvIn{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:none}}
.hview h3{font:600 15px/1 var(--sans);letter-spacing:.1em;color:var(--hr);margin:0 0 4px;text-transform:uppercase}
.hview .sub{font:10px var(--mono);letter-spacing:.2em;color:#a0565e;text-transform:uppercase}
.hbtn{background:none;border:1px solid var(--hr);color:var(--hr);font:600 12px var(--sans);letter-spacing:.1em;padding:9px 14px;cursor:pointer;text-transform:uppercase;clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)}
.hbtn:hover{background:var(--hr3)}.hbtn.c{border-color:var(--hc);color:var(--hc)}.hbtn.on{background:var(--hr);color:#14070a}.hbtn.c.on{background:var(--hc);color:#04161a}
/* cuerpo holográfico */
.holo{position:relative;height:100%;min-height:420px;display:flex;justify-content:center}
.holo svg.body{height:100%;max-height:640px;width:auto;overflow:visible;filter:drop-shadow(0 0 14px rgba(255,77,94,.35))}
.holo .scan{animation:scan 3.6s linear infinite}@keyframes scan{from{transform:translateY(-20px)}to{transform:translateY(460px)}}
.holo .pulse{animation:hp 1.1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes hp{50%{transform:scale(1.25);opacity:.6}}
.holo .flow{stroke-dasharray:3 9;animation:flow 1.6s linear infinite}@keyframes flow{to{stroke-dashoffset:-24}}
/* ciberware */
.cw{display:grid;grid-template-columns:150px 1fr minmax(240px,300px) 1fr;gap:18px;height:100%;min-height:520px}
.cw .cap{display:flex;gap:14px;align-items:flex-end;padding-bottom:30px}
.cw .cap .bars{display:flex;flex-direction:column-reverse;gap:3px}.cw .cap .bars i{display:block;width:34px;height:5px;background:#3b1418}.cw .cap .bars i.on{background:var(--hr)}.cw .cap .bars.y i.on{background:var(--hg)}
.cw .cap small{writing-mode:vertical-rl;transform:rotate(180deg);font:10px var(--mono);letter-spacing:.2em;color:#a0565e}
.cw .col{display:flex;flex-direction:column;justify-content:space-around;gap:16px}
.cw .grp .gl{font:10px var(--mono);letter-spacing:.18em;color:#c96a73;text-transform:uppercase;margin-bottom:6px;display:flex;align-items:center;gap:8px}
.cw .grp .gl::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--hr2),transparent)}.cw .col.r .grp .gl{flex-direction:row-reverse}.cw .col.r .grp .gl::after{background:linear-gradient(270deg,var(--hr2),transparent)}
.cw .slots{display:flex;gap:8px;flex-wrap:wrap}.cw .col.r .slots{justify-content:flex-end}
.slot{width:62px;height:62px;border:1px solid #4a1a20;background:linear-gradient(135deg,#1a0a0d,#0b0507);display:grid;place-items:center;cursor:pointer;position:relative;color:#7e3a42}
.slot .ci{width:28px;height:28px;filter:none}.slot .ci .a{fill:currentColor}.slot .ci .a2{stroke:currentColor}
.slot:hover,.slot.sel{border-color:var(--hg);box-shadow:0 0 0 1px var(--hg) inset}
.slot.on{color:var(--hr);border-color:var(--hr);background:linear-gradient(135deg,#3a0f16,#12060a);box-shadow:0 0 16px rgba(255,77,94,.25)}
.slot.on::after{content:'';position:absolute;right:4px;top:4px;width:6px;height:6px;background:var(--hc);box-shadow:0 0 6px var(--hc)}
.slot b{position:absolute;left:3px;bottom:2px;font:9px var(--mono);color:#a0565e}
.cwd{grid-column:1/-1;display:flex;gap:16px;align-items:center;border:1px solid var(--hr2);background:rgba(20,6,9,.85);padding:12px 16px;min-height:74px}
.cwd .nm{font:600 16px var(--sans);color:var(--hc);letter-spacing:.06em}.cwd .ty{font:10px var(--mono);color:#a0565e;letter-spacing:.2em;text-transform:uppercase}
.cwd p{margin:4px 0 0;color:#ffd0d4;max-width:640px}.cwd .sp{flex:1}
/* médico */
.md{display:grid;grid-template-columns:170px minmax(260px,1fr) minmax(300px,420px);gap:22px;height:100%;min-height:520px}
.mdz{display:flex;flex-direction:column;gap:4px}.mdz button{display:flex;justify-content:space-between;align-items:center;background:none;border:0;border-left:2px solid #3b1418;color:#d9a3a9;font:12px var(--mono);text-align:left;padding:7px 10px;cursor:pointer}
.mdz button:hover{color:#fff;border-left-color:var(--hr)}.mdz button.on{color:var(--hg);border-left-color:var(--hg);background:rgba(243,200,75,.06)}.mdz b{background:var(--hg);color:#140c00;font:700 10px var(--mono);padding:0 5px}.mdz b:empty{display:none}
.mat{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #2a0d11;padding:5px 0;font-size:12px}.mat span{color:#ffe4e6}.mat em{color:var(--hc);font:10px var(--mono);font-style:normal;text-transform:uppercase;white-space:nowrap}
.hview .holo.holo3d>svg{display:none}
.md .zone{cursor:pointer}.md .zone circle.h{fill:rgba(94,246,255,.12);stroke:var(--hc);stroke-width:1}.md .zone:hover circle.h,.md .zone.sel circle.h{fill:rgba(243,200,75,.25);stroke:var(--hg)}
.md .zone text{font:7px var(--mono);fill:#9fdfe3;letter-spacing:.08em}.md .zone.sel text{fill:var(--hg)}
.mdp{display:flex;flex-direction:column;gap:14px}
.mdp .box{border:1px solid var(--hr2);background:rgba(20,6,9,.85);padding:14px 16px}
.mdp .sys{font:600 20px var(--sans);color:var(--hc);letter-spacing:.06em;text-transform:uppercase}
.mdp .q{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.mdp .q button{text-align:left;background:none;border:1px solid #3b1418;color:#ffd0d4;font:12px var(--mono);padding:8px 10px;cursor:pointer}.mdp .q button:hover{border-color:var(--hg);color:var(--hg)}
.mdp .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.mdp .in{display:flex;border:1px solid var(--hr);margin-top:10px}.mdp .in span{color:var(--hr);padding:8px}.mdp .in input{flex:1;background:none;border:0;color:#fff;font:13px var(--mono);outline:0}
.mdp .st{font:11px var(--mono);color:#c96a73}.mdp .st b{color:var(--hc)}
.mdp .warn{font:11px var(--mono);color:#a0565e}
/* diario */
.dy{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.idc{border:1px solid var(--hr);padding:12px;display:flex;gap:14px;position:relative;background:rgba(20,6,9,.7);clip-path:polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)}
.idc .ph{width:112px;height:128px;flex:0 0 auto;border:1px solid var(--hr);display:grid;place-items:center;background:#12060a;overflow:hidden;position:relative}
.idc .ph img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.idc .ph .ini{font:600 46px var(--sans);color:var(--hr)}
.idc .ph::after{content:'ANALYZE';position:absolute;bottom:3px;left:0;right:0;text-align:center;font:8px var(--mono);letter-spacing:.3em;color:var(--hr)}
.idc .tt{background:var(--hr);color:#14070a;font:700 15px var(--sans);letter-spacing:.06em;padding:4px 8px;margin-bottom:8px}
.idc dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font:11px var(--mono)}.idc dt{color:#c96a73;text-transform:uppercase}.idc dd{margin:0;color:#ffe4e6}
.dyl{grid-column:1;border:1px solid var(--hr2);max-height:52vh;overflow:auto}
.dyl .cnt{display:flex;gap:8px;padding:8px;border-bottom:1px solid var(--hr2);position:sticky;top:0;background:#0d0507;flex-wrap:wrap}
.dyl .cnt button{background:none;border:1px solid #3b1418;color:#c96a73;font:11px var(--mono);padding:4px 8px;cursor:pointer}.dyl .cnt button.on{border-color:var(--hc);color:var(--hc)}
.qi{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border-bottom:1px solid #1d0b0e;cursor:pointer}.qi:hover{background:var(--hr3)}
.qi.sel{outline:1px solid var(--hg);background:rgba(243,200,75,.06)}
.qi .ex{width:18px;height:18px;border:1.5px solid var(--hg);border-radius:50%;display:grid;place-items:center;color:var(--hg);font:700 11px var(--sans);flex:0 0 auto;margin-top:2px}
.qi b{display:block;color:var(--hc);font:600 12px var(--sans);letter-spacing:.06em;text-transform:uppercase}.qi span{color:#d9a3a9;font-size:12px}.qi em{margin-left:auto;font:10px var(--mono);color:#a0565e;font-style:normal;white-space:nowrap}
.dyd{grid-column:2;border:1px solid var(--hr2);padding:16px;background:rgba(20,6,9,.7);align-self:start}
.dyd .tl{font:600 14px var(--sans);color:var(--hr);letter-spacing:.1em;text-transform:uppercase}.dyd .bx{border:1px solid var(--hr2);padding:10px 12px;margin:10px 0;color:var(--hc);font:600 14px var(--sans)}
.dyd p{color:#ff8a94;margin:0 0 12px}
/* transiciones */
#hfx{position:fixed;inset:0;z-index:90;pointer-events:none;display:none}
#hconn{position:fixed;inset:0;z-index:91;background:#050203;display:none;place-items:center;font:12px var(--mono);color:#ffd0d4}
#hconn.on{display:grid}#hconn svg{position:absolute;inset:0;width:100%;height:100%}
#hconn .c{position:relative;text-align:center}#hconn .c small{letter-spacing:.5em;font-size:10px;color:#c9c0c2}
#hconn .c h2{margin:10px 0 18px;font:700 30px var(--sans);letter-spacing:.35em;color:var(--hr)}
#hconn .ld{display:flex;align-items:center;gap:10px;width:min(560px,80vw);font:10px var(--mono);letter-spacing:.2em}
#hconn .ld i{flex:1;height:6px;background:#2a0d11;position:relative}#hconn .ld i b{position:absolute;inset:0 auto 0 0;width:0;background:var(--hr);box-shadow:0 0 10px var(--hr)}
#hconn .ld em{font:600 16px var(--sans);color:#fff;font-style:normal;width:40px}
@media (max-width:980px){.cw{grid-template-columns:1fr;min-height:0}.cw .cap{display:none}.cw .holo{min-height:300px;height:300px;order:-1}.cw .col.r .slots{justify-content:flex-start}.cw .col.r .grp .gl{flex-direction:row}
 .md{grid-template-columns:1fr;min-height:0}.md .holo{height:380px;min-height:380px}.mdz{flex-direction:row;flex-wrap:wrap}.mdz button{border-left:0;border-bottom:2px solid #3b1418;padding:6px 8px}.dy{grid-template-columns:1fr}.dyl,.dyd{grid-column:1}.hnav .st{display:none}.hview{padding:16px}}
`;document.head.appendChild(css);

// ---------- cuerpo holográfico (SVG generado, mitad derecha reflejada) ----------
const R=[[100,62],[108,62],[110,72],[132,78],[142,90],[146,104],[150,140],[155,176],[160,212],[164,240],[168,258],[164,274],[156,266],[152,244],[146,212],[140,178],[135,146],[131,118],[128,150],[122,182],[130,214],[132,252],[128,300],[124,344],[122,392],[121,412],[130,428],[108,428],[110,410],[108,362],[106,304],[103,254],[100,240]];
const mir=p=>[200-p[0],p[1]];
const outline=()=>{const l=[...R].reverse().map(mir);const pts=[...R,...l];return 'M'+pts.map(p=>p.join(' ')).join(' L')+' Z';};
function bodySVG(extra=''){const o=outline();return `<svg class="body" viewBox="0 -10 200 460">
<defs><linearGradient id="hbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4d5e" stop-opacity=".42"/><stop offset=".6" stop-color="#ff4d5e" stop-opacity=".18"/><stop offset="1" stop-color="#ff4d5e" stop-opacity=".05"/></linearGradient>
<clipPath id="hclip"><path d="${o}"/><ellipse cx="100" cy="36" rx="19" ry="25"/></clipPath>
<linearGradient id="hscan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ef6ff" stop-opacity="0"/><stop offset="1" stop-color="#5ef6ff" stop-opacity=".5"/></linearGradient></defs>
<ellipse cx="100" cy="432" rx="70" ry="10" fill="none" stroke="#ff4d5e" stroke-opacity=".35"/><ellipse cx="100" cy="432" rx="46" ry="6" fill="none" stroke="#5ef6ff" stroke-opacity=".35" stroke-dasharray="4 4"/>
<g fill="url(#hbg)" stroke="#ff7b86" stroke-width=".9"><path d="${o}"/><ellipse cx="100" cy="36" rx="19" ry="25"/></g>
<g clip-path="url(#hclip)" fill="none">
 <g stroke="#ffd0d4" stroke-opacity=".5" stroke-width=".8">
  <path d="M100 66 V236" stroke-dasharray="2 2.5"/>
  ${[0,1,2,3,4,5].map(i=>`<path d="M100 ${92+i*11} Q${118-i} ${88+i*11} ${126-i*1.5} ${102+i*12}"/><path d="M100 ${92+i*11} Q${82+i} ${88+i*11} ${74+i*1.5} ${102+i*12}"/>`).join('')}
  <path d="M80 214 Q100 234 120 214 Q114 238 100 242 Q86 238 80 214 Z"/>
  <path d="M146 108 L156 176 L162 240 M54 108 L44 176 L38 240 M116 250 L114 330 L114 410 M84 250 L86 330 L86 410"/>
  <circle cx="114" cy="332" r="3"/><circle cx="86" cy="332" r="3"/><circle cx="155" cy="177" r="2.5"/><circle cx="45" cy="177" r="2.5"/>
  <path d="M86 30 Q100 14 114 30 Q118 44 108 52 Q100 56 92 52 Q82 44 86 30 Z"/><path d="M90 40 h6 M104 40 h6" stroke="#5ef6ff" stroke-opacity=".9"/>
 </g>
 <g stroke="#5ef6ff" stroke-opacity=".7" stroke-width=".7" class="flow">
  <path d="M106 116 L132 96 L148 140 L156 200 L162 250 M94 116 L68 96 L52 140 L44 200 L38 250 M104 128 L112 230 L118 330 L118 420 M96 128 L88 230 L82 330 L82 420 M100 66 L100 20"/>
 </g>
 <path class="pulse" d="M104 116 q4 -6 8 0 q2 6 -8 13 q-10 -7 -8 -13 q4 -6 8 0 Z" fill="#ff4d5e" stroke="#ffd0d4" stroke-width=".6" transform="translate(-4 0)"/>
 <rect class="scan" x="0" y="0" width="200" height="22" fill="url(#hscan)"/>
</g>
${extra}</svg>`;}

// ---------- habilidades = implantes ----------
const click=id=>()=>{const b=document.getElementById(id);if(b)b.click();};
const on=id=>!!document.getElementById(id)?.classList.contains('act');
const AB=[
 {g:'Lóbulo frontal',side:'l',k:'estudio',n:'Chip de estudio',ty:'Lóbulo frontal · biblioteca',d:'Capri lee tus PDF y apuntes activos y responde con ellos. Abre tu biblioteca para elegir qué estudia.',b:'bStudy'},
 {g:'Lóbulo frontal',side:'l',k:'ingles',n:'Chip de idiomas',ty:'Lóbulo frontal · inglés',d:'Capri se vuelve tu profe de inglés: corrige, platica contigo en inglés y practica estilo TOEFL.',b:'bEng'},
 {g:'Lóbulo frontal',side:'l',k:'saber',n:'Núcleo de certeza',ty:'Lóbulo frontal · libre albedrío',get d(){const i=window.saberInfo?.();return 'En temas de estudio y medicina Capri cita su fuente, marca qué tan segura está y dice «no sé» antes que inventar; si duda, verifica en tus apuntes y fuentes verificadas. Guarda lo verificado, te hace tarjetas de repaso y, cuando no la usas, decide sola qué investigar. Nunca borra, gasta ni cambia tus cosas sin ti.'+(!i?'':' '+i.datos+' nota(s) verificadas · '+i.tarjetas+' tarjeta(s), '+i.hoy+' para hoy · '+i.cola+' por investigar.'+(i.auto?' Estudia sola.':' Estudio autónomo apagado.'));},b:'bSaber'},
 {g:'Lóbulo frontal',side:'l',k:'redac',n:'Corrector de redacción',ty:'Lóbulo frontal · escritura',d:'Mientras Capri mira tu pantalla, revisa lo que estás escribiendo y te dice cómo mejorarlo. También puedes escribirle «revisa mi redacción» (usa lo que ve o lo que copiaste con Ctrl+C).',b:'bRedac'},
 {g:'Sistema ocular',side:'l',k:'mirar',n:'Ópticos Kiroshi',ty:'Sistema ocular · visión',d:'Capri mira tu pantalla y comenta lo que ve. Tú eliges qué ventana compartir.',b:'bWatch'},
 {g:'Sistema nervioso',side:'l',k:'cerebro',n:'Cerebro adaptativo',ty:'Sistema nervioso · tu GPU',get d(){const i=window.cerebroInfo?.();return 'Capri piensa también con tu tarjeta de video (Ollama): la plática rápida, lo que dice sola y lo que pase sin internet o sin cupo lo contesta tu GPU; lo pesado sigue en Gemini. Además aprende: guarda tus pláticas en una memoria buscable y saca datos nuevos de ti.'+(!i?'':!i.ok?' Ahora no encuentro Ollama en tu PC: mira AJUSTES → Cerebro de tu GPU.':' Modelo: '+(i.modelo||'ninguno')+' · '+i.mems+' plática(s) en su memoria buscable.');},b:'bCerebro'},
 {g:'Sistema nervioso',side:'l',k:'claudecpu',n:'Coprocesador Claude',ty:'Sistema nervioso · netrunning',get d(){const i=window.cerebroInfo?.();return 'Un tercer cerebro: Claude, de Anthropic. Cuando lo actives, lo pesado (explicaciones, salud, estudio, imágenes) lo piensa Claude y lo demás sigue en Gemini y tu GPU. Se paga por uso con créditos de console.anthropic.com y respeta un tope de gasto.'+(!i?'':!i.claudeKey?' Instalado y esperando energía: pega tu API key de Anthropic en AJUSTES cuando compres créditos.':' Gastado ~$'+i.gasto.toFixed(2)+' de $'+i.tope+'.');},b:'bClaudeBrain'},
 {g:'Sistema nervioso',side:'l',k:'vida',n:'Núcleo Relic',ty:'Sistema nervioso · vida propia',d:'Capri habla sola de vez en cuando, aunque no le escribas.',b:'bAlive'},
 {g:'Sistema auditivo',side:'r',k:'manos',n:'Implante de manos libres',ty:'Sistema auditivo · escucha',d:'Le hablas y te contesta sin tocar nada; vuelve a escucharte sola.',b:'bHands'},
 {g:'Sistema auditivo',side:'r',k:'voz',n:'Sintetizador de voz',ty:'Sistema auditivo · voz',d:'Capri lee en voz alta lo que te contesta. En AJUSTES → Voz de Gemini puedes probar 30 voces y darle una más natural, con tono según su ánimo.',b:'bVoice'},
 {g:'Sistema operativo',side:'r',k:'claude',n:'Enlace Mi Claude',ty:'Sistema operativo · netrunning',d:'Abre tu Claude para preguntarle directo o pedir segunda opinión de lo que dijo Capri.',b:'bClaude'},
 {g:'Sistema operativo',side:'r',k:'mini',n:'Biochip flotante',ty:'Sistema operativo · mini Capri',d:'Minimiza a Capri a una ventanita flotante que se queda contigo.',b:'bMini'},
 {g:'Brazos',side:'l',k:'brazos',n:'Manos de Capri',ty:'Brazos · actuar en tu PC',get d(){const i=window.manosInfo?.();return 'Capri abre programas, páginas o carpetas, escribe donde hagas clic, guarda y cierra ventanas (guarda antes de cerrar) y puede atrapar tu puntero. Te pide permiso antes de cada acción.'+(i&&!i.pc?' En el navegador solo abre páginas y copia texto.':'')+(i?.aprendido.length?' Ha aprendido '+i.aprendido.length+' cosa(s) de ti: '+i.aprendido.slice(-3).map(a=>a.n).join(', ')+'.':' Enséñale dónde están tus cosas y lo recuerda.');},b:'bManos'},
 {g:'Engrama',side:'r',k:'crimson',n:'Crimson Nightmare',ty:'Engrama · tu eco',get d(){const i=window.crimsonInfo?.();return 'Capri aprende de ti: cómo hablas, lo que te gusta, tus historias, tus consejos y tu gente, con entrevistas suaves. Guardas cápsulas de recuerdos (también con tu voz) y mensajes sellados para tu familia. Todo se queda en tu dispositivo y se respalda en un archivo.'+(!i?'':' Sabe '+i.perfil+' cosa(s) de ti · '+i.caps+' cápsula(s) · '+i.msgs+' mensaje(s).'+(i.learn?' Aprendiendo.':' Aprendizaje en pausa.')+(i.eco?' Modo eco encendido.':' Modo eco bloqueado.'));},b:'bCrimson'},
 {g:'Taller',side:'r',k:'tecnico',n:'Taller técnico',ty:'Taller · informática',get d(){const i=window.tallerInfo?.();return 'El daemon de informática de Capri: aprende a su manera, guardando lo que resuelve como habilidades con sus palabras y lecciones de cada caso. En Capri de escritorio revisa y repara tus memorias USB (no se leen, protegidas contra escritura, sistema de archivos dañado, rescatar archivos, formatear), pidiéndote permiso antes de cada acción.'+(!i?'':' '+i.skills+' habilidad(es), '+i.propias+' suyas · '+i.lecciones+' lección(es).'+(i.on?' Activo.':' Apagado.')+(i.pc?'':' En el navegador solo te guía.'));},b:'bTecnico'},
 {g:'Biomonitor',side:'r',k:'clinica',n:'Expediente de entrenamiento',ty:'Biomonitor · notas clínicas',get d(){const i=window.clinicaInfo?.();return 'Tus pacientes de práctica con seudónimo, su historia clínica y notas (evolución SOAP, urgencias, ingreso, interconsulta, referencia, pre y postoperatoria, egreso) con la estructura de la NOM-004-SSA3-2012. Te marca lo que falta y Capri te revisa como tutora. Todo local y cifrable; no es expediente oficial.'+(!i?'':i.pacs===null?' Bloqueado con tu llave.':' '+i.pacs+' paciente(s) · '+i.notas+' nota(s).'+(i.cifrado?' Cifrado.':' Sin llave.'));},b:'bClinica'},
 {g:'Biomonitor',side:'r',k:'medico',n:'Biomonitor médico',ty:'Biomonitor · reservorio',d:'Capri consulta tus apuntes y fuentes verificadas en temas de salud. Se configura en la sección MÉDICO.',b:'bMed',go:'medico'}];
const icon=k=>k==='clinica'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M6 4 H15 L19 8 V20 H6 Z M15 4 V8 H19"/><path class="a2 k" d="M12.5 10 V17 M9 13.5 H16"/></svg>':k==='saber'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z"/><path class="a2 k" d="M8.5 12 L11 14.5 L15.5 9.5"/></svg>':k==='tecnico'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M9 3 H15 V9 H9 Z M8 9 H16 V17 C16 19 14 21 12 21 C10 21 8 19 8 17 Z"/><path class="a2 k" d="M11 5 V7 M13 5 V7 M12 12 V18 M10 14 L12 12 L14 14"/></svg>':k==='crimson'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M12 20 C6 16 3 12.5 3 9 C3 6 5.2 4 7.6 4 C9.6 4 11 5.2 12 6.6 C13 5.2 14.4 4 16.4 4 C18.8 4 21 6 21 9 C21 12.5 18 16 12 20 Z"/><path class="a2 k" d="M6 11 H9 L10.5 8 L12.5 14 L14 11 H18"/></svg>':k==='claudecpu'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M7 7 H17 V17 H7 Z M10 3 V7 M14 3 V7 M10 17 V21 M14 17 V21 M3 10 H7 M3 14 H7 M17 10 H21 M17 14 H21"/><path class="a2 k" d="M12 9 L15 12 L12 15 L9 12 Z"/></svg>':k==='cerebro'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M12 4 C8 3 5 5 5 8 C3 9 3 13 5 14 C5 17 8 19 12 18 C16 19 19 17 19 14 C21 13 21 9 19 8 C19 5 16 3 12 4 Z M12 4 V18"/><path class="a2 k" d="M8 21 H16 M10 18 V21 M14 18 V21"/></svg>':k==='redac'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M4 20 L5 15 L16 4 L20 8 L9 19 Z M14 6 L18 10"/><path class="a2 k" d="M13 20 H21"/></svg>':k==='brazos'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M7 21 V11 L5 8 V4 M7 11 L9 4 M7 11 L12 3 M7 11 L15 5 M7 11 L17 9"/><path class="a2 k" d="M15 16 H21 M18 13 V19"/></svg>':k==='ingles'?'<svg class="ci" viewBox="0 0 24 24"><path class="k" d="M4 19 L9 5 L14 19 M6 14 H12"/><path class="a2 k" d="M15 12 H21 M18 9 V19"/></svg>':(typeof ico==='function'?ico(k):'');

// ---------- estructura ----------
const VIEWS=[['capri','CAPRI'],['ciberware','CIBERWARE'],['medico','MÉDICO'],['diario','DIARIO']];
const nav=document.createElement('div');nav.className='hnav';
nav.innerHTML=`<div class="st"><span><b id="hvEn">--</b> <small>Energía</small></span><span><b id="hvMo">--</b> <small>Ánimo</small></span></div>
<div class="htabs"><button class="k" id="hPrev" title="Anterior (Q)">Q</button>${VIEWS.map(([k,n])=>`<button class="t" data-v="${k}">${n}</button>`).join('')}<button class="k" id="hNext" title="Siguiente (E)">E</button></div>
<div class="st r"><span><b id="hvRe">--</b><small>/100 Relic</small></span><span><small>Recuerdos</small> <b id="hvMem">0</b></span></div>`;
document.querySelector('.menubar').after(nav);
const desk=document.querySelector('.app .desk');
const mk=(id,html)=>{const v=document.createElement('section');v.className='hview';v.id=id;v.innerHTML=html;desk.appendChild(v);return v;};

// CIBERWARE
const vC=mk('vCiber',`<div class="cw"><div class="cap"><div class="bars" id="cwBars"></div><div class="bars y" id="cwBars2"></div><small>Capacidad de ciberware</small></div>
<div class="col l" id="cwL"></div><div class="holo">${bodySVG()}</div><div class="col r" id="cwR"></div>
<div class="cwd" id="cwD"></div></div>`);
let sel=AB[0];
function groups(side){const gs=[...new Set(AB.filter(a=>a.side===side).map(a=>a.g))];
  return gs.map(g=>`<div class="grp"><div class="gl">${g}</div><div class="slots">${AB.filter(a=>a.g===g).map(a=>{const i=AB.indexOf(a);return `<div class="slot${on(a.b)?' on':''}${a===sel?' sel':''}" data-i="${i}" title="${a.n}">${icon(a.k)}<b>${String(i+1).padStart(2,'0')}</b></div>`;}).join('')}</div></div>`).join('');}
function renderC(){if(!vC.classList.contains('on'))return;
  vC.querySelector('#cwL').innerHTML=groups('l');vC.querySelector('#cwR').innerHTML=groups('r');
  const n=AB.filter(a=>on(a.b)).length;vC.querySelector('#cwBars').innerHTML=Array.from({length:18},(_,i)=>`<i class="${i<n*2?'on':''}"></i>`).join('');
  vC.querySelector('#cwBars2').innerHTML=Array.from({length:18},(_,i)=>`<i class="${i<Math.round(num('relic')/100*18)?'on':''}"></i>`).join('');
  const a=sel,act=on(a.b),toggles=!['bClaude','bMini','bMed','bCrimson','bTecnico','bClinica','bSaber'].includes(a.b);
  vC.querySelector('#cwD').innerHTML=`<div class="slot on" style="pointer-events:none">${icon(a.k)}</div><div><div class="ty">${a.ty}</div><div class="nm">${a.n}</div><p>${a.d}</p></div><span class="sp"></span>
   <button class="hbtn ${act?'on':''}" id="cwGo">${a.go?'Ir a médico':toggles?(act?'Desactivar':'Activar'):'Abrir'}</button>`;
  vC.querySelector('#cwGo').onclick=()=>{if(a.go)return go(a.go);if(['bClaude','bMini','bEng','bStudy','bCrimson','bTecnico','bClinica','bSaber'].includes(a.b)&&!act)go('capri',true);click(a.b)();setTimeout(renderC,250);};}
vC.addEventListener('click',e=>{const s=e.target.closest('.slot[data-i]');if(!s)return;const a=AB[+s.dataset.i];if(sel===a&&!['bClaude','bMini','bMed','bEng','bStudy','bCrimson','bTecnico','bClinica','bSaber'].includes(a.b)){click(a.b)();setTimeout(renderC,250);}sel=a;renderC();});

// MÉDICO
const ZONES=[['nervioso','Sistema nervioso',100,30,'cerebro, médula, nervios, sueño, dolor de cabeza'],['respiratorio','Sistema respiratorio',84,112,'pulmones, vías aéreas, tos, asma'],
 ['circulatorio','Sistema circulatorio',112,118,'corazón, presión, venas y arterias, sangre'],['digestivo','Sistema digestivo',106,170,'estómago, hígado, vesícula, intestino, apéndice'],
 ['urinario','Sistema renal',88,190,'riñones, vejiga, vías urinarias'],['endocrino','Sistema endocrino',100,72,'tiroides, hormonas, glucosa, páncreas'],
 ['musculo','Músculos y huesos',152,204,'huesos, articulaciones, columna, fracturas'],['inmune','Sistema inmune',50,150,'defensas, infecciones, alergias, ganglios'],
 ['piel','Piel',120,300,'piel, heridas, suturas, quemaduras'],['repro','Sistema reproductor',100,232,'embarazo, ginecología, salud sexual']];
// palabras (raíces sin acentos) que dicen a qué parte del cuerpo pertenece un material o una pregunta
const LEX={nervioso:'cerebr neuro nervi encefal medula crane epileps convuls migran cefalea ictus derrame demencia alzheimer parkinson meninge sinap neurona glasgow',
 respiratorio:'pulmon bronq traque alveol respirat asma epoc neumon torax toracotom pleura laring intubac ventilac disnea oxigen espirometr',
 circulatorio:'corazon cardi arteri vena venos vascular aort coronar infart hipertens sangre hemorrag bypass valvul arritm marcapas anemia trombo embol choque transfus',
 digestivo:'estomag gastr intestin colon hepat higado vesicul colecist apendic pancreat esofag duoden recto hernia laparoscop laparotom digest biliar cirrosis endoscop periton',
 urinario:'rinon renal nefr vejiga urinar uretr prostat cistit dialisis litiasis sonda',
 endocrino:'tiroid hormon insulin diabet glucos endocrin suprarrenal hipofis cortisol metabol obesid',
 musculo:'hueso oseo fractur articul muscul tendon ligament columna ortoped traumat rodilla cadera femur tibia humero artros osteo esquelet vertebr yeso ferula',
 inmune:'inmun linf bazo anticuerp vacun alergi infecc antibiot sepsis vih leucocit autoinmun inflamac',
 piel:'piel derm herida sutur quemad cicatriz incision injerto colgajo apósito aposito curacion',
 repro:'utero ovari embaraz obstetr ginec parto cesarea mama testic menstru placent fetal gestac anticoncep'};
const LEXR=Object.fromEntries(Object.entries(LEX).map(([k,v])=>[k,new RegExp('\\b('+v.split(' ').join('|')+')','g')]));
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function sistemas(text){const t=norm(text).slice(0,400000),out={};let tot=0;for(const [k,re] of Object.entries(LEXR)){const n=(t.match(re)||[]).length;if(n){out[k]=n;tot+=n;}}
  return Object.entries(out).filter(([,n])=>n>=2&&n/tot>=.12).sort((a,b)=>b[1]-a[1]).map(([k])=>k);}
const ZN=k=>ZONES.find(z=>z[0]===k);
let zs=null,mats=[];
const vM=mk('vMed',`<div class="md"><div class="mdz"><div class="sub">Zonas</div><button data-k="">Vista general</button>${ZONES.map(([k,n])=>`<button data-k="${k}">${n.replace('Sistema ','')}<b data-n="${k}"></b></button>`).join('')}</div>
<div class="holo" id="mdHolo">${bodySVG(ZONES.map(([k,n,x,y],i)=>`<g class="zone" data-z="${i}"><circle class="h" cx="${x}" cy="${y}" r="7"/><circle cx="${x}" cy="${y}" r="2" fill="#5ef6ff"/><line x1="${x+(x<100?-8:8)}" y1="${y}" x2="${x<100?6:194}" y2="${y}" stroke="#5ef6ff" stroke-opacity=".35" stroke-width=".6"/><text x="${x<100?6:194}" y="${y-3}" text-anchor="${x<100?'start':'end'}">${n.replace('Sistema ','').toUpperCase()}</text></g>`).join(''))}</div>
<div class="mdp"><div class="box"><div class="sub">Biomonitor // módulo médico</div><div class="row" style="margin-top:8px"><button class="hbtn" id="mdOn">Módulo médico</button><button class="hbtn c" id="mdOnl">MedlinePlus + PubMed</button><button class="hbtn c" id="mdLib">Mis apuntes</button><button class="hbtn c" id="mdCli">Notas clínicas</button></div>
 <div class="st" id="mdSt" style="margin-top:10px"></div></div>
<div class="box"><div class="sub">Zona seleccionada</div><div class="sys" id="mdSys">Cuerpo completo</div><div class="st" id="mdDesc">Toca un órgano o elige una zona. Tus materiales se acomodan solos en la parte del cuerpo de la que hablan.</div>
 <div class="mats" id="mdMats"></div><div class="q" id="mdQ"></div>
 <div class="in"><span>&gt;_</span><input id="mdIn" placeholder="consulta o tema para estudiar…" autocomplete="off"></div></div>
<div class="warn">Modelo estilizado, no a escala anatómica exacta. Info educativa con fuentes; no sustituye la consulta con tu médico. Si es urgencia: 911.</div></div></div>`);
const medCk=id=>document.getElementById(id);
function renderM(){if(!vM.classList.contains('on'))return;const a=medCk('medOn'),b=medCk('medOnline');
  vM.querySelector('#mdOn').classList.toggle('on',!!a?.checked);vM.querySelector('#mdOn').textContent='Módulo médico: '+(a?.checked?'activo':'apagado');
  vM.querySelector('#mdOnl').classList.toggle('on',!!b?.checked);
  vM.querySelector('#mdSt').innerHTML=`Materiales cargados: <b>${mats.length}</b>${a?.checked?'':' · actívalo para que Capri cite tus fuentes'}`;
  vM.querySelectorAll('.zone').forEach((g,i)=>g.classList.toggle('sel',zs===ZONES[i][0]));
  vM.querySelectorAll('.mdz button').forEach(b=>b.classList.toggle('on',(b.dataset.k||null)===zs));
  const cnt=counts();vM.querySelectorAll('.mdz b[data-n]').forEach(b=>{const n=cnt[b.dataset.n]||0;b.textContent=n||'';});
  const here=zs?mats.filter(m=>m.sis.includes(zs)):mats;
  vM.querySelector('#mdMats').innerHTML=here.length?`<div class="sub" style="margin-top:10px">${zs?'Tus materiales de esta zona':'Todos tus materiales'}</div>`+here.slice(0,12).map(m=>`<div class="mat"><span>${esc(m.name)}</span><em>${m.sis.map(k=>ZN(k)[1].replace('Sistema ','')).join(' · ')||'general'}</em></div>`).join(''):(zs?'<div class="st" style="margin-top:8px">Aún no tienes materiales de esta zona.</div>':'');}
function counts(){const c={};for(const m of mats)for(const k of m.sis)c[k]=(c[k]||0)+1;return c;}
function zone(k,fromHolo){zs=k||null;const z=zs&&ZN(zs);
  vM.querySelector('#mdSys').textContent=z?z[1]:'Cuerpo completo';vM.querySelector('#mdDesc').textContent=z?z[4]:'Toca un órgano o elige una zona. Tus materiales se acomodan solos en la parte del cuerpo de la que hablan.';
  const n=z&&z[1].toLowerCase();
  const qs=z?[`Explícame cómo funciona el ${n}, como para estudiar.`,`¿Qué señales de alarma del ${n} deben llevarme a urgencias?`,`Hazme 5 preguntas de examen sobre el ${n}${mats.some(m=>m.sis.includes(zs))?', usando mis apuntes':''}.`,`Tengo una molestia relacionada con el ${n}: `]:[];
  vM.querySelector('#mdQ').innerHTML=qs.map((q,i)=>`<button data-q="${i}">${q}</button>`).join('');
  vM.querySelectorAll('#mdQ button').forEach(b=>b.onclick=()=>{const q=qs[+b.dataset.q];if(q.endsWith(': ')){const i=vM.querySelector('#mdIn');i.value=q;i.focus();}else ask(q);});
  if(!fromHolo)window.Holo3D?.select(zs);renderM();}
const flip=id=>{const c=medCk(id);if(!c)return;c.checked=!c.checked;c.dispatchEvent(new Event('change'));renderM();};
vM.querySelector('#mdOn').onclick=()=>flip('medOn');vM.querySelector('#mdOnl').onclick=()=>flip('medOnline');
vM.querySelector('#mdLib').onclick=()=>medCk('bMed')?.click();
vM.querySelector('#mdCli').onclick=()=>window.openClinica?.();
function ask(t){if(!t.trim())return;const c=medCk('medOn');if(c&&!c.checked)flip('medOn');go('capri',true);setTimeout(()=>send(t),380);}
vM.addEventListener('click',e=>{const b=e.target.closest('.mdz button');if(b)return zone(b.dataset.k);const g=e.target.closest('.zone');if(g)zone(ZONES[+g.dataset.z][0]);});
// el cuerpo 3D sustituye al dibujo plano cuando la compu soporta WebGL
function mount3D(){const H=window.Holo3D;if(!H)return;
  if(vM.classList.contains('on')&&!vM.querySelector('#mdHolo canvas')){if(H.attach(vM.querySelector('#mdHolo'),'medico')){H.onPick(k=>zone(k,true));H.setCounts(counts());H.select(zs);}}
  if(vC.classList.contains('on')&&!vC.querySelector('.holo canvas'))H.attach(vC.querySelector('.holo'),'ciber');}
addEventListener('holo3d:ready',mount3D);
// materiales: cada uno se acomoda en el sistema del que habla; los nuevos te avisan a dónde fueron
let firstMat=store.get('matSeen',null)===null;let seenMat=new Set(store.get('matSeen',[]));
async function loadMats(){const T=window.medTextos?.();if(!T)return;mats=T.map(m=>({id:m.id,name:m.name,sis:sistemas(m.name+' '+m.text)}));
  window.Holo3D?.setCounts(counts());const nuevos=mats.filter(m=>!seenMat.has(m.id));
  if(nuevos.length&&!firstMat){for(const m of nuevos){const k=m.sis[0];
      const d=line('s med','📍 «'+m.name+'» '+(k?'va a '+ZN(k)[1]+(m.sis.length>1?' (también '+m.sis.slice(1).map(x=>ZN(x)[1].replace('Sistema ','')).join(', ')+')':'')+' — toca aquí para verlo en el cuerpo':'quedó como material general'));
      if(k){d.style.cursor='pointer';d.onclick=()=>{go('medico');setTimeout(()=>zone(k),900);};}
      if(k&&cur==='medico'){zone(k);window.Holo3D?.pulse(k);}}}
  mats.forEach(m=>seenMat.add(m.id));store.set('matSeen',[...seenMat]);firstMat=false;renderM();}
addEventListener('med:libros',loadMats);setTimeout(loadMats,1500);
// cuando preguntas algo de salud, se ilumina dónde ocurre
addEventListener('med:pregunta',e=>{const k=sistemas(e.detail||'')[0];if(!k)return;window.Holo3D?.pulse(k,6000);
  const d=line('s med','📍 esto pasa en: '+ZN(k)[1]+' — ver en el holograma');d.style.cursor='pointer';d.onclick=()=>{go('medico');setTimeout(()=>zone(k),900);};});
vM.querySelector('#mdIn').addEventListener('keydown',e=>{if(e.key==='Enter'){ask(e.target.value);e.target.value='';}});

// DIARIO
const vD=mk('vDiario',`<div class="dy"><div class="idc" id="dyMe"></div><div class="idc" id="dyCap"></div>
<div class="dyl" id="dyL"></div><div class="dyd" id="dyD"></div></div>`);
let cat='all',dsel=null;
function renderD(){if(!vD.classList.contains('on'))return;M();const name=cfg.name||'Kiga',hs=mem.hechos,by=c=>hs.filter(h=>h.c===c);
  const a=animoNow(),frags=(store.get('frags',[])||[]).length;
  vD.querySelector('#dyMe').innerHTML=`<div class="ph"><span class="ini">${name[0].toUpperCase()}</span></div><div style="flex:1;min-width:0"><div class="tt">Identification card</div>
   <dl><dt>Nombre</dt><dd>${esc(name)}</dd><dt>Gustos</dt><dd>${by('gusto').length?esc(by('gusto').slice(-3).map(h=>h.t).join(' · ')):'sin datos'}</dd><dt>Personas</dt><dd>${by('persona').length}</dd><dt>Escuela</dt><dd>${by('escuela').length?esc(by('escuela').at(-1).t):'sin datos'}</dd><dt>Conocidos</dt><dd>hace ${ago(Date.now()-mem.desde)}</dd></dl></div>`;
  vD.querySelector('#dyCap').innerHTML=`<div class="ph"><img src="assets/pet/sentada_mira.png" alt=""></div><div style="flex:1;min-width:0"><div class="tt">C-P profile // constructo</div>
   <dl><dt>Designación</dt><dd>CAPRI · Proyecto Capricornio</dd><dt>Núcleo</dt><dd>chip Relic · ${num('relic')}% integridad</dd><dt>Ánimo</dt><dd>${a?esc(a.n)+' '+Math.round(a.i)+'/10':'estable'}</dd><dt>Fragmentos</dt><dd>${frags} contenidos</dd><dt>Lealtad</dt><dd>${esc(name)}</dd></dl></div>`;
  const cats=Object.keys(MEMCATS).filter(c=>by(c).length),list=(cat==='all'?hs:by(cat)).slice().reverse();
  vD.querySelector('#dyL').innerHTML=`<div class="cnt"><button data-c="all" class="${cat==='all'?'on':''}">TODO ${hs.length}</button>${cats.map(c=>`<button data-c="${c}" class="${cat===c?'on':''}">${MEMCATS[c].toUpperCase()} ${by(c).length}</button>`).join('')}</div>
   ${list.length?list.map(h=>`<div class="qi${h===dsel?' sel':''}" data-t="${hs.indexOf(h)}"><span class="ex">!</span><div><b>${esc(MEMCATS[h.c]||h.c)}</b><span>${esc(h.t)}</span></div><em>${new Date(h.ts).toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</em></div>`).join(''):`<div class="qi"><span class="ex">?</span><div><b>Sin recuerdos</b><span>Platica con Capri y ella irá guardando lo importante.</span></div></div>`}`;
  const h=dsel&&hs.includes(dsel)?dsel:list[0];
  vD.querySelector('#dyD').innerHTML=h?`<div class="tl">${esc(MEMCATS[h.c]||h.c)}</div><div class="bx">${esc(h.t)}</div><p>Guardado el ${new Date(h.ts).toLocaleString('es-MX',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}.</p>
   <div class="row" style="display:flex;gap:10px"><button class="hbtn c" id="dyAsk">Platicar de esto</button><button class="hbtn" id="dyDel">Olvidar</button></div>`:`<div class="tl">Diario</div><p>Aquí aparece lo que Capri sabe de ti.</p>`;
  if(h){vD.querySelector('#dyAsk').onclick=()=>{go('capri',true);setTimeout(()=>send('¿Te acuerdas de esto? '+h.t),380);};
    vD.querySelector('#dyDel').onclick=()=>{if(!confirm('¿Que Capri olvide esto?\n'+h.t))return;mem.hechos=mem.hechos.filter(x=>x!==h);store.set('mem',mem);dsel=null;renderD();stats();};}}
vD.addEventListener('click',e=>{const c=e.target.closest('[data-c]');if(c){cat=c.dataset.c;renderD();return;}const q=e.target.closest('.qi[data-t]');if(q){dsel=mem.hechos[+q.dataset.t];renderD();}});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------- barra de estado ----------
function num(k){const b=document.querySelector(`.mt[data-k="${k}"] b`);if(b)return +b.textContent||0;if(k==='en')return +(document.querySelector('#gEn b, #gEn text')?.textContent)||0;return 0;}
function stats(){const en=document.querySelector('#gEn')?.textContent.match(/\d+/);nav.querySelector('#hvEn').textContent=en?en[0]:'--';
  nav.querySelector('#hvMo').textContent=num('mood');nav.querySelector('#hvRe').textContent=num('relic');nav.querySelector('#hvMem').textContent=M().hechos.length;}
setInterval(stats,2000);setTimeout(stats,600);

// ---------- transiciones ----------
const fx=document.createElement('canvas');fx.id='hfx';document.body.appendChild(fx);
function streaks(ms=420){const W=fx.width=innerWidth/3|0,H=fx.height=innerHeight/3|0,c=fx.getContext('2d');fx.style.display='block';fx.style.width='100%';fx.style.height='100%';
  const cols=['#ff4d5e','#5ef6ff','#ffffff','#d6266b','#1f6f8b','#f3c84b','#2a0d11'],t0=performance.now();
  (function f(t){const k=(t-t0)/ms;if(k>=1){fx.style.display='none';return;}c.clearRect(0,0,W,H);const a=k<.5?k*2:2-k*2;
    for(let i=0;i<W*.6*a;i++){const x=Math.random()*W,w=Math.random()*3+1,y=Math.random()*H*.3;c.globalAlpha=Math.random()*.8*a;c.fillStyle=cols[Math.random()*cols.length|0];c.fillRect(x,y-H*.2,w,H*1.4);}
    c.globalAlpha=a*.6;c.fillStyle='#050203';c.fillRect(0,0,W,H*.04*(1-a));requestAnimationFrame(f);})(t0);}
const conn=document.createElement('div');conn.id='hconn';document.body.appendChild(conn);
function connect(label){return new Promise(res=>{const W=1000,H=600,n=26,ps=Array.from({length:n},()=>[Math.random()*W,Math.random()*H]);
  const ls=ps.map((p,i)=>{const j=(i*7+3)%n;return `<line x1="${p[0]}" y1="${p[1]}" x2="${ps[j][0]}" y2="${ps[j][1]}" stroke="${i%5?'#3a3436':'#ff4d5e'}" stroke-width="${i%5?.8:1.2}"/>`;}).join('');
  const cs=ps.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${i%4?3:7}" fill="none" stroke="${i%6?'#6b6466':'#ff4d5e'}"/><circle cx="${p[0]}" cy="${p[1]}" r="1.6" fill="${i%6?'#ccc':'#ff4d5e'}"/>`+(i%3?'':`<text x="${p[0]+10}" y="${p[1]+4}" fill="#5a5456" font-size="9" font-family="monospace">${(Math.random()*99).toFixed(2).replace('.',' ')}</text>`)).join('');
  conn.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><circle cx="500" cy="300" r="230" fill="none" stroke="#2a2526" stroke-dasharray="6 6"/><circle cx="500" cy="300" r="150" fill="none" stroke="#2a2526"/>${ls}${cs}</svg>
   <div class="c"><small>GRAPH LAND FORM</small><h2>/ - ${label} - /</h2><div class="ld"><span>LOADING</span><i><b></b></i><em>0</em></div></div>`;
  conn.classList.add('on');const b=conn.querySelector('.ld b'),em=conn.querySelector('.ld em'),t0=performance.now(),D=750;
  (function f(t){const k=Math.min(1,(t-t0)/D);b.style.width=k*100+'%';em.textContent=Math.round(k*100);if(k<1)requestAnimationFrame(f);else setTimeout(()=>{conn.classList.remove('on');res();},120);})(t0);
  conn.onclick=()=>{conn.classList.remove('on');res();};});}

// ---------- navegación ----------
const seen=new Set(['capri']);let cur='capri';
async function go(v,quick){if(v===cur)return;const name=VIEWS.find(x=>x[0]===v)[1];
  if(!seen.has(v)&&!quick){seen.add(v);await connect('CONNECT // '+name);}
  streaks(quick?300:420);cur=v;document.body.dataset.view=v;
  nav.querySelectorAll('.t').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  document.querySelectorAll('.hview').forEach(s=>s.classList.toggle('on',s.id==={ciberware:'vCiber',medico:'vMed',diario:'vDiario'}[v]));
  renderC();renderM();renderD();stats();mount3D();if(v==='capri')setTimeout(()=>document.getElementById('q')?.focus(),50);}
window.hudGo=go;
nav.querySelectorAll('.t').forEach(b=>b.onclick=()=>go(b.dataset.v));
const step=d=>{const i=VIEWS.findIndex(x=>x[0]===cur);go(VIEWS[(i+d+VIEWS.length)%VIEWS.length][0]);};
nav.querySelector('#hPrev').onclick=()=>step(-1);nav.querySelector('#hNext').onclick=()=>step(1);
addEventListener('keydown',e=>{const t=e.target;if(t.matches?.('input,textarea,select,[contenteditable]')||e.ctrlKey||e.altKey||e.metaKey)return;if(document.querySelector('.modal.show'))return;
  if(e.key==='q'||e.key==='Q')step(-1);else if(e.key==='e'||e.key==='E')step(1);else if(e.key==='Escape'&&cur!=='capri')go('capri');
  else if(/^[1-4]$/.test(e.key))go(VIEWS[+e.key-1][0]);});
document.body.dataset.view='capri';nav.querySelector('.t').classList.add('on');
new MutationObserver(()=>{renderC();}).observe(document.querySelector('.dock'),{attributes:true,subtree:true,attributeFilter:['class']});
})();
