// ================= 2.30: CERTEZA O CHARLA =================
// Antes Capri elegía cerebro por rapidez y por lo largo del mensaje: una pregunta corta de TOEFL («She ___ to school.
// a) go b) goes») se iba al cerebro chico de tu GPU porque era corta, aunque tenía que estar bien.
// Ahora cada mensaje se clasifica (sin IA, en <1 ms, por palabras y forma):
//   · CERTEZA (toefl · examen · médica · técnica · dato): tiene que estar bien. No va a tu GPU si hay otro cerebro,
//     va a Gemini (o a Claude si lo tienes prendido), con menos «creatividad» y un poquito de razonamiento,
//     y si Gemini falla prueba primero los respaldos más listos (Kimi K2 en Groq, DeepSeek en OpenRouter).
//   · CHARLA: todo igual que antes, lo más rápido posible.
// Los quizzes de inglés con incisos que pegues en el chat (sin escribir «quiz:») se van primero al profe de reglas del
// cerebro Python: es instantáneo y seguro; lo que las reglas no aseguran se lo pregunta a Claude/Gemini, nunca adivina.
// «seguro: <pregunta>» fuerza el modo certeza; «rápido: <pregunta>» lo apaga para ese mensaje.
(()=>{
const sa=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

// incisos a) b) c) / (A) (B) / A. B. — al menos dos letras distintas seguidas
function incisos(t){const s=String(t||'');const re=/(?:^|[\s\n])\(?([a-eA-E])[\).]\s+\S/g;const L=new Set();let m;while((m=re.exec(s)))L.add(m[1].toLowerCase());
  return L.has('a')&&L.has('b')?L.size:0;}
const EN_FUN=/\b(the|is|are|was|were|have|has|had|will|would|should|could|of|to|and|which|what|who|she|he|they|we|it|does|did|been|being|this|that|these|those|than|if|in|on|at|for|with|from|by)\b/g;
const ES_FUN=/\b(el|la|los|las|es|son|que|de|del|para|por|con|una|uno|como|pero|cual|cuál|esta|este|estos|muy|tambien|también|porque|donde|cuando)\b/g;
const cuenta=(t,re)=>(String(t).toLowerCase().match(re)||[]).length;
const esIngles=t=>{const en=cuenta(t,EN_FUN),es=cuenta(t,ES_FUN);return (en>=3&&en>es*1.5)||(en>=1&&es===0&&!/[áéíóúñ¿¡]/i.test(t));};
// ¿es un quiz de inglés (opción múltiple / hueco)? Lo que el profe de reglas sabe resolver.
function pareceQuizIngles(t){const s=String(t||'');if(s.length<12)return false;
  const hueco=/_{2,}|\.{4,}|\(\s*\)|\[\s*\]/.test(s);const n=incisos(s);
  if(n<2)return false;if(!esIngles(s.replace(/(?:^|\s)\(?[a-eA-E][\).]\s+/g,' ')))return false;
  return hueco||n>=3||/\b(choose|select|which|identify|correct|incorrect|error|mistake|complete|fill|meaning|closest|synonym|antonym|best)\b/i.test(s)||/\?/.test(s);}

const TOEFL=/\b(toefl|ielts|toeic|cambridge|grammar|gram[aá]tica (en|de) ingl[eé]s|phrasal verb|present perfect|past perfect|simple past|conditional|passive voice|reported speech|gerund|infinitive|preposition|synonym|antonym|choose the (correct|best)|which of the following|fill in the blank|complete the sentence|identify the error|is it correct|correct form)\b/i;
const INGLES_DUDA=/\b(se dice|c[oó]mo se dice|est[aá] bien dicho|es correcto|cu[aá]l es correcto|diferencia entre)\b.*\b(ingl[eé]s|english)\b|\b(since|for|ago|yet|already|still|make|do|say|tell|much|many|few|little|who|whom|whose|which|that)\b\s+(?:vs\.?|o|or)\s+\b\w+\b/i;
const EXAMEN=/\b(examen|quiz|parcial|final|prueba|test|tarea|ejercicio|inciso|reactivo|pregunta \d|respuesta correcta|cu[aá]l es (la )?correcta|verdadero o falso|opci[oó]n (correcta|m[uú]ltiple)|resuelve|resolver|ens[eé]ñame a resolver)\b/i;
const MEDICA=/s[ií]ntoma|dolor|\bme duele|\bduele|fiebre|mareo|v[oó]mito|diarrea|\btos\b|alergia|enfermedad|diagn[oó]s|tratamiento|medicamento|f[aá]rmaco|dosis|\bmg\b|\bml\b|cirug|anatom|fisiolog|patolog|cl[ií]nic|paciente|hospital|\bnom-\d|\bgpc\b|sangre|presi[oó]n arterial|glucosa|infecci|antibi[oó]tic|embaraz|vacuna|fractura|signos vitales|laboratorio|biometr[ií]a|electrocardiograma|\becg\b|\bekg\b/i;
const TECNICA=/\b(c[oó]digo|programa|script|funci[oó]n|variable|error|excepci[oó]n|bug|compila|python|javascript|html|css|java|c\+\+|sql|linux|windows|powershell|bash|terminal|comando|driver|bios|uefi|usb|disco|partici[oó]n|formatea|router|ip|puerto|dns|wifi|red|firewall|nmap|ssh|git|docker|instal[ae]|configur|registro de windows|regedit|virus|malware)\b/i;
const DATO=/\b(cu[aá]nto(s|as)?|en qu[eé] a[nñ]o|qu[ií][eé]n (fue|es|invent[oó]|descubri[oó]|escribi[oó]|gan[oó])|cu[aá]l es (la|el) (capital|f[oó]rmula|definici[oó]n|valor|resultado|unidad)|qu[eé] significa|define|definici[oó]n|f[oó]rmula|calcula|convierte|equivale|ley de|art[ií]culo \d|fecha|distancia|poblaci[oó]n|cu[aá]ndo (fue|naci[oó]|muri[oó]|empez[oó]|termin[oó]))\b|\d+\s*[\+\-\*\/x×÷^%]\s*\d+/i;
const CHARLA=/^(hola+|holi|hey|buenas|buenos d[ií]as|buenas (tardes|noches)|qu[eé] onda|c[oó]mo est[aá]s|jaj|jej|xd|lol|te quiero|te extra[nñ]|gracias|ok|va|sale|nada|bueno|ya|aja|mmm|bye|adi[oó]s|me aburro|estoy aburrid|cu[eé]ntame (algo|un chiste)|qu[eé] haces)\b/i;

// → {certeza:bool, tipo:'toefl'|'examen'|'medica'|'tecnica'|'dato'|'charla', por:'…'}
function clasifica(texto){const t=String(texto||'').trim(),s=sa(t);
  if(!t)return {certeza:false,tipo:'charla',por:'vacío'};
  if(/^(seguro|certeza|exacto)\s*:/i.test(t))return {certeza:true,tipo:'dato',por:'lo pediste («seguro:»)'};
  if(/^(r[aá]pido|charla)\s*:/i.test(t))return {certeza:false,tipo:'charla',por:'lo pediste («rápido:»)'};
  if(pareceQuizIngles(t))return {certeza:true,tipo:'toefl',por:'quiz de inglés con incisos'};
  if(TOEFL.test(t)||INGLES_DUDA.test(t))return {certeza:true,tipo:'toefl',por:'pregunta de inglés / TOEFL'};
  const charla=CHARLA.test(s)&&t.length<60;
  if(MEDICA.test(t)&&!charla)return {certeza:true,tipo:'medica',por:'tema de salud'};
  if(incisos(t)>=2)return {certeza:true,tipo:'examen',por:'pregunta con incisos'};
  if(EXAMEN.test(t))return {certeza:true,tipo:'examen',por:'examen / tarea'};
  if(charla)return {certeza:false,tipo:'charla',por:'plática'};
  // técnica y datos solo cuenta si de verdad es pregunta o pide algo (no «me dio error el día, jaja»)
  const pide=/\?|^(?:en |de |a |y |pero |oye,? )?(c[oó]mo|qu[eé]|cu[aá]l|cu[aá]nto|por qu[eé]|d[oó]nde|cu[aá]ndo|qui[eé]n|expl[ií]ca|dime|calcula|convierte|resuelve|ay[uú]dame)/i.test(t);
  if(pide&&TECNICA.test(t))return {certeza:true,tipo:'tecnica',por:'pregunta técnica'};
  if(pide&&DATO.test(t))return {certeza:true,tipo:'dato',por:'dato que se puede verificar'};
  return {certeza:false,tipo:'charla',por:'plática'};}
window.capriCerteza=clasifica;
window.capriPareceQuiz=pareceQuizIngles;

// lo que se le agrega al final de la pregunta (va al final para no romper la caché del prompt, ver alFinal en 2.28)
const COMO={
  toefl:'Es inglés de examen (TOEFL/gramática). Si es opción múltiple, di la letra y la opción correctas en la primera línea, luego el porqué en 1–2 líneas y por qué no las otras en una línea cada una. Usa la regla de gramática concreta.',
  examen:'Es de examen/tarea. Da la respuesta correcta primero (si hay incisos: la letra), luego el porqué en 1–3 líneas.',
  medica:'Es de salud. Básate en las fuentes verificadas que vengan en el mensaje si las hay y menciónalas; no inventes dosis ni datos; recuerda que no das diagnóstico.',
  tecnica:'Es técnica. Da el comando, código o pasos exactos y correctos; si depende de la versión o del sistema, dilo.',
  dato:'Es un dato verificable. Da el dato exacto primero; si no lo sabes con seguridad, dilo en vez de inventarlo.'};
window.capriNotaCerteza=cz=>cz?.certeza?'\n\n[MODO CERTEZA · '+cz.tipo+'] Esta pregunta necesita una respuesta CORRECTA, no creativa. '+(COMO[cz.tipo]||COMO.dato)+
  ' Si no estás segura, dilo claro en vez de adivinar. Puedes sonar como tú, pero corta y al grano. Sigue empezando con tu estado entre corchetes.':'';

// ---------- quizzes de inglés pegados en el chat → profe de reglas (instantáneo y seguro) ----------
const _send=send;
send=async v=>{const t=(v||'').trim();
  if(!busy&&t&&!window.capriHayAdjuntos?.()&&!/^(quiz|resuelve|en|english|seguro|certeza|r[aá]pido|charla)\s*:/i.test(t)&&pareceQuizIngles(t)&&window.cerebroPyInfo?.().vivo&&window.inglesSinIA){
    const t0=performance.now();
    try{if(await window.inglesSinIA(t,'quiz: '+t,false,true)){log('◎ certeza · quiz de inglés: lo resolvió el profe de reglas en '+Math.round(performance.now()-t0)+' ms','g');return;}}
    catch(e){log('◎ profe de reglas no pudo: '+String(e.message).slice(0,50),'w');}}
  await _send(v);
  if(t.toLowerCase()==='help')line('t','  🖼 — mándame imágenes: botón junto al micrófono, Ctrl+V o arrástralas al chat\n  seguro: <pregunta> — contesto con el cerebro más confiable · rápido: <pregunta> — lo más rápido');};
})();
