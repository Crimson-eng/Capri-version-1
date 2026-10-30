// Cerebro holográfico de la sección RELIC (three.js), inspirado en el NEURO-SCAN: encéfalo rosa con surcos rojos,
// anillos orbitando, tronco con el chip Relic, cables y base hexagonal. Para que se lea como la memoria de una IA y no
// como un órgano, por la corteza corre una red de nodos y sinapsis con pulsos de datos, y cada engrama (recuerdo,
// constructo, lección, módulo) es una luz en la zona donde vive. Cada zona es un apartado de RELIC:
//   0 lóbulo frontal → CONSTRUCTOS · 1 parietal/occipital → APRENDIZAJE Y VELOCIDAD · 2 temporal → RECUERDOS · 3 cerebelo, tronco y chip → MEJORAS DEL CHIP
// Arrastra para girar, rueda para acercar, toca una zona (o su etiqueta) para abrirla. Se usa desde relic.js con window.Relic3D.attach(el).
import * as THREE from './vendor/three.module.min.js';

const ZONAS=[
  {n:'Lóbulo frontal',s:'Constructos',c:0xff4d5e},
  {n:'Lóbulo parietal',s:'Aprendizaje y velocidad',c:0x5ef6ff},
  {n:'Lóbulo temporal',s:'Recuerdos',c:0xf3c84b},
  {n:'Tronco · chip Relic',s:'Mejoras del chip',c:0x6bffb0}];
const CEN=new THREE.Vector3(0,.04,-.02);   // centro del encéfalo

// ---------- ruido simplex 3D (Ashima Arts, MIT) para surcos y circuitos ----------
const NOISE=`vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
 vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
 i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
 float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
 vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
 vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;
 vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
int zoneOf(vec3 p){if(p.y<-.12&&abs(p.x)>.24&&p.z>-.38&&p.z<.36)return 2;if(p.z>.16)return 0;return 1;}`;
// la misma regla en JS (para saber qué zona tocaste)
const zoneOf=p=>p.y<-.12&&Math.abs(p.x)>.24&&p.z>-.38&&p.z<.36?2:p.z>.16?0:1;

// ---------- materiales ----------
const U={t:{value:0},hov:{value:-1},sel:{value:-1},act:{value:.2},zc:{value:ZONAS.map(z=>new THREE.Color(z.c))}};
// kind: 0 corteza (surcos) · 1 cerebelo (láminas) · 2 tronco/collar (liso)
function brainMat(kind,fixed=-1){return new THREE.ShaderMaterial({uniforms:{...U,kind:{value:kind},fz:{value:fixed}},
  vertexShader:`${NOISE}uniform float kind;varying vec3 vP;varying vec3 vW;varying vec3 vO;varying float vN;
   void main(){vP=position;vO=normalize(mat3(modelMatrix)*normal);float n=snoise(position*5.5+vec3(1.7));vN=n;float d=0.;
    if(kind<.5)d=-.018*(1.-smoothstep(0.,.3,abs(n)))+.008*snoise(position*2.2);
    else if(kind<1.5)d=-.012*pow(abs(sin(position.y*80.+snoise(position*4.)*1.2)),5.);
    vec4 w=modelMatrix*vec4(position+normal*d,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`${NOISE}uniform float t,hov,sel,act,kind,fz;uniform vec3 zc[4];varying vec3 vP;varying vec3 vW;varying vec3 vO;varying float vN;
   void main(){vec3 N=normalize(cross(dFdx(vW),dFdy(vW)));vec3 V=normalize(cameraPosition-vW);if(dot(N,vO)<0.)N=-N;N=normalize(mix(normalize(vO),N,.55));
    float n=kind<.5?snoise(vP*5.5+vec3(1.7)):vN;
    float sul=kind<.5?1.-smoothstep(0.,.13,abs(n)):kind<1.5?pow(abs(sin(vP.y*80.+snoise(vP*4.)*1.2)),9.):0.;
    int z=fz>-.5?int(fz+.5):zoneOf(vP);vec3 zcol=zc[z];
    float lit=.42+.58*max(dot(N,normalize(vec3(.35,.85,.55))),0.)+.25*max(dot(N,normalize(vec3(-.6,-.2,-.5))),0.);
    vec3 base=mix(vec3(1.,.87,.89),vec3(.93,.3,.42),sul*.9);if(kind>1.5)base=vec3(.92,.9,.92);
    float h=(float(z)==hov?.45:0.)+(float(z)==sel?.75:0.);
    vec3 col=base*lit;col=mix(col,col*.55+zcol*.75,min(h,1.)*.6);
    // datos corriendo por los surcos: pulsos que viajan del frente hacia atrás, más rápidos cuando Capri piensa
    float flow=fract(vP.z*2.6-vP.y*1.3+snoise(vP*1.6)*1.1-t*(.18+.55*act));float pulse=smoothstep(.86,1.,flow)*sul;
    col+=mix(vec3(1.,.3,.4),zcol,.5+.5*min(h,1.))*pulse*(.7+1.6*act);
    float fr=pow(1.-abs(dot(N,V)),2.2);col+=vec3(.37,.96,1.)*fr*(.35+.4*min(h,1.));
    gl_FragColor=vec4(col,1.);}`});}
const additive=(o={})=>({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,...o});

// ---------- forma del encéfalo ----------
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function shape(d,side){const x=d.x,y=d.y,z=d.z,inner=x*side<0;
  let rx=inner?.21:.38,ry=y>0?.44:.3,rz=z>0?.62:.58;if(y>0)ry*=1-.2*Math.max(0,z)**2;
  // la cara de adentro casi plana (superelipse) para que los hemisferios se junten en la cisura, como un cerebro y no dos huevos
  let px=inner?Math.sign(x)*Math.abs(x)**.38*rx:x*rx,py=y*ry,pz=z*rz;
  if(!inner){const tt=Math.exp(-((y+.55)**2)/.12-((z-.1)**2)/.3);px+=side*.07*tt;py-=.07*tt;}  // lóbulo temporal
  return V(px+side*.218,py,pz);}
function hemi(side){const g=new THREE.SphereGeometry(1,176,128),p=g.attributes.position,d=new THREE.Vector3();
  for(let i=0;i<p.count;i++){d.fromBufferAttribute(p,i);const v=shape(d,side);p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();return g;}
function ell(c,r,seg=96){const g=new THREE.SphereGeometry(1,seg,Math.round(seg*.7));g.scale(...r);g.translate(...c);return g;}

let renderer,scene,camera,brain,rings=[],hits=[],net,netMat,eng,engMat,host=null,labelBox,svg,raf=0,frame=0;
let pool=[];   // puntos de la corteza (posición, normal, zona) para la red y los engramas
let yaw=.9,pitch=.12,dist=5.5,tYaw=.9,tPitch=.12,tDist=3.5,focus=V(0,-.12,0),tFocus=V(0,-.12,0),idleT=0,dragging=false;
let counts=[0,0,0,0],onPick=()=>{},pulses=[0,0,0,0],act=.2,actT=0;

function build(){scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(32,1,.05,60);brain=new THREE.Group();scene.add(brain);
  // corteza: dos hemisferios con la cisura en medio
  for(const s of [-1,1]){const g=hemi(s),m=new THREE.Mesh(g,brainMat(0));m.userData.cortex=true;brain.add(m);hits.push(m);
    const p=g.attributes.position,nn=g.attributes.normal;for(let i=0;i<p.count;i+=7){const v=V(p.getX(i),p.getY(i),p.getZ(i)),n=V(nn.getX(i),nn.getY(i),nn.getZ(i));if(n.x*s<-.55)continue;pool.push({v,n,z:zoneOf(v)});}}
  // cerebelo con sus láminas, tronco encefálico, collar y el chip Relic
  const cb=new THREE.Mesh(ell([0,-.27,-.4],[.3,.15,.2]),brainMat(1,3));brain.add(cb);hits.push(cb);
  {const p=cb.geometry.attributes.position,nn=cb.geometry.attributes.normal;for(let i=0;i<p.count;i+=9){const v=V(p.getX(i),p.getY(i),p.getZ(i)),n=V(nn.getX(i),nn.getY(i),nn.getZ(i));if(n.y>.5)continue;pool.push({v,n,z:3});}}
  const stemG=new THREE.CylinderGeometry(.075,.05,1,40,24);stemG.translate(0,-.5,0);const stem=new THREE.Mesh(stemG,brainMat(2,3));
  stem.position.set(0,-.16,-.12);stem.scale.set(1,.72,1);stem.rotation.x=.05;brain.add(stem);hits.push(stem);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.07,40),brainMat(2,3));col.position.set(0,-.66,-.1);brain.add(col);hits.push(col);
  const col2=col.clone();col2.position.y=-.75;col2.scale.set(.9,.6,.9);brain.add(col2);
  const chipM=new THREE.ShaderMaterial({...additive(),uniforms:U,vertexShader:`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t,sel,hov;uniform vec3 zc[4];varying vec2 vU;void main(){vec2 q=abs(vU-.5);float edge=step(.42,max(q.x,q.y));
     float pins=step(.45,q.y)*step(.5,fract(vU.x*9.));float core=1.-smoothstep(.0,.2,length(vU-.5));float on=(sel>2.5&&sel<3.5?1.:0.)+(hov>2.5&&hov<3.5?.5:0.);
     float b=.55+.45*sin(t*3.);gl_FragColor=vec4(zc[3]*(edge*.9+pins+core*b*(.6+on))+vec3(1.,.3,.4)*(1.-edge)*.12,1.);}`});
  const chip=new THREE.Mesh(new THREE.PlaneGeometry(.16,.11),chipM);chip.position.set(0,-.52,-.04);chip.rotation.x=-.05;brain.add(chip);hits.push(chip);chip.userData.chip=true;
  // red neuronal: nodos sobre la corteza unidos con sus vecinos; por las sinapsis corren pulsos de datos
  const N=[];for(let i=0;i<620;i++){const p=pool[(Math.random()*pool.length)|0];N.push({...p,w:p.v.clone().addScaledVector(p.n,.03)});}
  const lp=[],lu=[],ls=[],lz=[];
  for(const a of N){const near=N.map(b=>[b,a.w.distanceToSquared(b.w)]).filter(x=>x[1]>1e-5&&x[1]<.03).sort((p,q)=>p[1]-q[1]).slice(0,2);
    for(const [b] of near){const m=a.w.clone().add(b.w).multiplyScalar(.5),nm=a.n.clone().add(b.n).normalize();m.addScaledVector(nm,.015);const sd=Math.random();
      for(const [p,u] of [[a.w,0],[m,.5],[m,.5],[b.w,1]]){lp.push(p.x,p.y,p.z);lu.push(u);ls.push(sd);lz.push(a.z);}}}
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));lg.setAttribute('aU',new THREE.Float32BufferAttribute(lu,1));
  lg.setAttribute('aS',new THREE.Float32BufferAttribute(ls,1));lg.setAttribute('aZ',new THREE.Float32BufferAttribute(lz,1));
  netMat=new THREE.ShaderMaterial({...additive(),uniforms:U,vertexShader:`attribute float aU,aS,aZ;varying float vU,vS,vZ;void main(){vU=aU;vS=aS;vZ=aZ;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t,act,sel,hov;uniform vec3 zc[4];varying float vU,vS,vZ;void main(){float on=abs(vZ-sel)<.5?1.:abs(vZ-hov)<.5?.6:0.;
     float ph=fract(vS*7.+t*(.25+act*.9)*(.6+vS));float p=smoothstep(.12,0.,abs(vU-ph));
     vec3 c=mix(vec3(.37,.96,1.),zc[int(vZ+.5)],.35+.65*on);gl_FragColor=vec4(c*(.3+on*.3+p*(1.4+act)),1.);}`});
  net=new THREE.LineSegments(lg,netMat);brain.add(net);
  const pg=new THREE.BufferGeometry().setFromPoints(N.map(a=>a.w));pg.setAttribute('aS',new THREE.Float32BufferAttribute(N.map(()=>Math.random()),1));
  pg.setAttribute('aZ',new THREE.Float32BufferAttribute(N.map(a=>a.z),1));
  brain.add(new THREE.Points(pg,new THREE.ShaderMaterial({...additive(),uniforms:{...U,px:{value:1}},
    vertexShader:`attribute float aS,aZ;uniform float t,px;varying float vA;void main(){vA=.35+.65*pow(.5+.5*sin(t*(1.+aS*2.)+aS*40.),3.);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=px*(2.6+2.6*vA)*(3./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vec3(.75,1.,1.)*vA*(1.-d*2.),1.);}`})));
  // engramas: una luz por cada recuerdo, constructo, lección o módulo, en su zona
  engMat=new THREE.ShaderMaterial({...additive(),uniforms:{...U,px:{value:1}},
    vertexShader:`attribute float aS,aZ;attribute vec3 aC;uniform float t,px,sel;varying vec3 vC;varying float vA;
     void main(){float on=abs(aZ-sel)<.5?1.:0.;vA=.55+.45*sin(t*2.+aS*30.);vC=aC;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=px*(7.+5.*on+3.*vA)*(3./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float k=pow(1.-d*2.,1.8);gl_FragColor=vec4(vC*k*(.8+vA)+vec3(1.)*pow(k,6.)*.8,1.);}`});
  eng=new THREE.Points(new THREE.BufferGeometry(),engMat);brain.add(eng);
  // anillos en órbita (rojos y cian), como en el NEURO-SCAN
  for(let i=0;i<6;i++){const r=.86+i*.045,m=new THREE.Mesh(new THREE.TorusGeometry(r,i%3?.0035:.006,6,220),new THREE.MeshBasicMaterial({...additive(),color:i%2?0xff4d5e:0xbff9fc,opacity:i%2?.75:.6}));
    const piv=new THREE.Group();piv.position.copy(CEN);piv.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,0);piv.add(m);scene.add(piv);
    rings.push({piv,m,sp:(.08+Math.random()*.12)*(i%2?1:-1),wob:Math.random()*6});}
  const eq=new THREE.Mesh(new THREE.TorusGeometry(.62,.004,6,200),new THREE.MeshBasicMaterial({...additive(),color:0xbff9fc,opacity:.8}));eq.rotation.x=Math.PI/2+.08;eq.position.copy(CEN);scene.add(eq);rings.push({piv:eq,sp:0});
  // base: disco hexagonal, aros, luz que sube y cables
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1.35,96),new THREE.ShaderMaterial({...additive(),uniforms:U,
    vertexShader:`varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t;varying vec2 vP;float hex(vec2 p){p*=11.;vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(p,r)-h,b=mod(p-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;g=abs(g);return max(dot(g,normalize(r)),g.x);}
     void main(){float d=length(vP);float e=smoothstep(.5,.44,hex(vP));float f=smoothstep(1.35,.3,d);float w=smoothstep(.03,0.,abs(fract(d*1.6-t*.25)-.5)-.45);
      gl_FragColor=vec4(vec3(.37,.96,1.)*(e*.55+w*.35)*f+vec3(.05,.2,.25)*f*.6,1.);}`}));
  disc.rotation.x=-Math.PI/2;disc.position.y=-.88;scene.add(disc);
  for(const [r,c,o] of [[1.3,0xff4d5e,.9],[1.18,0xff4d5e,.35],[.5,0x5ef6ff,.5]]){const m=new THREE.Mesh(new THREE.TorusGeometry(r,.007,6,200),new THREE.MeshBasicMaterial({...additive(),color:c,opacity:o}));m.rotation.x=Math.PI/2;m.position.y=-.87;scene.add(m);}
  const cabM=new THREE.ShaderMaterial({uniforms:U,vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(normalize(vN),vV)),2.);gl_FragColor=vec4(vec3(.06,.07,.09)+vec3(.37,.96,1.)*f*.5,1.);}`});
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.4,s=Math.sin(a),c=Math.cos(a);
    const cv=new THREE.CatmullRomCurve3([V(s*.05,-.42,-.1+c*.05),V(s*.22,-.52,-.1+c*.22),V(s*.5,-.76,-.1+c*.5),V(s*.78,-.87,-.1+c*.78)]);
    brain.add(new THREE.Mesh(new THREE.TubeGeometry(cv,40,.011,8),cabM));}
  setCounts(counts);}

// ---------- engramas por zona ----------
function setCounts(c){counts=[0,1,2,3].map(i=>+(c?.[i]??c?.[ZK[i]]??0)||0);if(!eng)return updLabels();
  const P=[],S=[],Z=[],C=[];
  for(let z=0;z<4;z++){const L=pool.filter(p=>p.z===z),n=Math.min(48,counts[z]),col=new THREE.Color(ZONAS[z].c);
    for(let i=0;i<n&&L.length;i++){const p=L[(i*2654435761>>>0)%L.length];const w=p.v.clone().addScaledVector(p.n,.045);P.push(w.x,w.y,w.z);S.push(Math.random());Z.push(z);C.push(col.r,col.g,col.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('aS',new THREE.Float32BufferAttribute(S,1));
  g.setAttribute('aZ',new THREE.Float32BufferAttribute(Z,1));g.setAttribute('aC',new THREE.Float32BufferAttribute(C,3));eng.geometry.dispose();eng.geometry=g;updLabels();}
const ZK=['constructos','aprendizaje','recuerdos','chip'];

// ---------- etiquetas con línea guía ----------
const ANC=[[V(0,.2,.56)],[V(0,.46,-.2)],[V(.6,-.2,.06),V(-.6,-.2,.06)],[V(0,-.52,-.04)]];
let labs=[];
function updLabels(){if(!labelBox)return;labelBox.querySelectorAll('.r3l').forEach(e=>e.remove());
  labs=ZONAS.map((z,i)=>{const d=document.createElement('div');d.className='r3l';d.dataset.z=i;
    d.innerHTML=`<b>${z.n}</b><small>ZONA 0${i+1} · ${z.s}${counts[i]?' · '+counts[i]:''}</small>`;d.onclick=e=>{e.stopPropagation();pick(i);};labelBox.appendChild(d);return d;});tintLabels();}
function tintLabels(){labs.forEach((d,i)=>{d.classList.toggle('on',U.sel.value===i);d.classList.toggle('hv',U.hov.value===i);});}
const tmp=new THREE.Vector3(),camDir=new THREE.Vector3();
function placeLabels(){if(!labs.length||!host)return;const W=host.clientWidth,H=host.clientHeight;let lines='';
  camDir.copy(camera.position).sub(brain.localToWorld(CEN.clone())).normalize();
  let tR=true;labs.forEach((d,i)=>{let best=null,bd=-9;for(const a of ANC[i]){const w=brain.localToWorld(a.clone()),n=w.clone().sub(brain.localToWorld(CEN.clone())).normalize(),dd=i===3?.6:n.dot(camDir);if(dd>bd){bd=dd;best=w;}}
    tmp.copy(best).project(camera);const x=(tmp.x*.5+.5)*W,y=(-tmp.y*.5+.5)*H,right=i===3?!tR:x>W/2;if(i===2)tR=right;const lx=right?Math.min(W-d.offsetWidth-8,x+70):Math.max(d.offsetWidth+8,x-70),ly=y-34+(i===3?46:0);
    const op=Math.max(.28,Math.min(1,bd*1.4+.7)),on=U.sel.value===i||U.hov.value===i;
    d.style.left=lx+'px';d.style.top=ly+'px';d.classList.toggle('r',!right);d.style.opacity=on?1:op;
    const col=on?'#f3c84b':'rgba(230,250,255,'+(.35+op*.4)+')';
    lines+=`<polyline points="${x},${y} ${x+(right?28:-28)},${ly} ${lx},${ly}" fill="none" stroke="${col}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="${on?4:3}" fill="none" stroke="${col}"/><circle cx="${x}" cy="${y}" r="1.4" fill="${col}"/>`;});
  svg.innerHTML=lines;}

// ---------- interacción ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function zoneAt(e){const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);
  const h=ray.intersectObjects(hits,false)[0];if(!h)return -1;if(!h.object.userData.cortex)return 3;return zoneOf(brain.worldToLocal(h.point.clone()));}
const VISTA=[[0,.15],[.85,.5],[1.45,.08],[.35,-.05]];
function pick(z,fromCode){U.sel.value=z;tintLabels();if(z>=0){let y=VISTA[z][0];if(z===2&&Math.cos(yaw)*Math.sin(yaw)<0)y=-y;
  tYaw=yaw+Math.atan2(Math.sin(y-yaw),Math.cos(y-yaw));tPitch=VISTA[z][1];tFocus.set(0,z===3?-.3:-.08,0);tDist=3.6;idleT=performance.now()+7000;pulse(z,1800);}
  if(!fromCode)onPick(z);}
function bind(el){let d=null,moved=0;
  el.addEventListener('pointerdown',e=>{d={x:e.clientX,y:e.clientY};moved=0;dragging=true;el.setPointerCapture(e.pointerId);el.style.cursor='grabbing';});
  el.addEventListener('pointermove',e=>{if(d){const dx=e.clientX-d.x,dy=e.clientY-d.y;moved+=Math.abs(dx)+Math.abs(dy);tYaw-=dx*.008;tPitch=Math.max(-.5,Math.min(1.1,tPitch+dy*.006));d={x:e.clientX,y:e.clientY};idleT=performance.now()+5000;return;}
    const z=zoneAt(e);if(z!==U.hov.value){U.hov.value=z;tintLabels();}el.style.cursor=z>=0?'pointer':'grab';});
  const up=e=>{if(!d)return;dragging=false;el.style.cursor='grab';if(moved<6){const z=zoneAt(e);if(z>=0)pick(z);}d=null;};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',()=>{d=null;dragging=false;});
  el.addEventListener('pointerleave',()=>{if(!d){U.hov.value=-1;tintLabels();}});
  el.addEventListener('wheel',e=>{e.preventDefault();tDist=Math.max(2.4,Math.min(6,tDist*(1+Math.sign(e.deltaY)*.1)));},{passive:false});}

function pulse(z,ms=2500){if(z>=0&&z<4)pulses[z]=performance.now()+ms;actT=performance.now()+ms;}
function size(){if(!host||!renderer)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;
  camera.fov=Math.min(58,w/h<1.25?32*1.25/(w/h):32);camera.updateProjectionMatrix();const px=renderer.getPixelRatio()*Math.min(1.4,h/520);for(const m of [engMat])m.uniforms.px.value=px;
  brain.children.forEach(c=>{if(c.isPoints&&c.material.uniforms?.px)c.material.uniforms.px.value=px;});}
const visible=()=>host&&host.isConnected&&host.offsetParent!==null&&!document.hidden;
function loop(){raf=requestAnimationFrame(loop);if(!visible())return;const now=performance.now(),t=now/1000;frame++;
  if(!dragging&&now>idleT)tYaw+=.0028;
  yaw+=(tYaw-yaw)*.08;pitch+=(tPitch-pitch)*.08;dist+=(tDist-dist)*.07;focus.lerp(tFocus,.08);
  camera.position.set(focus.x+Math.sin(yaw)*Math.cos(pitch)*dist,focus.y+Math.sin(pitch)*dist,focus.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(focus);
  const piensa=document.body.classList.contains('pensando');const target=piensa?1:now<actT?.75:.18;act+=(target-act)*.05;U.act.value=act;U.t.value=t;
  // una zona que recibe algo (un recuerdo nuevo, un constructo que se asoma, una medida) late un momento
  let pz=-1;for(let z=0;z<4;z++)if(now<pulses[z])pz=z;if(pz>=0&&U.sel.value!==pz&&U.hov.value!==pz)U.hov.value=Math.sin(t*9)>0?pz:-1;else if(pz<0&&U.hov.value>=0&&!host.matches(':hover'))U.hov.value=-1;
  for(const r of rings)if(r.m){r.m.rotation.z+=r.sp*.016*(1+act);r.piv.rotation.x+=Math.sin(t*.2+r.wob)*.0008;r.piv.rotation.y+=.0015;}
  renderer.render(scene,camera);placeLabels();}

const css=document.createElement('style');css.textContent=`.r3d{position:relative;width:100%;height:100%;cursor:grab;touch-action:none;overflow:hidden}
.r3d canvas{width:100%!important;height:100%!important;display:block}
.r3lab{position:absolute;inset:0;pointer-events:none}.r3lab svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.r3l{position:absolute;pointer-events:auto;transform:translateY(-100%);cursor:pointer;padding:2px 2px 4px;white-space:nowrap;transition:opacity .2s}
.r3l.r{transform:translate(-100%,-100%);text-align:right}
.r3l b{display:block;font:600 11px/1.2 var(--sans);letter-spacing:.08em;color:#f2fbff;text-transform:uppercase;text-shadow:0 0 6px rgba(0,0,0,.9)}
.r3l small{display:block;font:9px/1.2 var(--mono);letter-spacing:.12em;color:#d6c24a;text-transform:uppercase}
.r3l:hover b,.r3l.hv b{color:#fff2a8}.r3l.on b{color:#f3c84b}.r3l.on small{color:#5ef6ff}`;
document.head.appendChild(css);

function attach(el){
  if(!renderer){try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){return false;}
    renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setClearColor(0x000000,0);build();bind(renderer.domElement);
    labelBox=document.createElement('div');labelBox.className='r3lab';svg=document.createElementNS('http://www.w3.org/2000/svg','svg');labelBox.appendChild(svg);
    addEventListener('resize',size);loop();}
  host=el;el.classList.add('r3d');el.prepend(labelBox);el.prepend(renderer.domElement);new ResizeObserver(size).observe(el);size();updLabels();return true;}

window.Relic3D={attach,zonas:ZONAS,select:z=>pick(z,true),onPick(fn){onPick=fn;},setCounts,pulse,
  stats:()=>({rot:((yaw*180/Math.PI)%360+360)%360,frame,act})};
dispatchEvent(new Event('relic3d:ready'));
