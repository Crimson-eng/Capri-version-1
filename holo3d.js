// Holograma anatómico 3D (three.js) para las secciones MÉDICO y CIBERWARE del HUD.
// Cuerpo estilizado hecho con piezas (no es un modelo a escala anatómica exacta): piel translúcida con brillo
// en los bordes, órganos por sistema adentro, polvo holográfico y un anillo de escaneo.
// Arrastra para girar, rueda para acercar, toca un órgano para elegir su sistema.
// Se usa desde hud.js con window.Holo3D.attach(contenedor, 'medico'|'ciber').
import * as THREE from './vendor/three.module.min.js';

const RED=0xff4d5e,CYAN=0x5ef6ff,GOLD=0xf3c84b;
const ZONAS={
  nervioso:{n:'Sistema nervioso',c:0xff7bd0,f:[0,1.6,0]},respiratorio:{n:'Sistema respiratorio',c:0x7fd8ff,f:[0,1.3,0]},
  circulatorio:{n:'Sistema circulatorio',c:0xff3048,f:[0,1.3,0]},digestivo:{n:'Sistema digestivo',c:0xffb04d,f:[0,1.1,0]},
  urinario:{n:'Sistema renal',c:0xf3e66b,f:[0,1.05,0]},endocrino:{n:'Sistema endocrino',c:0xb48bff,f:[0,1.4,0]},
  musculo:{n:'Músculos y huesos',c:0xe8eef2,f:[0,0.9,0]},inmune:{n:'Sistema inmune',c:0x6bffb0,f:[0,1.2,0]},
  piel:{n:'Piel',c:RED,f:[0,1.0,0]},repro:{n:'Sistema reproductor',c:0xff8fb1,f:[0,0.92,0]}};

let renderer,scene,camera,root,skin,skinWire,dust,scanRing,host=null,mode='medico',raf=0,t0=performance.now();
const zoneMeshes={},pickers=[],labels={};let sel=null,hover=null,counts={},onPick=()=>{},pulseK=null,pulseT=0;
let yaw=0.5,pitch=0.08,dist=7,tYaw=0.5,tPitch=0.08,tDist=3.7,focus=new THREE.Vector3(0,1,0),tFocus=new THREE.Vector3(0,1,0),idleT=0;

// ---------- materiales ----------
const holoMat=(color,op=.55)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,
  uniforms:{c:{value:new THREE.Color(color)},t:{value:0},op:{value:op},scan:{value:1}},
  vertexShader:`varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 w=modelMatrix*vec4(position,1.);vY=w.y;vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform vec3 c;uniform float t,op,scan;varying vec3 vN;varying vec3 vV;varying float vY;
   void main(){float f=pow(1.-abs(dot(normalize(vN),vV)),2.2);float lines=.55+.45*step(.5,fract(vY*90.));
   float s=mod(t*.35,2.2)-.2;float band=smoothstep(.06,0.,abs(vY-s))*scan;
   gl_FragColor=vec4(c*(f*1.9+.16)*lines+vec3(.5,1.,1.)*band*.7,(f*1.1+.12+band*.5)*op);}`});
// órganos: brillo en los bordes (fresnel) con un núcleo tenue, para que se vean como luz y no como plástico
const organMat=c=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{c:{value:new THREE.Color(c)},op:{value:.7}},
  vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform vec3 c;uniform float op;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(normalize(vN),vV)),1.6);gl_FragColor=vec4(c*(.22+f*1.1),(.25+f*.75)*op);}`});
function look(m,color,op){if(m.material.uniforms){m.material.uniforms.c.value.set(color);m.material.uniforms.op.value=op;}else{m.material.color.set(color);m.material.opacity=op;}}
const lineMat=(c,op=.55)=>new THREE.LineBasicMaterial({color:c,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false});

// ---------- piezas ----------
const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
function limb(a,b,r1,r2,seg=18){const d=b.clone().sub(a),g=new THREE.CylinderGeometry(r2,r1,d.length(),seg,10,true);
  const m=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()),V(1,1,1));g.applyMatrix4(m);return g;}
function ball(p,r,s=[1,1,1],seg=20){const g=new THREE.SphereGeometry(r,seg,Math.round(seg*.7));g.scale(...s);g.translate(p.x,p.y,p.z);return g;}
function lathe(prof,sx,sz,y0=0){const g=new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),40);g.scale(sx,1,sz);g.translate(0,y0,0);return g;}

function cuerpo(){const gs=[];
  gs.push(lathe([[0,.84],[.12,.86],[.165,.93],[.17,.98],[.15,1.04],[.128,1.1],[.138,1.18],[.155,1.26],[.165,1.34],[.168,1.4],[.15,1.45],[.1,1.485],[.05,1.5]],1,.62)); // torso
  gs.push(limb(V(0,1.47),V(0,1.57),.048,.044)); // cuello
  gs.push(ball(V(0,1.66,.005),.1,[1,1.24,1.08],28)); // cabeza
  for(const s of [-1,1]){
    gs.push(ball(V(.175*s,1.42),.058,[1.1,.9,.9]));                           // hombro
    gs.push(limb(V(.19*s,1.42),V(.235*s,1.14),.05,.04));                       // brazo
    gs.push(ball(V(.235*s,1.14),.04));
    gs.push(limb(V(.235*s,1.14),V(.27*s,.88),.04,.03));                        // antebrazo
    gs.push(ball(V(.282*s,.82,.01),.034,[.8,1.6,.5]));                         // mano
    gs.push(limb(V(.088*s,.92),V(.1*s,.5),.088,.056));                         // muslo
    gs.push(ball(V(.1*s,.5),.056));
    gs.push(limb(V(.1*s,.5),V(.104*s,.09),.054,.034));                         // pierna
    gs.push(ball(V(.104*s,.045,.035),.042,[.75,.55,1.7]));}                    // pie
  return gs;}

function build(){scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(30,1,.05,50);root=new THREE.Group();scene.add(root);
  const gs=cuerpo(),mat=holoMat(RED,.6);skin=new THREE.Group();
  // primero se escribe solo la profundidad de la piel y luego el brillo encima: así no se ven los bordes
  // de las piezas que se enciman (hombros, codos, rodillas) y queda una sola silueta
  mat.depthTest=true;mat.depthFunc=THREE.LessEqualDepth;const depth=new THREE.MeshBasicMaterial({colorWrite:false,transparent:true}); // transparente para que se dibuje después de los órganos
  for(const g of gs){const d=new THREE.Mesh(g,depth);d.renderOrder=1;skin.add(d);const m=new THREE.Mesh(g,mat);m.renderOrder=2;m.userData.glow=true;skin.add(m);}
  const tw=new THREE.LineBasicMaterial({color:RED,transparent:true,opacity:.06,blending:THREE.AdditiveBlending,depthWrite:false});
  const torsoW=new THREE.LineSegments(new THREE.WireframeGeometry(gs[0]),tw);torsoW.renderOrder=3;skin.add(torsoW);
  root.add(skin);skinWire=tw;
  // polvo holográfico: puntos tomados de la piel
  const pts=[];for(const g of gs){const p=g.attributes.position;for(let i=0;i<p.count;i+=3)pts.push(p.getX(i),p.getY(i),p.getZ(i));}
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xffb3ba,size:.006,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(dust);
  organos();
  // piso y anillo de escaneo
  for(const [r,c,op] of [[.55,RED,.5],[.42,CYAN,.35],[.3,RED,.25]]){const g=new THREE.RingGeometry(r-.004,r,96);g.rotateX(-Math.PI/2);root.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:op,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})));}
  const tick=new THREE.BufferGeometry().setFromPoints(Array.from({length:120},(_,i)=>{const a=i/60*Math.PI,r=i%2?.6:.62;return V(Math.cos(a)*r,0,Math.sin(a)*r);}));
  root.add(new THREE.LineSegments(tick,lineMat(RED,.35)));
  const sr=new THREE.RingGeometry(.3,.305,80);sr.rotateX(-Math.PI/2);scanRing=new THREE.Mesh(sr,new THREE.MeshBasicMaterial({color:CYAN,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));root.add(scanRing);}

function add(k,obj){(zoneMeshes[k]=zoneMeshes[k]||[]).push(obj);root.add(obj);return obj;}
function organ(k,geo){return add(k,new THREE.Mesh(geo,organMat(ZONAS[k].c)));}
function wire(k,points,op=.6){const g=new THREE.BufferGeometry().setFromPoints(points);return add(k,new THREE.Line(g,lineMat(ZONAS[k].c,op)));}
function curve(k,ps,op){return wire(k,new THREE.CatmullRomCurve3(ps).getPoints(60),op);}
function picker(k,p,r){const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),new THREE.MeshBasicMaterial({visible:false}));m.position.copy(p);m.userData.k=k;pickers.push(m);root.add(m);}

function organos(){
  // nervioso: cerebro, médula y nervios
  organ('nervioso',ball(V(0,1.69,0),.078,[1,.8,1.1],24));
  organ('nervioso',ball(V(0,1.62,-.03),.035,[1.3,.7,1]));
  curve('nervioso',[V(0,1.6,-.04),V(0,1.4,-.06),V(0,1.2,-.065),V(0,1,-.055),V(0,.92,-.04)],.8);
  for(const s of [-1,1]){curve('nervioso',[V(0,1.44,-.05),V(.17*s,1.42,-.01),V(.23*s,1.15),V(.27*s,.86)],.45);
    curve('nervioso',[V(0,.95,-.04),V(.09*s,.86,-.02),V(.1*s,.5),V(.1*s,.08)],.45);}
  picker('nervioso',V(0,1.68),.11);
  // respiratorio
  for(const s of [-1,1])organ('respiratorio',ball(V(.068*s,1.3,0),.062,[.9,1.75,.85]));
  organ('respiratorio',limb(V(0,1.5,.02),V(0,1.38,.01),.012,.012,10));
  picker('respiratorio',V(-.075,1.3,.02),.07);picker('respiratorio',V(.09,1.32,.02),.06);
  // circulatorio: corazón, aorta y vasos
  const heart=organ('circulatorio',ball(V(.028,1.27,.04),.042,[1,1.15,.9]));heart.userData.heart=true;
  curve('circulatorio',[V(.03,1.3,.03),V(.02,1.37,.02),V(-.01,1.36,0),V(-.005,1.2,-.03),V(0,.95,-.02)],.8);
  for(const s of [-1,1]){curve('circulatorio',[V(0,1.37,.01),V(.17*s,1.41,.02),V(.235*s,1.13,.02),V(.275*s,.84,.02)],.55);
    curve('circulatorio',[V(0,.95,0),V(.085*s,.88,.02),V(.105*s,.5,.02),V(.106*s,.07,.02)],.55);
    curve('circulatorio',[V(.01*s,1.46,.02),V(.03*s,1.6,.02),V(.04*s,1.68,.02)],.5);}
  picker('circulatorio',V(.03,1.27,.05),.055);
  // digestivo
  organ('digestivo',ball(V(-.05,1.165,.03),.085,[1,.5,.6]));            // hígado
  organ('digestivo',ball(V(.06,1.15,.035),.045,[1.1,.8,.7]));           // estómago
  const tk=new THREE.TorusKnotGeometry(.05,.012,90,8,3,5);tk.scale(1.15,.75,.5);tk.translate(0,1.0,.03);organ('digestivo',tk); // intestino
  organ('digestivo',limb(V(.01,1.48,-.02),V(.05,1.18,.02),.01,.012,8)); // esófago
  picker('digestivo',V(0,1.08,.05),.09);
  // renal
  for(const s of [-1,1])organ('urinario',ball(V(.058*s,1.08,-.045),.024,[.8,1.3,.7]));
  organ('urinario',ball(V(0,.9,.045),.026,[1.2,.9,1]));
  picker('urinario',V(.06,1.08,-.04),.04);picker('urinario',V(-.06,1.08,-.04),.04);
  // endocrino: tiroides, suprarrenales, páncreas, hipófisis
  for(const s of [-1,1]){organ('endocrino',ball(V(.014*s,1.505,.035),.012,[1,1.4,.8]));organ('endocrino',ball(V(.056*s,1.115,-.045),.012));}
  organ('endocrino',ball(V(.01,1.11,.0),.04,[1.4,.3,.4]));organ('endocrino',ball(V(0,1.66,.0),.01));
  picker('endocrino',V(0,1.505,.04),.035);
  // músculos y huesos: columna, costillas, pelvis y huesos largos
  for(let i=0;i<20;i++){const g=new THREE.BoxGeometry(.028,.016,.024);g.translate(0,.96+i*.028,-.07);organ('musculo',g);}
  for(let i=0;i<7;i++){const g=new THREE.TorusGeometry(.125-Math.abs(i-2.5)*.006,.0035,6,40,Math.PI*1.55);g.rotateX(Math.PI/2);g.rotateY(Math.PI*.22+Math.PI);g.scale(1,1,.62);g.translate(0,1.4-i*.034,-.005);organ('musculo',g);}
  const pv=new THREE.TorusGeometry(.105,.016,8,40);pv.rotateX(Math.PI/2.3);pv.scale(1,1,.6);pv.translate(0,.93,0);organ('musculo',pv);
  for(const s of [-1,1]){for(const [a,b] of [[V(.19*s,1.41),V(.233*s,1.15)],[V(.235*s,1.13),V(.268*s,.89)],[V(.09*s,.9),V(.1*s,.52)],[V(.1*s,.48),V(.104*s,.1)]])organ('musculo',limb(a,b,.011,.009,8));
    organ('musculo',limb(V(.02*s,1.455,.03),V(.165*s,1.44,.0),.007,.007,6));}
  picker('musculo',V(.1,.7),.08);picker('musculo',V(-.1,.7),.08);picker('musculo',V(.1,.28),.07);picker('musculo',V(-.1,.28),.07);
  picker('musculo',V(.24,1.12),.06);picker('musculo',V(-.24,1.12),.06);
  // inmune: bazo y ganglios
  organ('inmune',ball(V(.095,1.15,-.03),.026,[1,1.3,.7]));
  for(const p of [V(.04,1.52,.03),V(-.04,1.52,.03),V(.13,1.37,.02),V(-.13,1.37,.02),V(.07,.9,.05),V(-.07,.9,.05),V(0,1.36,.06)])organ('inmune',ball(p,.009));
  picker('inmune',V(.1,1.15,-.02),.04);picker('inmune',V(-.13,1.37,.03),.035);
  // reproductor
  organ('repro',ball(V(0,.95,.02),.03,[1.3,.9,.8]));for(const s of [-1,1])organ('repro',ball(V(.045*s,.955,.02),.012));
  picker('repro',V(0,.93,.05),.045);
  // piel = el cuerpo entero; se elige tocando fuera de los órganos
}

// ---------- interacción ----------
const ray=new THREE.Raycaster(),mv=new THREE.Vector2();let drag=null,moved=false;
function pick(e){const r=renderer.domElement.getBoundingClientRect();mv.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mv,camera);
  const h=ray.intersectObjects(pickers,false)[0];if(h)return h.object.userData.k;const s=ray.intersectObjects(skin.children.filter(c=>c.userData.glow),false)[0];return s?'piel':null;}
function bindInput(el){
  el.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:tYaw,pitch:tPitch};moved=false;el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;tYaw=drag.yaw+dx*.008;tPitch=Math.max(-.5,Math.min(.6,drag.pitch+dy*.004));idleT=performance.now();}
    else if(mode==='medico'){const k=pick(e);if(k!==hover){hover=k;el.style.cursor=k?'pointer':'grab';tint();}}});
  el.addEventListener('pointerup',e=>{if(drag&&!moved&&mode==='medico'){const k=pick(e);select(k||null,true);}drag=null;});
  el.addEventListener('wheel',e=>{e.preventDefault();tDist=Math.max(1.2,Math.min(4.2,tDist*(1+e.deltaY*.0012)));idleT=performance.now();},{passive:false});
  el.addEventListener('dblclick',()=>select(null,true));}

function tint(){const lit=k=>k===sel||k===hover||k===pulseK;
  for(const [k,ms] of Object.entries(zoneMeshes)){const on=lit(k),dim=mode==='ciber'?.35:(sel&&!on?.18:.7);
    for(const m of ms)look(m,on&&k===sel?GOLD:ZONAS[k].c,(on?1:dim)*(k==='musculo'?.6:1));}
  glowMat().uniforms.c.value.set(sel==='piel'?GOLD:RED);glowMat().uniforms.op.value=sel&&sel!=='piel'?.35:.6;}
const glowMat=()=>skin.children.find(c=>c.userData.glow).material;

function select(k,user){sel=k;const z=k&&ZONAS[k];
  if(z&&k!=='piel'){tFocus.set(...z.f);tDist=k==='musculo'?2.6:1.7;}else{tFocus.set(0,.95,0);tDist=3.7;}
  tint();updLabels();if(user)onPick(k);}

// ---------- etiquetas HTML sobre el canvas ----------
let labelBox;
function updLabels(){if(!labelBox)return;labelBox.innerHTML='';
  for(const k of Object.keys(ZONAS)){const n=counts[k]||0;if(mode!=='medico'||(!n&&k!==sel))continue;
    const d=document.createElement('button');d.className='h3l'+(k===sel?' on':'');d.innerHTML=`<i></i><span>${ZONAS[k].n.replace('Sistema ','')}</span>${n?`<b>${n}</b>`:''}`;
    d.onclick=()=>select(k,true);labels[k]=d;labelBox.appendChild(d);}}
const anchor={nervioso:V(0,1.72),respiratorio:V(-.08,1.33),circulatorio:V(.03,1.27,.05),digestivo:V(-.02,1.08,.05),urinario:V(.06,1.08,-.04),endocrino:V(0,1.505,.04),musculo:V(.1,.6),inmune:V(.1,1.15),piel:V(-.27,.9),repro:V(0,.93,.05)};
function placeLabels(){if(!labelBox||!labelBox.children.length)return;const w=renderer.domElement.clientWidth,h=renderer.domElement.clientHeight,p=new THREE.Vector3();
  for(const [k,d] of Object.entries(labels)){if(!d.isConnected)continue;p.copy(anchor[k]).applyMatrix4(root.matrixWorld).project(camera);
    const right=p.x>=0;d.style.left=((p.x+1)/2*w)+'px';d.style.top=((1-p.y)/2*h)+'px';d.classList.toggle('r',!right);}}

// ---------- ciclo ----------
function size(){if(!host)return;const w=host.clientWidth||1,h=host.clientHeight||1;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function loop(){raf=requestAnimationFrame(loop);if(!host||!host.isConnected||!host.offsetParent)return;const t=(performance.now()-t0)/1000;
  if(!drag&&performance.now()-idleT>4000)tYaw+=mode==='ciber'?.004:.0025;
  yaw+=(tYaw-yaw)*.12;pitch+=(tPitch-pitch)*.12;dist+=(tDist-dist)*.08;focus.lerp(tFocus,.08);
  camera.position.set(focus.x+Math.sin(yaw)*Math.cos(pitch)*dist,focus.y+Math.sin(pitch)*dist,focus.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(focus);
  glowMat().uniforms.t.value=t;
  const sy=(t*.35)%2.2-.2;scanRing.position.y=Math.max(0,Math.min(1.8,sy));scanRing.material.opacity=sy>0&&sy<1.8?.55:0;
  for(const m of zoneMeshes.circulatorio||[])if(m.userData.heart){const b=1+.12*Math.max(0,Math.sin(t*7.5))**8;m.scale.setScalar(b);}
  dust.material.opacity=.4+.15*Math.sin(t*2);
  if(pulseK&&performance.now()>pulseT){pulseK=null;tint();}
  if(pulseK)for(const m of zoneMeshes[pulseK]||[])look(m,GOLD,.55+.45*Math.abs(Math.sin(t*6)));
  renderer.render(scene,camera);placeLabels();}

const css=document.createElement('style');css.textContent=`.holo3d{position:relative;width:100%;height:100%;min-height:360px;cursor:grab;touch-action:none}
.holo3d canvas{width:100%!important;height:100%!important;display:block}
.h3lab{position:absolute;inset:0;pointer-events:none}
.h3l{position:absolute;pointer-events:auto;transform:translate(14px,-50%);display:flex;align-items:center;gap:6px;background:rgba(8,3,5,.82);border:1px solid rgba(94,246,255,.5);color:#bff9fc;font:10px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;padding:4px 7px;cursor:pointer;white-space:nowrap}
.h3l.r{transform:translate(calc(-100% - 14px),-50%)}
.h3l i{position:absolute;top:50%;left:-14px;width:14px;height:1px;background:#5ef6ff}.h3l.r i{left:auto;right:-14px}
.h3l b{background:#f3c84b;color:#140c00;font-weight:700;padding:1px 4px}.h3l.on{border-color:#f3c84b;color:#f3c84b}
.h3hint{position:absolute;left:10px;bottom:8px;font:10px var(--mono);letter-spacing:.14em;color:#a0565e;pointer-events:none;text-transform:uppercase}`;
document.head.appendChild(css);

function attach(el,m='medico'){
  if(!renderer){try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){return false;}
    renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setClearColor(0x000000,0);build();bindInput(renderer.domElement);
    labelBox=document.createElement('div');labelBox.className='h3lab';new ResizeObserver(size).observe(document.body);addEventListener('resize',size);loop();}
  mode=m;host=el;el.classList.add('holo3d');el.innerHTML='';el.appendChild(renderer.domElement);el.appendChild(labelBox);
  const hint=document.createElement('div');hint.className='h3hint';hint.textContent=m==='medico'?'arrastra para girar · rueda para acercar · toca una zona':'arrastra para girar';el.appendChild(hint);
  new ResizeObserver(size).observe(el);size();if(m==='ciber'){sel=null;tFocus.set(0,.95,0);tDist=3.2;}else select(sel,false);tint();updLabels();return true;}

window.Holo3D={attach,select:k=>select(k,false),zonas:ZONAS,
  setCounts(c){counts=c||{};updLabels();},onPick(fn){onPick=fn;},
  pulse(k,ms=4000){if(!ZONAS[k])return;pulseK=k;pulseT=performance.now()+ms;tint();}};
dispatchEvent(new Event('holo3d:ready'));
