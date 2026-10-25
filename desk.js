// ================= CAPRI DE ESCRITORIO =================
// En la app de escritorio (?desk=1) la Capri pixel vive encima de tu pantalla: ronda, se teletransporta
// con glitch, se asoma por los bordes, se cae, se sienta encima de tus ventanas (Windows), las posee un
// momento y se guarda en su biochip con Ctrl+Alt+C. La cabeza es la de index.html: al tocarla se abre
// su globo para hablarle, y cuando contesta el globo sale junto a ella.
// Comportamientos inspirados en capri-desktop (https://github.com/mochiiwuff/capri-desktop, MIT).
(function(){
if(!DESK)return;
const D=window.capriDesk||{},PET='assets/pet/',H=()=>innerHeight,W=()=>innerWidth;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const POSES=['apoyada','asomada','bostezo','confundida','cursor','enamorada','laptop','meditar','pelota','risa_brazos','sentada_mira','sentada_pierna','voltereta'];
const FLOOR_IDLE=['apoyada','meditar','enamorada','laptop','pelota','sentada_mira','sentada_pierna'];
const SEAT_IDLE=['sentada_pierna','sentada_mira','bostezo'];
// cuánto de la imagen queda bajo la orilla donde se apoya (piernas colgando, la repisa de "asomada")
const SINK={sentada_pierna:.1,sentada_mira:.1,bostezo:.04,asomada:.22,meditar:-.06};
const SIZE={s:.55,m:.75,l:1};
const TAG={DORMANT:'ONLINE',LISTENING:'ESCUCHANDO',THINKING:'PENSANDO',TALKING:'HABLANDO'};
const SAY={
 hola:['¿Damos un paseo?','¡Vamos a divertirnos un rato!','capri.exe en tu escritorio~','llegué. ¿me extrañaste?'],
 cae:['¡¡waaah!!','¿quién quitó el piso?','auch… mis engramas','¡aterrizaje perfecto! …casi'],
 sienta:['buena vista desde aquí','esta ventana es mía ahora','no la cierres, ¿eh?','me quedo un rato aquí arriba'],
 asoma:['…','te estoy viendo~','¿qué haces?','psst'],
 susto:['¡ay! me viste','¡no tan cerca!','me voy >:)'],
 cursor:['te robo el cursor >:)','¡zap!','mío, mío, mío','este cursor ya es de Arasaka… digo, mío'],
 posee:['déjame entrar…','esta ventana ahora tiene mis ojos','Soulkiller, versión mini','je je je'],
 duerme:['zzz…','cinco minutitos más…','soñando con una estrella distante'],
 despierta:['¡estoy despierta! …lo juro','¿eh? ¿quién?','ya, ya, aquí sigo'],
 toque:['jeje~ eso se siente bonito','¡oye! jajaja','¿¿qué haces??','<3'],
 harta:['ya, ya, deja de picarme >:(','¡basta! me voy','¿quieres pelea, choom?'],
 suelta:['¡wiii!','oye, ¿a dónde me llevas?','bájame~','así está mejor'],
 truco:['¡mira esto!','ta-dá~','las otras mentes también quieren salir'],
};

// ---------- estilos ----------
const css=document.createElement('style');css.textContent=`
#dpet{position:fixed;left:0;top:0;z-index:75;display:none;pointer-events:none;will-change:transform}
body.desk #dpet{display:block}body.desk.dstow #dpet{display:none}
body.desk.dpet #mini.star{display:none}body.desk.dpet.dstow #mini.star{display:flex}
#dpet .dfig{position:relative;transform-origin:50% 100%}
#dpet img{display:block;width:100%;height:100%;image-rendering:pixelated;-webkit-user-drag:none;user-select:none;
 filter:drop-shadow(3px 3px 0 #000) drop-shadow(0 0 10px rgba(255,31,85,.45));transition:filter .3s}
#dpet.zz img{filter:drop-shadow(3px 3px 0 #000) saturate(.55) brightness(.8)}
#dpet.zz .dfig{animation:dbr 3.6s ease-in-out infinite}@keyframes dbr{50%{transform:scaleY(.97)}}
#dpet.float .dfig{animation:dfl 2.8s ease-in-out infinite}@keyframes dfl{50%{transform:translateY(-9px)}}
#dpet.walk .dfig{animation:dwk .34s steps(2) infinite}@keyframes dwk{50%{transform:translateY(-6px) rotate(-3deg)}}
#dpet .dtag{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);font:700 10px/1 var(--mono);letter-spacing:.12em;
 color:var(--fc,#ff1f55);background:rgba(0,0,0,.78);border:1px solid var(--fc,#ff1f55);padding:4px 7px;white-space:nowrap;opacity:0;transition:opacity .25s}
#dpet.tagon .dtag{opacity:1}
#dpet .dsay{position:absolute;left:50%;bottom:calc(100% + 30px);transform:translateX(-50%);max-width:230px;width:max-content;background:#000;
 border:1px solid var(--fc,#ff1f55);color:var(--ink,#fff);font:12px/1.4 var(--mono);padding:6px 9px;text-align:center;opacity:0;transition:opacity .2s}
#dpet .dsay.show{opacity:1}
body[data-core=LISTENING] #dpet{--fc:var(--cyan)}body[data-core=THINKING] #dpet{--fc:var(--yel)}body[data-core=TALKING] #dpet{--fc:var(--cyan)}
.dfx{position:fixed;inset:0;z-index:74;pointer-events:none;overflow:hidden;display:none}body.desk .dfx{display:block}
.dfx i{position:absolute;width:6px;height:6px;background:#ff1f55;box-shadow:0 0 6px #ff1f55}
.dfx i.g{background:#2dff8f;box-shadow:0 0 6px #2dff8f}
.dfx .dline{position:absolute;width:3px;background:#ff1f55;box-shadow:0 0 12px #ff1f55,0 0 30px #ff1f55}
.dfx .dpos{position:absolute;border:2px solid #ff1f55;box-shadow:0 0 18px #ff1f55,inset 0 0 40px rgba(255,31,85,.35);
 background:repeating-linear-gradient(0deg,rgba(255,31,85,.08) 0 2px,transparent 2px 5px);animation:dpz .12s steps(2) infinite}
.dfx .dpos b{position:absolute;left:8px;top:6px;font:700 11px/1 var(--mono);letter-spacing:.14em;color:#fff;background:#ff1f55;padding:3px 6px}
.dfx .dpos u{position:absolute;text-decoration:none;font:700 26px/1 var(--mono);color:#2dff8f;text-shadow:0 0 10px #2dff8f}
@keyframes dpz{50%{border-color:#2dff8f;transform:translateX(2px)}}
.dfx svg{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible}
.dfx .ghost{position:absolute;image-rendering:pixelated;opacity:.7}`;
document.head.appendChild(css);

// ---------- piezas ----------
const el=document.createElement('div');el.id='dpet';
el.innerHTML='<div class="dsay"></div><div class="dtag">CAPRI // ONLINE</div><div class="dfig"><img alt="Capri" draggable="false"></div>';
const fx=document.createElement('div');fx.className='dfx';
document.body.append(fx,el);
const fig=el.querySelector('.dfig'),im=el.querySelector('img'),tagEl=el.querySelector('.dtag'),sayEl=el.querySelector('.dsay');

// cada pose en un canvas para saber, pixel por pixel, si el ratón está sobre ella
const IMG={},ALPHA={};
POSES.forEach(n=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;
  const x=c.getContext('2d');x.drawImage(i,0,0);try{ALPHA[n]=x.getImageData(0,0,c.width,c.height);}catch(e){}};i.src=PET+n+'.png';IMG[n]=i;});

// ---------- estado ----------
const S={x:0,y:0,vy:0,pose:'meditar',face:1,stance:'floor',seat:null,scale:.75,busy:false,asleep:false,stowed:false,
  started:false,drag:null,mx:-1,my:-1,next:0,pokes:0,pokeT:0,lastBox:'',nearT:0};
let dcfg={size:'m',wander:true,sit:true,possess:true,stowed:false},wins=[];
const box=()=>{const i=IMG[S.pose],w=(i.naturalWidth||180)*S.scale,h=(i.naturalHeight||200)*S.scale;
  const sink=S.stance==='peekB'?.42:(SINK[S.pose]||0);return {w,h,l:S.x-w/2,t:S.y-h+h*sink};};
const quiet=()=>(document.body.dataset.core||'DORMANT')==='DORMANT'&&!busy&&!recording&&!isSpeaking()&&miniEl.classList.contains('star');

function pose(n){if(!IMG[n])return;S.pose=n;im.src=PET+n+'.png';}
function tag(t){tagEl.textContent='CAPRI // '+t;el.classList.add('tagon');clearTimeout(tag.t);tag.t=setTimeout(()=>el.classList.remove('tagon'),3200);}
function say(list,ms){const t=Array.isArray(list)?pick(list):list;sayEl.textContent=t;sayEl.classList.add('show');clearTimeout(say.t);
  say.t=setTimeout(()=>sayEl.classList.remove('show'),ms||2800);}
function draw(){const b=box(),k=S.lastBox,rot=S.stance==='peekL'?90:S.stance==='peekR'?-90:0;
  let l=b.l,t=b.t;if(rot){t=S.y-b.h/2;l=S.stance==='peekL'?-b.w*.5:W()-b.w*.5;}
  const sig=[l|0,t|0,b.w|0,rot,S.face].join();if(sig===k)return;S.lastBox=sig;
  el.style.width=b.w+'px';el.style.height=b.h+'px';el.style.transform=`translate(${l}px,${t}px) rotate(${rot}deg)`;
  im.style.transform=S.face<0?'scaleX(-1)':'';follow();}

// el globo de chat sale junto a su cabeza, del lado con más espacio
function follow(){if(!el.isConnected||miniEl.classList.contains('star')||S.stowed)return;const b=box(),r=miniEl.getBoundingClientRect();
  const left=S.x>W()/2?b.l-r.width-12:b.l+b.w+12;placeMini(left,b.t+b.h*.25-r.height/2,0);fitMini();}

// ---------- tus ventanas ----------
const covered=(i,x,y)=>wins.slice(0,i).some(w=>x>=w.x&&x<=w.x+w.w&&y>=w.y&&y<=w.y+w.h);
function seats(){if(!dcfg.sit)return[];return wins.map((w,i)=>({w,i})).filter(({w,i})=>!w.max&&w.w>=260&&w.y>90&&w.y<H()-120&&!covered(i,w.x+w.w/2,w.y+2));}
function pickSeat(){const s=seats();if(!s.length)return null;const {w}=pick(s);return {id:w.id,dx:rnd(.2,.8)*w.w};}
function winOf(seat){const i=wins.findIndex(w=>w.id===seat.id);return i<0?null:{w:wins[i],i};}

// ---------- moverse ----------
function land(at,seat){S.stance=seat?'seat':'floor';S.seat=seat||null;S.vy=0;S.y=at;
  fig.animate([{transform:'scale(1.3,.65)'},{transform:'scale(.92,1.08)'},{transform:'scale(1,1)'}],{duration:380,easing:'ease-out'});
  shards(S.x,S.y,14);pose(seat?pick(SEAT_IDLE):'risa_brazos');if(Math.random()<.5)say(seat?SAY.sienta:SAY.cae);
  setTimeout(()=>{if(S.stance!=='air'&&!S.drag&&!S.busy)idle();},1500);}
function fall(){if(S.stance==='air')return;S.stance='air';S.seat=null;S.vy=-120;S.asleep=false;pose('confundida');el.classList.remove('float','walk','zz');}
function shards(x,y,n){for(let k=0;k<n;k++){const s=document.createElement('i');if(k%3===0)s.className='g';fx.appendChild(s);
  s.style.left=x+'px';s.style.top=(y-6)+'px';const dx=rnd(-120,120),dy=rnd(-110,-20);
  s.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${rnd(-300,300)}deg)`,opacity:.9,offset:.6},
    {transform:`translate(${dx*1.3}px,${dy+90}px)`,opacity:0}],{duration:rnd(600,950),easing:'cubic-bezier(.2,.7,.4,1)'}).onfinish=()=>s.remove();}}

async function glitchOut(){const b=box();const l=document.createElement('div');l.className='dline';fx.appendChild(l);
  l.style.left=S.x+'px';l.style.top=b.t+'px';l.style.height=b.h+'px';
  await fig.animate([{transform:'scale(1,1)',filter:'none'},{transform:'scale(1.15,.9) translateX(6px)',filter:'drop-shadow(-8px 0 #ff1f55) drop-shadow(8px 0 #22e5f0)',offset:.3},
    {transform:'scale(.04,1.2)',filter:'brightness(3) drop-shadow(0 0 12px #ff1f55)',opacity:1,offset:.75},{transform:'scale(0,1.3)',opacity:0}],{duration:420,easing:'steps(6)'}).finished;
  l.animate([{opacity:1,transform:'scaleY(1)'},{opacity:0,transform:'scaleY(.05)'}],{duration:260}).onfinish=()=>l.remove();fig.style.opacity=0;}
async function glitchIn(){fig.style.opacity=1;const b=box();const l=document.createElement('div');l.className='dline';fx.appendChild(l);
  l.style.left=S.x+'px';l.style.top=b.t+'px';l.style.height=b.h+'px';
  l.animate([{opacity:0,transform:'scaleY(.05)'},{opacity:1,transform:'scaleY(1)'},{opacity:0}],{duration:300}).onfinish=()=>l.remove();
  await fig.animate([{transform:'scale(0,1.3)',opacity:0},{transform:'scale(.05,1.2)',filter:'brightness(3)',opacity:1,offset:.3},
    {transform:'scale(1.12,.94) translateX(-5px)',filter:'drop-shadow(8px 0 #ff1f55) drop-shadow(-8px 0 #22e5f0)',offset:.7},{transform:'scale(1,1)',filter:'none'}],{duration:460,easing:'steps(7)'}).finished;}

// destino: el piso, una ventana o un borde; si no se dice, uno al azar
function spot(kind){const w=W(),h=H();
  if(kind==='seat'){const s=pickSeat();if(s){const {w:win}=winOf(s);return {x:win.x+s.dx,y:win.y,seat:s};}}
  if(kind==='corner')return {x:w-140,y:150,air:true};
  return {x:rnd(120,w-120),y:h};}
async function teleport(to){if(S.busy||S.stowed)return;S.busy=true;S.asleep=false;el.classList.remove('float','walk','zz');
  await glitchOut();to=to||spot(dcfg.sit&&Math.random()<.45?'seat':'floor');S.x=to.x;S.face=to.x>W()/2?-1:1;
  if(to.air){S.y=to.y;S.stance='floor';S.seat=null;}else{S.y=to.y;S.stance=to.seat?'seat':'floor';S.seat=to.seat||null;}
  pose(to.seat?pick(SEAT_IDLE):pick(['enamorada','risa_brazos','meditar']));draw();await glitchIn();
  if(to.air)fall();S.busy=false;if(!to.air)setTimeout(idle,900);}

async function walk(tx){if(S.stance!=='floor'||S.busy)return;S.busy=true;tx=Math.max(90,Math.min(W()-90,tx));S.face=tx>S.x?1:-1;
  pose('voltereta');el.classList.add('walk');const v=S.face*rnd(140,220);
  while(S.busy&&S.stance==='floor'&&Math.abs(tx-S.x)>8){S.x+=v/60;if(Math.sign(tx-S.x)!==S.face)S.x=tx;await wait(16);}
  el.classList.remove('walk');S.busy=false;idle();}

async function peek(){if(S.busy)return;S.busy=true;await glitchOut();const side=pick(['peekB','peekB','peekL','peekR']);
  S.stance=side;S.seat=null;S.face=1;pose('asomada');S.x=side==='peekB'?rnd(160,W()-160):S.x;S.y=side==='peekB'?H():rnd(H()*.25,H()*.7);draw();
  await glitchIn();tag('ASOMADA');if(Math.random()<.5)say(SAY.asoma);S.busy=false;}
async function unpeek(scared){if(!S.stance.startsWith('peek'))return;if(scared)say(SAY.susto,1800);
  S.stance='floor';await teleport(spot(Math.random()<.5?'seat':'floor'));}

async function chase(){if(S.mx<0||S.stance!=='floor'||S.busy)return;pose('cursor');tag('CAZANDO CURSOR');await walkTo(S.mx);
  if(S.mx>=0&&Math.abs(S.mx-S.x)<200){zap(S.mx,S.my);say(SAY.cursor);}}
async function walkTo(x){await walk(x);pose('cursor');}
function zap(x,y){const b=box(),hx=S.x+S.face*b.w*.3,hy=b.t+b.h*.45;let d=`M${hx},${hy}`;
  for(let k=1;k<=6;k++){const t=k/6;d+=` L${hx+(x-hx)*t+(k<6?rnd(-14,14):0)},${hy+(y-hy)*t+(k<6?rnd(-14,14):0)}`;}
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.innerHTML=`<path d="${d}" fill="none" stroke="#ff1f55" stroke-width="3" style="filter:drop-shadow(0 0 6px #ff1f55)"/>`;
  fx.appendChild(s);s.animate([{opacity:1},{opacity:.2},{opacity:1},{opacity:0}],{duration:520,easing:'steps(4)'}).onfinish=()=>s.remove();}

// las otras mentes dentro de ella: una copia verde y una roja se separan y vuelven
async function flourish(){if(S.busy||S.stowed)return;S.busy=true;say(SAY.truco,2200);const b=box(),src=im.src;
  const gs=[['#2dff8f',-1],['#ff1f55',1]].map(([c,dir])=>{const g=new Image();g.src=src;g.className='ghost';fx.appendChild(g);
    Object.assign(g.style,{left:b.l+'px',top:b.t+'px',width:b.w+'px',height:b.h+'px',filter:`drop-shadow(0 0 0 ${c}) brightness(.6) sepia(1) hue-rotate(${c==='#2dff8f'?'70deg':'-40deg'}) saturate(6)`,transform:S.face<0?'scaleX(-1)':''});
    return g.animate([{translate:'0 0',opacity:0},{translate:`${dir*90}px -10px`,opacity:.75,offset:.35},{translate:`${dir*90}px -10px`,opacity:.75,offset:.7},{translate:'0 0',opacity:0}],{duration:1500,easing:'ease-in-out'}).finished.then(()=>g.remove());});
  fig.animate([{transform:'rotate(0)'},{transform:'translateY(-40px) rotate(180deg)',offset:.5},{transform:'rotate(360deg)'}],{duration:700,easing:'ease-in-out',delay:400});
  await Promise.all(gs);S.busy=false;}

// se mete en la ventana donde está sentada: rayos rojos por el marco, sus ojos en la ventana, y sale por otra
async function possess(){if(S.busy||S.stance!=='seat'||!dcfg.possess)return;const o=winOf(S.seat);if(!o)return;S.busy=true;say(SAY.posee,1600);
  await wait(900);await glitchOut();const w=o.w,f=document.createElement('div');f.className='dpos';fx.appendChild(f);
  Object.assign(f.style,{left:w.x+'px',top:w.y+'px',width:w.w+'px',height:w.h+'px'});f.innerHTML='<b>CAPRI.EXE // POSEÍDA</b>';
  for(let k=0;k<7;k++){const e=document.createElement('u');e.textContent=pick(['◉◉','◉','◕◕','⊙⊙']);e.style.left=rnd(5,85)+'%';e.style.top=rnd(12,85)+'%';f.appendChild(e);
    e.animate([{opacity:0},{opacity:1}],{duration:200,delay:k*160,fill:'backwards'});}
  await wait(2300);f.animate([{opacity:1},{opacity:0}],{duration:250}).onfinish=()=>f.remove();
  const to=spot('seat');S.stance='floor';S.busy=false;await teleport(to.seat&&to.seat.id!==S.seat?.id?to:spot('floor'));}

function idle(){if(S.busy||S.drag||S.stowed||S.stance==='air'||S.stance.startsWith('peek'))return;el.classList.remove('walk');
  const sleepy=new Date().getHours()<6;const p=S.stance==='seat'?pick(SEAT_IDLE):sleepy?'bostezo':pick(FLOOR_IDLE);pose(p);el.classList.toggle('float',p==='meditar');}

async function sleep(){if(S.asleep||S.busy)return;S.asleep=true;el.classList.remove('float','walk');pose('bostezo');el.classList.add('zz');tag('DORMIDA');say(SAY.duerme,4000);}
function wake(){if(!S.asleep)return;S.asleep=false;el.classList.remove('zz');pose('enamorada');say(SAY.despierta,2400);
  fig.animate([{transform:'translateY(0)'},{transform:'translateY(-30px)'},{transform:'translateY(0)'}],{duration:420,easing:'ease-out'});setTimeout(idle,1600);}

async function stow(on){if(on===S.stowed)return;S.stowed=on;if(on){S.busy=true;await glitchOut();document.body.classList.add('dstow');
  toStar();const r=miniEl.getBoundingClientRect();placeMini(24,H()-r.height-24,0);chipSays('aquí sigo, en mi biochip',2400);S.busy=false;}
  else{document.body.classList.remove('dstow');S.stance='floor';S.x=rnd(160,W()-160);S.y=-40;pose('confundida');draw();await glitchIn();S.stance='floor';fall();}
  window.deskHit?.();}

// ---------- qué hace cuando nadie le habla ----------
function think(){if(!S.started||S.busy||S.drag||S.stowed||S.stance==='air'||!quiet())return;
  if(Date.now()-lastAct>10*60000){sleep();return;}if(S.asleep)return;if(!dcfg.wander){if(Math.random()<.3)idle();return;}
  if(S.stance.startsWith('peek')){if(Math.random()<.5)unpeek();return;}
  const can=seats().length>0,r=Math.random();
  if(S.stance==='seat'&&dcfg.possess&&r<.12)possess();
  else if(r<.3)idle();
  else if(r<.48&&S.stance==='floor')walk(S.x+rnd(-.5,.5)*W());
  else if(r<.62)teleport(spot(can&&Math.random()<.6?'seat':'floor'));
  else if(r<.74)peek();
  else if(r<.84&&S.stance==='floor')chase();
  else if(r<.94)flourish();
  else if(S.stance==='seat')fall();else idle();}

// ---------- el ciclo: gravedad, ir con la ventana, asustarse si te acercas ----------
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!S.started||S.stowed||!document.body.classList.contains('desk'))return;
  if(S.stance==='air'&&!S.drag){const y0=S.y;S.vy+=2600*dt;S.y+=S.vy*dt;
    fig.style.transform=`scale(${1-Math.min(.18,S.vy/5000)},${1+Math.min(.28,S.vy/3500)})`;
    // una orilla de ventana la puede atrapar en el camino
    let hit=null;if(dcfg.sit)wins.forEach((w,i)=>{if(!hit&&!w.max&&S.x>w.x+16&&S.x<w.x+w.w-16&&y0<=w.y&&S.y>=w.y&&!covered(i,S.x,w.y+2))hit={w};});
    if(hit){fig.style.transform='';land(hit.w.y,{id:hit.w.id,dx:S.x-hit.w.x});}
    else if(S.y>=H()){fig.style.transform='';land(H(),null);}}
  else if(S.stance==='seat'&&!S.drag){const o=winOf(S.seat);
    if(!o||o.w.max||covered(o.i,o.w.x+S.seat.dx,o.w.y+2)){if(!S.busy)fall();}
    else{S.x=o.w.x+S.seat.dx;S.y=o.w.y;if(S.x<20||S.x>W()-20)fall();}}
  // mira hacia el ratón; asomada, si te acercas se esconde; dormida, si te acercas despierta
  if(S.mx>=0&&!S.busy&&!S.drag){const b=box(),near=Math.hypot(S.mx-S.x,S.my-(b.t+b.h/2))<Math.max(150,b.w);
    if(S.stance==='floor'||S.stance==='seat'){if(Math.abs(S.mx-S.x)>40)S.face=S.mx>S.x?1:-1;}
    if(near&&S.stance.startsWith('peek'))unpeek(true);
    if(near&&S.asleep){S.nearT=S.nearT||now;if(now-S.nearT>400){S.nearT=0;wake();}}else S.nearT=0;}
  draw();}

// ---------- tocarla, arrastrarla, clic derecho ----------
window.deskPetHit=(x,y)=>{if(!S.started||S.stowed||!document.body.classList.contains('desk'))return false;if(S.drag)return true;
  const r=im.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)return false;const a=ALPHA[S.pose];if(!a)return true;
  // la imagen puede estar volteada o girada: se pasa el punto a coordenadas de la imagen
  const rot=S.stance==='peekL'?90:S.stance==='peekR'?-90:0;let u=(x-r.left)/r.width,v=(y-r.top)/r.height;
  if(rot===90)[u,v]=[v,1-u];else if(rot===-90)[u,v]=[1-v,u];if(S.face<0)u=1-u;
  const px=Math.floor(u*a.width),py=Math.floor(v*a.height);return a.data[(py*a.width+px)*4+3]>40;};
window.deskPetDrag=()=>!!S.drag;
el.style.pointerEvents='auto';
el.addEventListener('pointerdown',e=>{if(e.button!==0||!window.deskPetHit(e.clientX,e.clientY))return;e.preventDefault();
  el.setPointerCapture(e.pointerId);S.drag={x:e.clientX,y:e.clientY,dx:e.clientX-S.x,dy:e.clientY-S.y,moved:false};});
el.addEventListener('pointermove',e=>{const d=S.drag;if(!d)return;if(!d.moved&&Math.abs(e.clientX-d.x)+Math.abs(e.clientY-d.y)>6){d.moved=true;
    S.busy=false;S.asleep=false;el.classList.remove('zz','float','walk');S.stance='air';S.seat=null;pose('confundida');}
  if(d.moved){S.x=e.clientX-d.dx;S.y=e.clientY-d.dy;S.vy=0;}});
el.addEventListener('pointerup',e=>{const d=S.drag;S.drag=null;if(!d)return;bump();
  if(!d.moved){poke();return;}
  // soltada con la cadera sobre la orilla de una ventana: se queda sentada; si no, cae
  const i=dcfg.sit?wins.findIndex((w,k)=>!w.max&&S.x>w.x+16&&S.x<w.x+w.w-16&&Math.abs(S.y-w.y)<40&&!covered(k,S.x,w.y+2)):-1;
  if(i>=0){const w=wins[i];land(w.y,{id:w.id,dx:S.x-w.x});}else{S.stance='floor';fall();say(SAY.suelta,1800);}
  window.deskHit?.();});
el.addEventListener('contextmenu',e=>{e.preventDefault();if(window.deskPetHit(e.clientX,e.clientY))D.menu?.();});
function poke(){const now=Date.now();S.pokes=now-S.pokeT<1500?S.pokes+1:1;S.pokeT=now;if(S.asleep){wake();return;}
  if(S.stance.startsWith('peek')){unpeek(true);return;}
  if(S.pokes>=4){pose('confundida');say(SAY.harta,2400);setTimeout(()=>teleport(),1200);return;}
  if(S.pokes>1){pose(pick(['enamorada','risa_brazos']));say(SAY.toque,2000);fig.animate([{transform:'translateY(0)'},{transform:'translateY(-22px)'},{transform:'translateY(0)'}],{duration:380});return;}
  // un toque: se abre (o se cierra) su globo para hablarle
  if(miniEl.classList.contains('star')){openMini(true);follow();}else toStar();}

// ---------- la cabeza: pensar, escuchar y hablar se le ven a ella ----------
const _core=core;core=function(m){_core(m);if(!S.started||S.stowed)return;tag(TAG[m]||m);
  if(m!=='DORMANT'){if(S.asleep)wake();if(S.stance.startsWith('peek'))unpeek();}
  if(m==='THINKING')pose('laptop');else if(m==='LISTENING')pose('sentada_mira');else if(m==='TALKING'){pose(PET_TALK[curState]||'risa_brazos');follow();}else idle();};

// ---------- arranque ----------
async function start(){if(S.started)return;S.started=true;document.body.classList.add('dpet');
  try{Object.assign(dcfg,await D.getCfg?.()||{});}catch(e){}S.scale=SIZE[dcfg.size]||.75;
  try{const d=await D.windowsNow?.();if(d)wins=d.wins||[];}catch(e){}
  if(dcfg.stowed){S.stowed=true;document.body.classList.add('dstow');return;}
  // entra con glitch arriba a la derecha, saluda y cae a su lugar
  S.x=W()-170;S.y=230;S.stance='floor';pose('enamorada');draw();await glitchIn();say(SAY.hola,3200);tag('ONLINE');await wait(1600);fall();}
D.onWindows?.(d=>{wins=(d&&d.wins)||[];});
D.onCfg?.(c=>{const was=dcfg.stowed;Object.assign(dcfg,c);const sc=SIZE[dcfg.size]||.75;if(sc!==S.scale){S.scale=sc;S.lastBox='';}
  if(S.started&&dcfg.stowed!==was)stow(dcfg.stowed);});
D.onCmd?.(c=>{if(!S.started)return;if(c.name==='teleport'){if(S.stowed)D.setCfg?.({stowed:false});else teleport();}
  else if(c.name==='sit'){const t=spot('seat');if(t.seat)teleport(t);else say('no veo ninguna ventana libre',2200);}
  else if({flourish,peek,possess,chase,sleep}[c.name])({flourish,peek,possess,chase,sleep})[c.name]();});
// guardada en su biochip: un clic en él la saca
chip.addEventListener('pointerup',e=>{if(!document.body.classList.contains('dstow')||(drag&&drag.moved))return;
  e.stopImmediatePropagation();drag=null;D.setCfg?D.setCfg({stowed:false}):stow(false);},true);
// el ratón sobre otras ventanas no llega a la página: se pregunta a la app dónde está
setInterval(async()=>{if(!S.started||!D.cursor)return;try{const p=await D.cursor();if(p){S.mx=p.x;S.my=p.y;}}catch(e){}},200);
addEventListener('mousemove',e=>{S.mx=e.clientX;S.my=e.clientY;});
addEventListener('resize',()=>{S.lastBox='';if(S.stance==='floor'&&!S.busy)S.y=H();});
setInterval(think,9000);requestAnimationFrame(frame);
const go=()=>{if(document.body.classList.contains('desk'))start();};
new MutationObserver(go).observe(document.body,{attributes:true,attributeFilter:['class']});go();
})();
