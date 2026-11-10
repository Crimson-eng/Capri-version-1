// 2.20 — Cerebro Python (opcional). Si está corriendo en esta PC (capri-cerebro), Capri le pasa su memoria y su plática
// para que siga viva con la app cerrada y la memoria se comparta entre dispositivos. Si no está, aquí no pasa nada.
(()=>{
const S=Object.assign({url:'http://127.0.0.1:47824',token:'',key:false,on:true,dev:''},store.get('cerebroPy',{}));
if(!S.dev){S.dev='app-'+Math.random().toString(36).slice(2,10);store.set('cerebroPy',S);}
const guarda=()=>store.set('cerebroPy',S);
let vivo=false,sinc=false,fallas=0,timer=null,histTs=+(store.get('cerebroPyHistTs',0))||(history.length?1:0);
// anota cuándo cambió la plática en esta app (para saber cuál es la más nueva)
const _set=store.set;
store.set=function(k,v){if(k==='history'){histTs=Date.now();_set.call(store,'cerebroPyHistTs',histTs);}return _set.call(store,k,v);};
const ponHist=(h,ts)=>{history=h;_set.call(store,'history',h);histTs=ts;_set.call(store,'cerebroPyHistTs',ts);};
const H=()=>({'Content-Type':'application/json','X-Capri':'1',...(S.token?{'X-Capri-Token':S.token}:{})});
const post=(r,b,ms=5000)=>fetch(S.url+r,{method:'POST',headers:H(),body:JSON.stringify(b),signal:AbortSignal.timeout(ms)}).then(x=>{if(!x.ok)throw new Error('cerebro '+x.status);return x.json();});
// su personalidad tal cual, con un hueco donde el cerebro pone la memoria al día
function persona(){try{const n=cfg.name||'Kiga',m=memoryPrompt(n),p=personality(n,'');return p.includes(m)?p.replace(m,'{{MEMORIA}}'):p;}catch(e){return '';}}
const llave=h=>(h.t||'').trim().toLowerCase();
async function sync(){
  if(!S.on||sinc)return;sinc=true;
  try{
    const enviados=new Set(M().hechos.map(llave));
    const c={nombre:cfg.name||'Kiga',modelo:cfg.model||'',modelos:cfg.models||[],ollama_modelo:window.cerebroInfo?.().modelo||''};
    if(S.key)c.key=cfg.key||'';
    const j=await post('/api/sync',{dispositivo:S.dev,rev:S.rev||'',mem:mem,history:history.slice(-60),hist_ts:histTs,persona:persona(),cfg:c});
    if(!vivo){vivo=true;log('🧠 cerebro Python conectado','y');
      if(!store.get('cerebroPyAviso',false)){_set.call(store,'cerebroPyAviso',true);
        line('s','(🧠 Encontré mi cerebro Python en tu PC. Ya comparto mi memoria con él. Para que pueda hablarte con la app cerrada usando Gemini escribe «cerebro key sí»; si no, usará Ollama si lo tienes. Escribe «cerebro» para ver más.)');}}
    fallas=0;
    if(j.mem&&Array.isArray(j.mem.hechos)){ // la memoria fusionada; lo que se haya guardado mientras viajaba se queda
      const nuevos=M().hechos.filter(h=>!enviados.has(llave(h))),tiene=new Set(j.mem.hechos.map(llave));
      mem=j.mem;for(const h of nuevos)if(!tiene.has(llave(h)))mem.hechos.push(h);_set.call(store,'mem',mem);S.rev=j.rev||'';guarda();}
    if(Array.isArray(j.history)&&j.hist_ts>histTs&&!busy)ponHist(j.history,j.hist_ts);
    if(j.buzon?.length){const ids=[];
      line('s','(🧠 mientras la app estaba cerrada, Capri te dijo:)');
      for(const b of j.buzon){ids.push(b.id);line('c','CAPRI · '+new Date(b.ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}));line('t',b.texto);}
      post('/api/visto',{ids}).catch(()=>{});}
  }catch(e){if(vivo){vivo=false;log('🧠 cerebro Python desconectado','w');}fallas++;}
  finally{sinc=false;programa();}}
// conectado: cada 20 s (también es su señal de «la app está abierta, no hables tú»). Sin cerebro: revisa calladita cada 1-3 min
function programa(){clearTimeout(timer);if(!S.on)return;timer=setTimeout(sync,vivo?20000:fallas<3?60000:180000);}
let pronto=null;addEventListener('capri:recuerdo',()=>{if(!vivo)return;clearTimeout(pronto);pronto=setTimeout(sync,2500);});
addEventListener('pagehide',()=>{if(vivo)try{fetch(S.url+'/api/sync',{method:'POST',keepalive:true,headers:H(),body:JSON.stringify({dispositivo:S.dev,mem:mem,history:history.slice(-60),hist_ts:histTs})});}catch(e){}});
setTimeout(sync,4000); // después del arranque, para no frenar que Capri abra rápido

window.cerebroPyInfo=()=>({vivo,url:S.url,key:S.key,on:S.on});

// ---------- comandos en el chat ----------
const _send=send;
send=async v=>{const t=(v||'').trim(),k=t.toLowerCase();
  if(/^cerebro(\s+(key|abrir|url|apagar|prender)\b.*)?$/.test(k)&&!busy){line('u',t);const a=t.split(/\s+/).slice(1);const sub=(a[0]||'').toLowerCase();line('c','CAPRI');
    if(sub==='key'){S.key=/^(s[ií]|si|yes|on)$/i.test(a[1]||'');guarda();if(!S.key&&vivo)post('/api/sync',{dispositivo:S.dev,cfg:{key:''}}).catch(()=>{});sync();
      return line('t',S.key?'ok, le paso tu key a mi cerebro. Se queda solo en tu PC'+(navigator.platform.startsWith('Win')?' (cifrada con tu usuario de Windows)':'')+'. Con eso te hablo aunque cierres mi ventana >:)':'listo, le quité tu key a mi cerebro. Si tienes Ollama, piensa con eso.');}
    if(sub==='abrir'){window.open(S.url+'/','_blank');return line('t','te abro mi cerebro en el navegador~');}
    if(sub==='url'&&a[1]){S.url=a[1].replace(/\/+$/,'');S.token=(a[2]||'').toUpperCase();guarda();vivo=false;sync();return line('t','ok, ahora busco mi cerebro en '+S.url+'.');}
    if(sub==='apagar'){S.on=false;guarda();clearTimeout(timer);vivo=false;return line('t','me desconecto de mi cerebro Python. La app sigue igual.');}
    if(sub==='prender'){S.on=true;guarda();sync();return line('t','buscando mi cerebro…');}
    return line('t',(vivo?'🧠 Mi cerebro Python está conectado en '+S.url+'. Comparto con él mi memoria y la plática; cuando cierras mi ventana, sigo viva ahí y te hablo por notificación.':'🧠 No encuentro mi cerebro Python ('+S.url+'). No pasa nada: funciono igual sin él. Para prenderlo abre la carpeta capri-cerebro y da doble clic en Capri-Cerebro.exe (o run.bat).')+
      '\n  cerebro key sí / no — le paso (o le quito) tu key de Gemini para que piense con la app cerrada'+(S.key?' [ahora: sí]':' [ahora: no]')+
      '\n  cerebro abrir — su página: platicar, horario y si te hablo en voz alta'+
      '\n  cerebro url <dirección> <código> — usar el cerebro de otra PC de tu casa'+
      '\n  cerebro apagar / prender');}
  await _send(v);
  if(k==='help')line('t','  cerebro — mi cerebro Python: sigo viva con la app cerrada');};
})();
