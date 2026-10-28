// ================= MUNDO (enlace satelital: clima, mapa, tráfico y cámaras públicas) =================
// Capri sabe si va a llover (Open-Meteo, gratis y sin llave), ve el mapa (OpenStreetMap/CARTO con Leaflet), el tráfico
// (Waze en vivo para mirarlo tú; TomTom con llave gratis para que Capri lo lea y lo pinte en el mapa) y cámaras PÚBLICAS
// que sus dueños comparten en Windy.com (llave gratis). Nunca busca cámaras privadas, con contraseña o expuestas por error.
// Etiquetas ocultas: <<mundo: clima | lugar>>, <<mundo: trafico | lugar>>, <<mundo: camaras | lugar>>, <<mundo: mapa | lugar>>.
// La ubicación solo con tu permiso (o escribiendo tu colonia/ciudad); se queda en esta computadora.
(()=>{
const mu=Object.assign({on:false,lugar:null,tt:'',wy:'',avisos:true,ultAviso:0},store.get('mundo',{}));
const save=()=>store.set('mundo',mu);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=t=>String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hora=s=>String(s).slice(11,16);
const dia=(t,i)=>i===0?'hoy':i===1?'mañana':new Date(t+'T12:00').toLocaleDateString('es-MX',{weekday:'long'});
async function getJ(url,opt={},ms=6000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{...opt,signal:c.signal});if(!r.ok){const e=new Error('HTTP '+r.status);e.status=r.status;throw e;}return await r.json();}finally{clearTimeout(t);}}

// ---------- lugares ----------
async function geocode(q){q=String(q||'').trim();if(!q)return null;
  try{const j=await getJ('https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&format=json&name='+encodeURIComponent(q.split(',')[0]));
    const g=j.results?.[0];if(g&&!q.includes(',')&&norm(g.name)===norm(q))return {lat:g.latitude,lon:g.longitude,nombre:[g.name,g.admin1,g.country_code==='MX'?'':g.country].filter(Boolean).join(', ')};}catch(e){}
  try{const j=await getJ('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q='+encodeURIComponent(q));
    const g=j[0];if(g)return {lat:+g.lat,lon:+g.lon,nombre:g.display_name.split(',').slice(0,3).join(',').trim()};}catch(e){}
  return null;}
async function nombreDe(lat,lon){try{const j=await getJ(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=15&accept-language=es&lat=${lat}&lon=${lon}`);
  const a=j.address||{};return [a.suburb||a.neighbourhood||a.quarter||a.village,a.city||a.town||a.county,a.state].filter(Boolean).slice(0,2).join(', ')||'tu ubicación';}catch(e){return 'tu ubicación';}}
function miUbicacion(){return new Promise((res,rej)=>{if(!navigator.geolocation)return rej(new Error('sin GPS'));
  navigator.geolocation.getCurrentPosition(p=>res({lat:+p.coords.latitude.toFixed(4),lon:+p.coords.longitude.toFixed(4)}),e=>rej(e),{timeout:12000,maximumAge:600000});});}
async function ponLugar(L){mu.lugar=L;verL=null;save();cache.clima=cache.flujo=cache.inc=cache.cams=null;log('mundo: lugar '+L.nombre,'y');render();if(modal.classList.contains('show'))verVista(vista);refresca(true);}
const aqui=()=>mu.lugar;
let verL=null; // lugar que se está mostrando en el panel (puede ser otro que el de Kiga)
const visto=()=>verL||aqui();

// ---------- clima (Open-Meteo) ----------
const WMO={0:'despejado',1:'casi despejado',2:'medio nublado',3:'nublado',45:'neblina',48:'neblina con escarcha',51:'llovizna ligera',53:'llovizna',55:'llovizna fuerte',56:'llovizna helada',57:'llovizna helada fuerte',61:'lluvia ligera',63:'lluvia',65:'lluvia fuerte',66:'lluvia helada',67:'lluvia helada fuerte',71:'nieve ligera',73:'nieve',75:'nieve fuerte',77:'granizo fino',80:'chubascos ligeros',81:'chubascos',82:'chubascos fuertes',85:'chubascos de nieve',86:'nevada fuerte',95:'tormenta eléctrica',96:'tormenta con granizo',99:'tormenta con granizo fuerte'};
const cache={clima:null,flujo:null,inc:null,cams:null};
async function clima(L){const j=await getJ(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&timezone=auto&forecast_days=3`+
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day'+
  '&minutely_15=precipitation,precipitation_probability&forecast_minutely_15=12'+
  '&hourly=precipitation_probability,precipitation,weather_code,temperature_2m&forecast_hours=12'+
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum');
  return {ts:Date.now(),L,j,txt:resumenClima(j,L),lluvia:lluviaPronto(j)};}
// ¿llueve en las próximas ~3 h? → {cuando:'14:30', prob, mm} o null
function lluviaPronto(j){const m=j.minutely_15||{},h=j.hourly||{};
  for(let i=0;i<(m.time||[]).length;i++)if((m.precipitation?.[i]??0)>=0.2||(m.precipitation_probability?.[i]??0)>=60)return {cuando:hora(m.time[i]),prob:m.precipitation_probability?.[i]??null,mm:m.precipitation?.[i]??0};
  for(let i=0;i<Math.min(3,(h.time||[]).length);i++)if((h.precipitation_probability?.[i]??0)>=60||(h.precipitation?.[i]??0)>=0.5)return {cuando:hora(h.time[i]),prob:h.precipitation_probability?.[i]??null,mm:h.precipitation?.[i]??0};
  return null;}
function resumenClima(j,L){const c=j.current||{},h=j.hourly||{},d=j.daily||{};
  const ahora=`${Math.round(c.temperature_2m)}°C (se siente ${Math.round(c.apparent_temperature)}°), ${WMO[c.weather_code]||'?'}, humedad ${c.relative_humidity_2m}%, viento ${Math.round(c.wind_speed_10m)} km/h`+(c.precipitation>0?`, lloviendo ${c.precipitation} mm`:'');
  const ll=lluviaPronto(j);let prox='';
  const hs=(h.time||[]).map((t,i)=>({t:hora(t),p:h.precipitation_probability?.[i]??0,mm:h.precipitation?.[i]??0,w:h.weather_code?.[i]})).filter(x=>x.p>=40||x.mm>=0.3);
  if(ll)prox=`LLUVIA PRONTO: desde ~${ll.cuando}`+(ll.prob!=null?` (${ll.prob}% de probabilidad)`:'');
  else if(hs.length)prox=`posible lluvia más tarde: ${hs.slice(0,4).map(x=>`${x.t} ${x.p}%`).join(', ')}`;
  else prox='sin lluvia en las próximas 12 h';
  const dias=(d.time||[]).map((t,i)=>`${dia(t,i)} ${Math.round(d.temperature_2m_min[i])}–${Math.round(d.temperature_2m_max[i])}°, ${WMO[d.weather_code[i]]||'?'}, prob. de lluvia ${d.precipitation_probability_max?.[i]??'?'}%`).join(' · ');
  return `${L.nombre}: ahora ${ahora}. ${prox}. ${dias}.`;}

// ---------- tráfico (TomTom, llave gratis) ----------
const CAT={0:'incidente',1:'accidente',2:'neblina',3:'condición peligrosa',4:'lluvia',5:'hielo',6:'embotellamiento',7:'carril cerrado',8:'calle cerrada',9:'obras',10:'viento',11:'inundación',14:'vehículo descompuesto'};
const MAG={1:'leve',2:'moderado',3:'fuerte',4:'cierre'};
async function flujo(L){if(!mu.tt)return null;const j=await getJ(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?unit=KMPH&point=${L.lat},${L.lon}&key=${encodeURIComponent(mu.tt)}`);
  const f=j.flowSegmentData;if(!f)return null;const r=f.freeFlowSpeed?f.currentSpeed/f.freeFlowSpeed:1;
  return {ts:Date.now(),L,r,txt:f.roadClosure?'la calle principal más cercana está CERRADA':`vialidad más cercana: ${f.currentSpeed} km/h (sin tráfico ${f.freeFlowSpeed}), ${r>=.85?'fluido':r>=.6?'algo lento':r>=.35?'lento':'muy lento'}`+(f.currentTravelTime>f.freeFlowTravelTime+30?`, +${Math.round((f.currentTravelTime-f.freeFlowTravelTime)/60)} min en ese tramo`:'')};}
async function incidentes(L,km=6){if(!mu.tt)return null;const dLa=km/111,dLo=km/(111*Math.cos(L.lat*Math.PI/180));
  const bbox=[L.lon-dLo,L.lat-dLa,L.lon+dLo,L.lat+dLa].map(x=>x.toFixed(4)).join(',');
  const fields='{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description},from,to,length,delay,roadNumbers}}}';
  const j=await getJ(`https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&fields=${encodeURIComponent(fields)}&language=es-ES&timeValidityFilter=present&key=${encodeURIComponent(mu.tt)}`);
  const I=(j.incidents||[]).map(x=>{const p=x.properties||{},g=x.geometry||{};const c=g.type==='Point'?g.coordinates:(g.coordinates||[])[Math.floor((g.coordinates||[]).length/2)];
    return {cat:CAT[p.iconCategory]||'incidente',mag:p.magnitudeOfDelay||0,desc:p.events?.[0]?.description||'',de:p.from||'',a:p.to||'',delay:p.delay||0,via:(p.roadNumbers||[]).join('/'),ll:c?[c[1],c[0]]:null};})
    .sort((a,b)=>(b.mag%4)-(a.mag%4)||b.delay-a.delay);
  const top=I.filter(x=>x.mag>=2||x.mag===4||/cerrad|accidente|inunda/.test(x.cat)).slice(0,6);
  return {ts:Date.now(),L,I,txt:!I.length?`sin incidentes reportados a ${km} km`:`${I.length} incidente(s) a ${km} km; lo más fuerte: `+(top.length?top:I.slice(0,3)).map(x=>`${x.cat}${x.mag?' '+MAG[x.mag]:''}${x.de?` en ${x.de}`:''}${x.a?` → ${x.a}`:''}${x.delay>60?` (+${Math.round(x.delay/60)} min)`:''}`).join('; ')};}

// ---------- cámaras públicas (Windy Webcams, llave gratis) ----------
async function camaras(L,km=30){if(!mu.wy)return null;
  const j=await getJ(`https://api.windy.com/webcams/api/v3/webcams?nearby=${L.lat},${L.lon},${km}&limit=12&lang=es&include=images,location,player,urls`,{headers:{'x-windy-api-key':mu.wy}});
  const C=(j.webcams||[]).filter(w=>!w.status||w.status==='active').map(w=>({id:w.webcamId,t:w.title||'Cámara',city:w.location?.city||'',img:w.images?.current?.preview||w.images?.current?.thumbnail||'',
    player:w.player?.live||w.player?.day||'',url:w.urls?.detail||'https://www.windy.com/webcams/'+w.webcamId,ll:w.location?[w.location.latitude,w.location.longitude]:null}));
  return {ts:Date.now(),L,C,txt:!C.length?`no hay cámaras públicas registradas a ${km} km`:`${C.length} cámara(s) pública(s) cerca: `+C.slice(0,6).map(c=>c.t+(c.city?` (${c.city})`:'')).join('; ')};}

// ---------- refrescar ----------
let refrescando=null;
async function refresca(forzar){const L=aqui();if(!L)return;if(refrescando)return refrescando;
  refrescando=(async()=>{const viejo=k=>forzar||!cache[k]||Date.now()-cache[k].ts>(k==='clima'?15:10)*60000;
    const tareas=[];if(viejo('clima'))tareas.push(clima(L).then(x=>cache.clima=x));if(mu.tt&&viejo('flujo'))tareas.push(flujo(L).then(x=>cache.flujo=x));
    await Promise.allSettled(tareas);pintaDatos();revisaLluvia();})().finally(()=>refrescando=null);return refrescando;}
async function revisaLluvia(){const c=cache.clima;if(!mu.on||!mu.avisos||!c?.lluvia||Date.now()-mu.ultAviso<3*3600000)return;
  if(c.j.current?.precipitation>0.3)return; // ya está lloviendo: no es noticia
  mu.ultAviso=Date.now();save();notify?.(`🌧 Va a llover en ${c.L.nombre} como a las ${c.lluvia.cuando}`);
  for(let i=0;i<60&&busy;i++)await sleep(1000);if(busy)return;
  respond(`(Aviso de tu enlace satelital: va a llover en ${c.L.nombre} como a las ${c.lluvia.cuando}${c.lluvia.prob!=null?`, ${c.lluvia.prob}% de probabilidad`:''}. Díselo a ${cfg.name||'Kiga'} a tu manera, en una o dos frases, como algo que notaste tú.)`,null,'idle');}
setInterval(()=>{if(mu.on&&mu.lugar)refresca();},15*60000);
if(mu.on&&mu.lugar)setTimeout(()=>refresca(),4000);

// ---------- lo que se le manda a Capri ----------
const TEMA=/lluev|llover|lluvia|llovizna|paraguas|sombrilla|clima|tiempo hace|temperatura|calor|fr[ií]o|tormenta|granizo|tr[aá]fico|tr[aá]nsito|embotell|choque|accidente|c[aá]mara|webcam|mapa|ruta|salir|calle/i;
let lastQ='';
const _respond=respond;
respond=async(u,e,m)=>{if(m==='user'||m==='voice'){lastQ=String(u||'').slice(0,400);
    if(mu.on&&mu.lugar&&(m==='voice'||TEMA.test(lastQ)))await Promise.race([refresca(),sleep(2500)]);}
  return _respond(u,e,m);};
function mundoBlock(n){if(!mu.on)return '';
  let s=`\n\nENLACE SATELITAL (módulo Mundo: clima, mapa, tráfico y cámaras públicas)`;
  s+=mu.lugar?`\nLugar de ${n}: ${mu.lugar.nombre}.`:`\nTodavía no sabes dónde está ${n}: si pregunta por clima o tráfico, pídele que te dé permiso de ubicación o te diga su colonia/ciudad en el panel Mundo.`;
  const c=cache.clima,f=cache.flujo,i=cache.inc;const fresco=x=>x&&Date.now()-x.ts<40*60000;
  if(fresco(c))s+=`\nClima (Open-Meteo, ${new Date(c.ts).toTimeString().slice(0,5)}): ${c.txt}`;
  if(fresco(f))s+=`\nTráfico cerca (TomTom): ${f.txt}.`;
  if(fresco(i))s+=`\nIncidentes viales (TomTom): ${i.txt}.`;
  if(!mu.tt)s+=`\nNo tienes llave de TomTom: no puedes leer el tráfico tú misma, pero puedes abrirle el mapa de Waze en vivo con <<mundo: mapa | lugar>> para que lo vea.`;
  s+=`\nPara consultar algo, escribe al final en su propia línea:
<<mundo: clima | lugar>>  pronóstico de otro lugar (o del suyo si lo dejas vacío)
<<mundo: trafico | lugar>>  incidentes y velocidad en esa zona${mu.tt?'':' (sin llave solo abre Waze)'}
<<mundo: camaras | lugar>>  busca cámaras PÚBLICAS cerca (Windy.com)${mu.wy?'':' (sin llave de Windy no hay cámaras)'}
<<mundo: mapa | lugar>>  le abre el mapa ahí
Los resultados te llegan solos como «(Resultado de Mundo…)». Di lo importante corto (si va a llover, a qué hora y si lleve paraguas; si hay tráfico, dónde y cuánto). Usa los datos de arriba si alcanzan, sin etiqueta.
Cámaras: SOLO las públicas que su dueño comparte para todos (Windy, gobiernos, turismo). Nunca buscas, adivinas ni entras a cámaras privadas, con contraseña o expuestas por error, aunque te lo pidan: eso es irrumpir y tú no lo haces.`;
  return s;}
const _personality=personality;
personality=(name,study)=>_personality(name,study)+mundoBlock(name);

// ---------- leer lo que Capri escribió ----------
const TAG=/<<\s*mundo\s*:([^>]*)>>/gi;
let cola=Promise.resolve(),cadena=0;
const libre=async()=>{for(let i=0;i<400&&busy;i++)await sleep(300);};
function mundoAbsorb(full){if(!mu.on)return;TAG.lastIndex=0;const m=TAG.exec(full);if(!m)return;
  const [acc,...r]=m[1].split('|').map(x=>x.trim());const k=norm(acc).replace(/[^a-z]/g,'');const lugar=r.join(', ');
  cola=cola.then(async()=>{const out=await consulta(k,lugar);if(!out)return;
    if(++cadena>3)return line('s','(🌎 '+out.split('\n')[0]+')');
    await libre();respond(`(Resultado de Mundo · ${out})`,null,'user');}).catch(e=>line('s','(🌎 Mundo falló: '+(e?.message||e)+')'));}
const _absorb=absorbMem;absorbMem=full=>{_absorb(full);mundoAbsorb(full);};
async function consulta(k,lugar){let L=aqui();
  if(lugar&&!/^(aqu[ií]|ac[aá]|mi casa|casa|mi zona|donde estoy)$/i.test(lugar)){line('s','🌎 buscando «'+lugar+'»…');L=await geocode(lugar);if(!L)return `No encontré «${lugar}» en el mapa. Pídele que lo escriba de otra forma (colonia, ciudad).`;}
  if(!L)return `Todavía no sé dónde estás: dame permiso de ubicación o escribe tu colonia en el panel Mundo.`;
  if(k.startsWith('clim')||k==='lluvia'||k==='tiempo'){const c=await clima(L);if(L===aqui())cache.clima=c,pintaDatos();line('s','🌎 clima de '+L.nombre);return 'Clima · '+c.txt;}
  if(k.startsWith('traf')||k.startsWith('tran')){abrir(L,'waze');if(!mu.tt)return `No tengo llave de TomTom, así que no puedo leer el tráfico; le abrí el mapa de Waze en vivo de ${L.nombre} para que lo vea.`;
    const [i,f]=await Promise.all([incidentes(L).catch(()=>null),flujo(L).catch(()=>null)]);if(L===aqui()){cache.inc=i;cache.flujo=f;}pintaDatos();pintaMapa(L,i);
    return `Tráfico en ${L.nombre} · `+[f?.txt,i?.txt].filter(Boolean).join('. ')+(i||f?'':'TomTom no respondió (¿llave mala o sin cupo?).')+' (Le abrí Waze en vivo.)';}
  if(k.startsWith('cam')){if(!mu.wy){abrir(L,'cams');return 'No tengo llave de Windy para buscar cámaras públicas; le abrí el panel para que la ponga (es gratis).';}
    const c=await camaras(L).catch(e=>({txt:'Windy no respondió ('+e.message+')',C:[]}));cache.cams={...c,ts:Date.now(),L};abrir(L,'cams');return `Cámaras públicas cerca de ${L.nombre} · ${c.txt}. Ya se las mostré en el panel.`;}
  if(k.startsWith('map')){abrir(L,'mapa');return `Le abrí el mapa en ${L.nombre}.`;}
  return null;}

// ---------- panel ----------
const css=document.createElement('style');css.textContent=`#mdModal .panel{max-width:780px}#mdModal h2{color:#5ef6ff;text-shadow:0 0 12px rgba(94,246,255,.4)}
#mdModal .mini{font:12px var(--mono);color:var(--ink);background:#000;border:1px solid #2a2733;padding:6px 9px;cursor:pointer}
#mdModal .mini:hover,#mdModal .mini.on{border-color:#5ef6ff;color:#5ef6ff}#mdModal .mini:disabled{opacity:.35;cursor:default}
#mdModal .card{border:1px solid #2a2733;padding:10px;font:12px/1.5 var(--mono);color:var(--ink)}#mdModal .card b{color:#5ef6ff}#mdModal .card .r{color:#ff4d5e}#mdModal .card .g{color:var(--grn)}
#mdModal .wx{display:flex;gap:14px;align-items:center;flex-wrap:wrap}#mdModal .wx .big{font:700 34px/1 var(--mono);color:#5ef6ff}
#mdModal .hrs{display:flex;gap:3px;align-items:flex-end;height:46px;margin-top:6px}#mdModal .hrs i{flex:1;background:#5ef6ff33;border-top:2px solid #5ef6ff;position:relative;min-height:2px}
#mdModal .hrs i.ll{background:#ff4d5e44;border-color:#ff4d5e}#mdModal .hrl{display:flex;gap:3px;font:10px var(--mono);color:var(--mut)}#mdModal .hrl span{flex:1;text-align:center}
#mdView{height:360px;border:1px solid #2a2733;position:relative;background:#050508}#mdView iframe,#mdView .map{position:absolute;inset:0;width:100%;height:100%;border:0}
#mdModal .tabs{display:flex;gap:5px;flex-wrap:wrap}#mdModal .cams{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
#mdModal .cam{border:1px solid #2a2733;background:#000;font:11px/1.35 var(--mono);color:var(--ink);display:flex;flex-direction:column}
#mdModal .cam img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#111;cursor:pointer}#mdModal .cam .t{padding:5px 7px;flex:1}#mdModal .cam .a{display:flex;gap:4px;padding:0 7px 7px}
#mdModal .cam .a button{flex:1;font:11px var(--mono);background:#000;color:var(--ink);border:1px solid #2a2733;cursor:pointer;padding:4px}#mdModal .cam .a button:hover{border-color:#5ef6ff;color:#5ef6ff}
#mdModal .note{font:11px/1.5 var(--mono);color:var(--mut)}#mdModal .note a{color:#5ef6ff}#mdModal .inc{max-height:150px;overflow-y:auto}
#mdView .leaflet-container{background:#050508;font:11px var(--mono)}#mdView .leaflet-control-attribution{background:#000a;color:#888}#mdView .leaflet-control-attribution a{color:#5ef6ff}
#mdView .leaflet-bar a{background:#0b0a0f;color:#5ef6ff;border-color:#2a2733}.md-pin{width:14px;height:14px;border-radius:50%;background:#ff4d5e;box-shadow:0 0 0 4px #ff4d5e44,0 0 14px #ff4d5e}
.md-inc{width:12px;height:12px;transform:rotate(45deg);background:#ffcc00;border:1px solid #000}.md-inc.m3,.md-inc.m4{background:#ff4d5e}.md-cam{font-size:16px;filter:drop-shadow(0 0 4px #5ef6ff)}`;document.head.appendChild(css);
const modal=document.createElement('div');modal.className='modal';modal.id='mdModal';modal.innerHTML=`<div class="panel"><div>
  <h2>🌎 Mundo · enlace satelital</h2>
  <small>Capri ve el clima, el mapa, el tráfico y cámaras públicas de tu zona. Tu ubicación solo con tu permiso, y se queda en esta computadora.</small>
  <label class="ck"><input type="checkbox" id="mdOn"> Activar el enlace (Capri conoce tu clima y puede consultar mapas, tráfico y cámaras públicas)</label>
  <label class="ck"><input type="checkbox" id="mdAv"> Que Capri me avise sola si va a llover</label>
  <h3>Lugar</h3>
  <div class="row" style="justify-content:flex-start"><button class="mini" id="mdGps">📍 Usar mi ubicación</button><input id="mdQ" placeholder="o escribe tu colonia, ciudad o una calle" style="flex:1;min-width:160px"><button class="mini" id="mdBus">Buscar</button></div>
  <div class="note" id="mdLug"></div>
  <h3>Clima</h3>
  <div class="card" id="mdClima"></div>
  <h3>Mapa y tráfico</h3>
  <div class="tabs"><button class="mini" data-v="mapa">🗺 Mapa</button><button class="mini" data-v="waze">🚗 Waze en vivo</button><button class="mini" data-v="cams">📷 Cámaras públicas</button><span style="flex:1"></span><button class="mini" id="mdAsk">🧠 Pregúntale a Capri</button></div>
  <div id="mdView"><div class="map" id="mdMap"></div></div>
  <div class="card inc" id="mdTraf"></div>
  <div class="cams" id="mdCams"></div>
  <h3>Llaves gratis (opcionales)</h3>
  <label>TomTom · para que Capri lea el tráfico y lo pinte en el mapa<input id="mdTt" type="password" placeholder="llave de developer.tomtom.com" autocomplete="off"></label>
  <label>Windy Webcams · para buscar cámaras públicas<input id="mdWy" type="password" placeholder="llave de api.windy.com/keys" autocomplete="off"></label>
  <div class="note">Sin tarjeta: <a href="https://developer.tomtom.com/user/register" target="_blank" rel="noopener">TomTom</a> da 20 000 consultas de tráfico al mes; <a href="https://api.windy.com/keys" target="_blank" rel="noopener">Windy</a> (elige «Webcams API») da cámaras con imagen chica y reproductor de lapsos. El clima (<a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>) y Waze no necesitan llave.<br>
  Cámaras: solo las que sus dueños publican para todos en <a href="https://www.windy.com/webcams" target="_blank" rel="noopener">Windy.com</a>. Capri no busca ni abre cámaras privadas, con contraseña o expuestas por error.</div>
  <div class="row"><button class="btn" id="mdClose">Listo</button></div>
</div></div>`;document.body.appendChild(modal);
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});
$('mdClose').onclick=()=>modal.classList.remove('show');
$('mdOn').onchange=e=>{mu.on=e.target.checked;save();pinta();if(mu.on)refresca();log('mundo '+(mu.on?'activo':'apagado'),'y');};
$('mdAv').onchange=e=>{mu.avisos=e.target.checked;save();};
$('mdTt').onchange=e=>{mu.tt=e.target.value.trim();save();cache.flujo=cache.inc=null;pintaMapa();if(mu.tt)cargaTrafico();};
$('mdWy').onchange=e=>{mu.wy=e.target.value.trim();save();cache.cams=null;if(vista==='cams')cargaCams();};
$('mdGps').onclick=async()=>{$('mdLug').textContent='Pidiendo permiso de ubicación…';
  try{const p=await miUbicacion();$('mdLug').textContent='Ubicado. Buscando el nombre de tu zona…';ponLugar({...p,nombre:await nombreDe(p.lat,p.lon)});}
  catch(e){$('mdLug').textContent='No pude usar tu ubicación ('+(e.code===1?'no diste permiso':e.message||'sin GPS')+'). Escribe tu colonia o ciudad y dale Buscar.';}};
const buscar=async()=>{const q=$('mdQ').value.trim();if(!q)return;$('mdLug').textContent='Buscando…';const L=await geocode(q);if(!L){$('mdLug').textContent='No encontré ese lugar; prueba con colonia y ciudad.';return;}$('mdQ').value='';ponLugar(L);};
$('mdBus').onclick=buscar;$('mdQ').onkeydown=e=>{if(e.key==='Enter')buscar();};
$('mdAsk').onclick=()=>{if(busy)return;modal.classList.remove('show');const L=aqui();
  respond(L?`¿Cómo está el clima y el tráfico ahorita por ${L.nombre}? ¿Va a llover?`:'Ayúdame a configurar el módulo Mundo.',null,'user');};
modal.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(b)verVista(b.dataset.v);});

// ---------- vistas: mapa (Leaflet), Waze y cámaras ----------
let map=null,capa=null,vista='mapa';
function cargaLeaflet(){if(window.L?.map)return Promise.resolve();return new Promise((res,rej)=>{
  const l=document.createElement('link');l.rel='stylesheet';l.href='vendor/leaflet/leaflet.css';document.head.appendChild(l);
  const s=document.createElement('script');s.src='vendor/leaflet/leaflet.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
async function pintaMapa(L0,inc){if(vista!=='mapa')return;const L=L0||visto();if(!L){$('mdMap').innerHTML='<div class="note" style="padding:14px">Elige un lugar arriba para ver el mapa.</div>';return;}
  try{await cargaLeaflet();}catch(e){$('mdMap').textContent='No cargó el mapa.';return;}
  if(!map){$('mdMap').innerHTML='';map=window.L.map('mdMap',{zoomControl:true,attributionControl:true});
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd',attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank">CARTO</a>'}).addTo(map);
    map.on('click',e=>{const p={lat:+e.latlng.lat.toFixed(4),lon:+e.latlng.lng.toFixed(4)};$('mdLug').innerHTML=`¿Usar este punto? <button class="mini" id="mdAqui">Sí, aquí</button>`;$('mdAqui').onclick=async()=>ponLugar({...p,nombre:await nombreDe(p.lat,p.lon)});});}
  if(capa)capa.remove();capa=window.L.layerGroup().addTo(map);
  if(mu.tt){window.L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0-dark/{z}/{x}/{y}.png?key=${encodeURIComponent(mu.tt)}`,{maxZoom:22,opacity:.85,attribution:'Tráfico © TomTom'}).addTo(capa);}
  window.L.marker([L.lat,L.lon],{icon:window.L.divIcon({className:'',html:'<div class="md-pin"></div>',iconSize:[14,14]})}).addTo(capa).bindTooltip(esc(L.nombre));
  for(const x of (inc||(L===aqui()?cache.inc:null))?.I||[])if(x.ll)window.L.marker(x.ll,{icon:window.L.divIcon({className:'',html:`<div class="md-inc m${x.mag}"></div>`,iconSize:[12,12]})}).addTo(capa).bindTooltip(esc(`${x.cat}${x.mag?' '+MAG[x.mag]:''}${x.de?' · '+x.de:''}${x.desc?' · '+x.desc:''}`));
  for(const c of cache.cams?.C||[])if(c.ll)window.L.marker(c.ll,{icon:window.L.divIcon({className:'',html:'<div class="md-cam">📷</div>',iconSize:[18,18]})}).addTo(capa).bindTooltip(esc(c.t)).on('click',()=>{verVista('cams');verCam(c);});
  map.setView([L.lat,L.lon],map.getZoom()&&L0==null?map.getZoom():14);setTimeout(()=>map.invalidateSize(),60);}
function verVista(v){vista=v;modal.querySelectorAll('.tabs [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  const V=$('mdView'),L=visto();V.querySelector('iframe')?.remove();$('mdMap').style.display=v==='mapa'?'':'none';$('mdCams').style.display=v==='cams'?'':'none';
  if(v==='mapa')pintaMapa();
  if(v==='waze'){if(!L){$('mdTraf').textContent='Elige un lugar arriba para ver Waze.';return;}
    const f=document.createElement('iframe');f.src=`https://embed.waze.com/es/iframe?zoom=14&lat=${L.lat}&lon=${L.lon}&pin=1`;f.allowFullscreen=true;f.title='Waze en vivo';V.appendChild(f);}
  if(v==='cams'){V.style.display='none';cargaCams();}else V.style.display='';}
function verCam(c){const V=$('mdView');V.style.display='';V.querySelector('iframe')?.remove();$('mdMap').style.display='none';
  if(c.player){const f=document.createElement('iframe');f.src=c.player;f.allowFullscreen=true;f.title=c.t;V.appendChild(f);}else window.open(c.url,'_blank');}
async function cargaCams(){const box=$('mdCams'),L=visto();
  if(!L){box.innerHTML='<div class="note">Elige un lugar arriba.</div>';return;}
  if(!mu.wy){box.innerHTML='<div class="note">Pon tu llave gratis de Windy abajo para ver las cámaras públicas de tu zona. Mientras, puedes verlas en <a href="https://www.windy.com/webcams" target="_blank" rel="noopener">windy.com/webcams</a>.</div>';return;}
  if(!cache.cams||cache.cams.L!==L||Date.now()-cache.cams.ts>8*60000){box.innerHTML='<div class="note">Buscando cámaras públicas…</div>';  // las imágenes gratis caducan a los 10 min
    try{cache.cams=await camaras(L);}catch(e){box.innerHTML=`<div class="note">Windy no respondió (${esc(e.message)}${e.status===401||e.status===403?': revisa la llave':''}).</div>`;return;}}
  const C=cache.cams.C;
  box.innerHTML=(C.length?C.map((c,i)=>`<div class="cam"><img src="${esc(c.img)}" alt="" data-i="${i}" referrerpolicy="no-referrer"><div class="t">${esc(c.t)}${c.city?`<br><span style="color:var(--mut)">${esc(c.city)}</span>`:''}</div>
    <div class="a"><button data-ver="${i}">▶ Ver</button><button data-capri="${i}">👁 Capri</button></div></div>`).join(''):'<div class="note">No hay cámaras públicas registradas a 30 km.</div>')+
    '<div class="note" style="grid-column:1/-1">Webcams provided by <a href="https://www.windy.com/" target="_blank" rel="noopener">windy.com</a> — <a href="https://www.windy.com/webcams/add" target="_blank" rel="noopener">add a webcam</a></div>';}
$('mdCams').addEventListener('click',async e=>{const C=cache.cams?.C||[];const v=e.target.closest('[data-ver],img[data-i]'),k=e.target.closest('[data-capri]');
  if(v){const c=C[+(v.dataset.ver??v.dataset.i)];if(c)verCam(c);return;}
  if(k){const c=C[+k.dataset.capri];if(!c||busy)return;k.textContent='…';
    try{const b=await fetch(c.img,{referrerPolicy:'no-referrer'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.blob();});
      const data=b64(await b.arrayBuffer());modal.classList.remove('show');
      respond(`(Te paso la imagen de una cámara pública de Windy: «${c.t}»${c.city?' en '+c.city:''}. Dile a ${cfg.name||'Kiga'} qué ves: cómo está el cielo, si llueve, si se ve tráfico o gente. Corto.)`,{inlineData:{mimeType:b.type||'image/jpeg',data}},'user');}
    catch(err){line('s','(🌎 No pude pasarle esa imagen a Capri: el servidor de la cámara no lo permite. Ábrela con ▶ Ver.)');}
    k.textContent='👁 Capri';}});
async function cargaTrafico(){const L=aqui();if(!L||!mu.tt)return;$('mdTraf').innerHTML='<span class="note">Leyendo tráfico…</span>';
  const [i,f]=await Promise.all([incidentes(L).catch(e=>({err:e})),flujo(L).catch(e=>({err:e}))]);
  if(!i.err)cache.inc=i;if(!f?.err&&f)cache.flujo=f;pintaDatos();pintaMapa();}

// ---------- pintar ----------
function pintaDatos(){if(!modal.classList.contains('show'))return;const c=cache.clima;
  if(!c||c.L!==aqui()){$('mdClima').innerHTML=aqui()?'<span class="note">Leyendo el clima…</span>':'<span class="note">Elige un lugar.</span>';}
  else{const j=c.j,x=j.current,h=j.hourly||{},ll=c.lluvia;
    const ps=(h.time||[]).map((t,i)=>({t:hora(t),p:h.precipitation_probability?.[i]??0}));
    $('mdClima').innerHTML=`<div class="wx"><div class="big">${Math.round(x.temperature_2m)}°</div><div><b>${esc(WMO[x.weather_code]||'?')}</b> · se siente ${Math.round(x.apparent_temperature)}° · humedad ${x.relative_humidity_2m}% · viento ${Math.round(x.wind_speed_10m)} km/h<br>`+
      (ll?`<span class="r">🌧 lluvia desde ~${ll.cuando}${ll.prob!=null?` (${ll.prob}%)`:''}</span>`:`<span class="g">sin lluvia cerca</span>`)+`</div></div>
      <div class="hrs" title="probabilidad de lluvia por hora">${ps.map(p=>`<i class="${p.p>=50?'ll':''}" style="height:${Math.max(2,p.p*.46)}px" title="${p.t} · ${p.p}%"></i>`).join('')}</div>
      <div class="hrl">${ps.map((p,i)=>`<span>${i%3?'':p.t}</span>`).join('')}</div>
      <div class="note" style="margin-top:6px">${esc((j.daily?.time||[]).map((t,i)=>`${dia(t,i)} ${Math.round(j.daily.temperature_2m_min[i])}–${Math.round(j.daily.temperature_2m_max[i])}° lluvia ${j.daily.precipitation_probability_max?.[i]??'?'}%`).join(' · '))} · <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a></div>`;}
  const f=cache.flujo,i=cache.inc;
  $('mdTraf').innerHTML=!mu.tt?'<span class="note">Sin llave de TomTom: mira el tráfico en «🚗 Waze en vivo». Con la llave, Capri también lo lee y lo pinta en el mapa.</span>':
    (f?`<div>🚦 ${esc(f.txt)}</div>`:'')+(i?`<div>⚠ ${esc(i.txt)}</div>`+(i.I.slice(0,10).map(x=>`<div class="note">· ${esc(x.cat)}${x.mag?' '+MAG[x.mag]:''}${x.de?' · '+esc(x.de):''}${x.a?' → '+esc(x.a):''}${x.delay>60?` · +${Math.round(x.delay/60)} min`:''}</div>`).join('')):'<span class="note"><button class="mini" id="mdTrB">⟳ Leer tráfico de la zona</button></span>');
  $('mdTrB')?.addEventListener('click',cargaTrafico);}
function render(){$('mdOn').checked=mu.on;$('mdAv').checked=mu.avisos;$('mdTt').value=mu.tt;$('mdWy').value=mu.wy;
  $('mdLug').innerHTML=(verL?`👁 viendo <b style="color:#5ef6ff">${esc(verL.nombre)}</b> · `:'')+(mu.lugar?`📍 <b style="color:#5ef6ff">${esc(mu.lugar.nombre)}</b> <span style="color:var(--mut)">(${mu.lugar.lat}, ${mu.lugar.lon})</span>`:'Todavía no hay lugar.');pintaDatos();}
function abrir(L,v){if(document.body.classList.contains('desk'))expand();modal.classList.add('show');render();
  verL=L&&L!==aqui()?L:null;verVista(v||vista);
  if(!L||L===aqui())refresca();}
window.openMundo=()=>abrir(null,vista);
window.mundoInfo=()=>({on:mu.on,lugar:mu.lugar?.nombre||'',tt:!!mu.tt,wy:!!mu.wy});

// ---------- comandos en el chat ----------
const _send=send;
send=async v=>{const t=(v||'').trim(),k=t.toLowerCase();cadena=0;
  if(/^(mundo|mapa)$/.test(k)&&!busy){line('u',t);window.openMundo();return;}
  await _send(v);
  if(k==='help')line('t','  mundo — Enlace satelital: clima, mapa, tráfico y cámaras públicas');};

// botón oculto para CIBERWARE (se marca «act» con el enlace activo)
const btn=document.createElement('button');btn.id='bMundo';btn.className='btn';btn.style.display='none';btn.title='Mundo';btn.onclick=window.openMundo;
document.querySelector('.dock .tools')?.appendChild(btn);
function pinta(){btn.classList.toggle('act',mu.on);}
pinta();
})();
