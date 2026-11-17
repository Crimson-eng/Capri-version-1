# -*- coding: utf-8 -*-
"""Diccionario local inglés -> español para ingles_offline.py (sin internet, sin IA).

Formato, una entrada por renglón:
  sustantivos:  palabra = traducción /m|f      (género del sustantivo en español)
  adjetivos:    palabra = traducción            (forma masculina; la femenina se arma sola)
  verbos:       palabra = infinitivo [marca]     marca: ie, ue, i (cambio de raíz) o nada
  otros:        palabra = traducción            (se pone tal cual)
Para varias palabras en un renglón separa con ';'. Kiga puede agregar más con «learn: word = palabra»
(se guardan en datos/ingles_palabras.json y ganan sobre estas).
"""

SUSTANTIVOS = """
time=tiempo/m; year=año/m; day=día/m; week=semana/f; month=mes/m; hour=hora/f; minute=minuto/m; second=segundo/m
morning=mañana/f; afternoon=tarde/f; evening=noche/f; night=noche/f
people=gente/f; person=persona/f; man=hombre/m; woman=mujer/f; child=niño/m; boy=niño/m; girl=niña/f; baby=bebé/m
friend=amigo/m; family=familia/f; mother=madre/f; mom=mamá/f; father=padre/m; dad=papá/m; brother=hermano/m
sister=hermana/f; son=hijo/m; daughter=hija/f; husband=esposo/m; wife=esposa/f; boyfriend=novio/m; girlfriend=novia/f
grandmother=abuela/f; grandfather=abuelo/m; uncle=tío/m; aunt=tía/f; cousin=primo/m; neighbor=vecino/m
teacher=maestro/m; singer=cantante/m; player=jugador/m; driver=chofer/m; writer=escritor/m; artist=artista/m; student=estudiante/m; doctor=doctor/m; nurse=enfermera/f; patient=paciente/m; boss=jefe/m
worker=trabajador/m; king=rey/m; queen=reina/f; god=dios/m; name=nombre/m; life=vida/f; world=mundo/m
house=casa/f; home=casa/f; room=cuarto/m; bedroom=recámara/f; kitchen=cocina/f; bathroom=baño/m; door=puerta/f
window=ventana/f; table=mesa/f; chair=silla/f; bed=cama/f; floor=piso/m; wall=pared/f; roof=techo/m; garden=jardín/m
city=ciudad/f; town=pueblo/m; country=país/m; street=calle/f; road=camino/m; school=escuela/f; university=universidad/f
hospital=hospital/m; church=iglesia/f; store=tienda/f; shop=tienda/f; market=mercado/m; restaurant=restaurante/m
office=oficina/f; bank=banco/m; park=parque/m; beach=playa/f; mountain=montaña/f; river=río/m; sea=mar/m; lake=lago/m
car=carro/m; bus=camión/m; train=tren/m; plane=avión/m; bike=bici/f; ship=barco/m; boat=bote/m
water=agua/f; food=comida/f; bread=pan/m; milk=leche/f; coffee=café/m; tea=té/m; beer=cerveza/f; wine=vino/m
meat=carne/f; chicken=pollo/m; fish=pescado/m; egg=huevo/m; rice=arroz/m; beans=frijoles/m; fruit=fruta/f
apple=manzana/f; orange=naranja/f; banana=plátano/m; cheese=queso/m; sugar=azúcar/m; salt=sal/f; soup=sopa/f
pizza=pizza/f; cake=pastel/m; breakfast=desayuno/m; lunch=comida/f; dinner=cena/f; meal=comida/f
book=libro/m; letter=carta/f; word=palabra/f; sentence=oración/f; question=pregunta/f; answer=respuesta/f
language=idioma/m; english=inglés/m; spanish=español/m; story=historia/f; news=noticia/f; page=página/f
music=música/f; song=canción/f; movie=película/f; game=juego/m; picture=foto/f; photo=foto/f; video=video/m
phone=teléfono/m; cellphone=celular/m; computer=computadora/f; screen=pantalla/f; keyboard=teclado/m; file=archivo/m
internet=internet/m; email=correo/m; message=mensaje/m; program=programa/m; app=app/f; code=código/m; password=contraseña/f
money=dinero/m; price=precio/m; job=trabajo/m; work=trabajo/m; class=clase/f; homework=tarea/f; test=examen/m; exam=examen/m
problem=problema/m; idea=idea/f; thing=cosa/f; way=manera/f; place=lugar/m; part=parte/f; end=final/m; start=inicio/m
love=amor/m; heart=corazón/m; head=cabeza/f; hand=mano/f; eye=ojo/m; face=cara/f; hair=pelo/m; body=cuerpo/m
mouth=boca/f; arm=brazo/m; leg=pierna/f; foot=pie/m; tooth=diente/m; back=espalda/f; stomach=estómago/m; blood=sangre/f
pain=dolor/m; hunger=hambre/f; thirst=sed/f; fear=miedo/m; taco=taco/m; tortilla=tortilla/f; sauce=salsa/f; health=salud/f; medicine=medicina/f; pill=pastilla/f; fever=fiebre/f; cold=resfriado/m; disease=enfermedad/f
dog=perro/m; cat=gato/m; bird=pájaro/m; horse=caballo/m; cow=vaca/f; animal=animal/m; tree=árbol/m; flower=flor/f
sun=sol/m; moon=luna/f; star=estrella/f; sky=cielo/m; rain=lluvia/f; snow=nieve/f; wind=viento/m; weather=clima/m
fire=fuego/m; light=luz/f; dark=oscuridad/f; color=color/m; dream=sueño/m; mind=mente/f; soul=alma/f; brain=cerebro/m
war=guerra/f; peace=paz/f; power=poder/m; truth=verdad/f; lie=mentira/f; help=ayuda/f; luck=suerte/f; fun=diversión/f
clothes=ropa/f; shirt=camisa/f; shoe=zapato/m; dress=vestido/m; key=llave/f; bag=bolsa/f; box=caja/f; gift=regalo/m
party=fiesta/f; birthday=cumpleaños/m; holiday=vacaciones/f; trip=viaje/m; weekend=fin de semana/m; number=número/m
monday=lunes/m; tuesday=martes/m; wednesday=miércoles/m; thursday=jueves/m; friday=viernes/m; saturday=sábado/m; sunday=domingo/m
machine=máquina/f; robot=robot/m; chip=chip/m; ghost=fantasma/m; voice=voz/f; sound=sonido/m; noise=ruido/m
"""

ADJETIVOS = """
good=bueno; bad=malo; big=grande; small=pequeño; little=pequeño; long=largo; short=corto; tall=alto; high=alto; low=bajo
new=nuevo; old=viejo; young=joven; beautiful=hermoso; pretty=bonito; ugly=feo; cute=lindo; nice=agradable; cool=genial
happy=feliz; sad=triste; angry=enojado; tired=cansado; sick=enfermo; ill=enfermo; hungry=hambriento; thirsty=sediento
busy=ocupado; ready=listo; bored=aburrido; boring=aburrido; scared=asustado; afraid=asustado; worried=preocupado
nervous=nervioso; excited=emocionado; alone=solo; lonely=solitario; fine=bien; well=bien; great=genial; awesome=increíble
hot=caliente; cold=frío; warm=tibio; easy=fácil; difficult=difícil; hard=difícil; important=importante; interesting=interesante
funny=gracioso; smart=listo; intelligent=inteligente; stupid=tonto; crazy=loco; strong=fuerte; weak=débil; fast=rápido
slow=lento; rich=rico; poor=pobre; cheap=barato; expensive=caro; full=lleno; empty=vacío; clean=limpio; dirty=sucio
open=abierto; closed=cerrado; right=correcto; wrong=incorrecto; true=verdadero; false=falso; real=real; dead=muerto; alive=vivo
red=rojo; blue=azul; green=verde; yellow=amarillo; black=negro; white=blanco; gray=gris; pink=rosa; purple=morado; brown=café
dangerous=peligroso; safe=seguro; sure=seguro; free=libre; same=mismo; different=diferente; favorite=favorito; best=mejor
better=mejor; worse=peor; worst=peor; first=primero; last=último; next=siguiente; other=otro; another=otro; only=único
early=temprano; late=tarde; near=cercano; far=lejano; quiet=callado; loud=ruidoso; dark=oscuro; bright=brillante
married=casado; single=soltero; kind=amable; mean=malo; evil=malvado; strange=raro; weird=raro; perfect=perfecto
possible=posible; impossible=imposible; necessary=necesario; serious=serio; simple=sencillo; special=especial; human=humano
digital=digital; private=privado; public=público; sweet=dulce; sorry=apenado; glad=contento; proud=orgulloso; jealous=celoso
"""

VERBOS = """
be=ser; have=tener ie; do=hacer; make=hacer; go=ir; come=venir ie; get=conseguir i; give=dar; take=tomar; put=poner
say=decir i; tell=decir i; speak=hablar; talk=hablar; know=saber; think=pensar ie; believe=creer; see=ver; look=mirar
watch=ver; hear=oír; listen=escuchar; feel=sentir ie; want=querer ie; need=necesitar; like=gustar; love=amar; hate=odiar
can=poder ue; eat=comer; drink=beber; sleep=dormir ue; wake=despertar ie; live=vivir; die=morir ue; work=trabajar; play=jugar ue
study=estudiar; learn=aprender; teach=enseñar; read=leer; write=escribir; open=abrir; close=cerrar ie; buy=comprar; sell=vender
pay=pagar; cost=costar ue; spend=gastar; find=encontrar ue; lose=perder ie; win=ganar; leave=salir; stay=quedar; wait=esperar
hope=esperar; walk=caminar; run=correr; drive=manejar; fly=volar ue; swim=nadar; dance=bailar; sing=cantar; travel=viajar
arrive=llegar; return=regresar; start=empezar ie; begin=empezar ie; finish=terminar; stop=parar; try=intentar; use=usar
help=ayudar; call=llamar; ask=preguntar; answer=contestar; understand=entender ie; remember=recordar ue; forget=olvidar
change=cambiar; move=mover ue; send=enviar; bring=traer; carry=llevar; wear=llevar; show=mostrar ue; cook=cocinar
clean=limpiar; wash=lavar; build=construir; break=romper; fix=arreglar; repair=reparar; kill=matar; fight=pelear
laugh=reír; cry=llorar; smile=sonreír; kiss=besar; hug=abrazar; meet=conocer; visit=visitar; follow=seguir i; lead=guiar
choose=elegir i; decide=decidir; prefer=preferir ie; share=compartir; save=guardar; keep=guardar; sit=sentar ie; stand=parar
fall=caer; grow=crecer; turn=voltear; touch=tocar; hold=sostener ie; push=empujar; pull=jalar; throw=tirar; catch=atrapar
mean=significar; seem=parecer; become=volver ue; let=dejar; allow=permitir; happen=pasar; exist=existir; plan=planear
explain=explicar; repeat=repetir i; translate=traducir; check=revisar; search=buscar; look for=buscar; install=instalar
download=descargar; upload=subir; click=hacer clic; type=escribir; delete=borrar; print=imprimir; connect=conectar
hurt=doler ue; rest=descansar; breathe=respirar; worry=preocupar; enjoy=disfrutar; miss=extrañar; kill=matar; pray=rezar
get up=levantar; shut up=callar; agree=estar de acuerdo; dream=soñar ue; cut=cortar; hit=golpear; drink=beber; rain=llover ue
"""

OTROS = """
and=y; or=o; but=pero; because=porque; so=así que; if=si; then=entonces; when=cuando; while=mientras; than=que; that=que
with=con; without=sin; for=para; from=de; of=de; in=en; on=en; at=en; to=a; into=dentro de; about=sobre; under=debajo de
over=sobre; after=después de; before=antes de; between=entre; behind=detrás de; near=cerca de; through=por; during=durante
up=arriba; down=abajo; out=afuera; here=aquí; there=allí; now=ahora; later=luego; soon=pronto; already=ya; still=todavía
yet=todavía; again=otra vez; always=siempre; never=nunca; sometimes=a veces; often=seguido; usually=normalmente
very=muy; really=de verdad; too=también; also=también; more=más; less=menos; much=mucho; many=muchos; most=la mayoría
few=pocos; some=algunos; any=algún; all=todo; every=cada; each=cada; both=ambos; only=solo; just=solo; even=incluso
almost=casi; maybe=tal vez; perhaps=quizás; please=por favor; yes=sí; yeah=sí; no=no; not=no; ok=ok; okay=ok
what=qué; who=quién; where=dónde; when=cuándo; why=por qué; how=cómo; which=cuál; whose=de quién
something=algo; nothing=nada; everything=todo; anything=algo; someone=alguien; somebody=alguien; nobody=nadie
today=hoy; tomorrow=mañana; yesterday=ayer; everyone=todos; everybody=todos; anyone=alguien; somewhere=en algún lugar; together=juntos; tonight=esta noche
hello=hola; hi=hola; hey=oye; bye=adiós; goodbye=adiós; thanks=gracias; welcome=bienvenido; sorry=perdón; well=bueno
zero=cero; one=uno; two=dos; three=tres; four=cuatro; five=cinco; six=seis; seven=siete; eight=ocho; nine=nueve; ten=diez
eleven=once; twelve=doce; twenty=veinte; thirty=treinta; hundred=cien; thousand=mil; million=millón
fast=rápido; slowly=despacio; quickly=rápido; well=bien; badly=mal; home=a casa; like=como; as=como; same=igual
"""

# Frases hechas: se traducen enteras antes que palabra por palabra (más largas primero).
FRASES = """
what time=qué hora; how are you=cómo estás; how are you doing=cómo te va; how is it going=cómo va todo; what's up=qué onda; whats up=qué onda
nice to meet you=mucho gusto; good morning=buenos días; good afternoon=buenas tardes; good evening=buenas noches
good night=buenas noches; see you later=nos vemos luego; see you soon=nos vemos pronto; see you tomorrow=nos vemos mañana
thank you=gracias; thank you very much=muchas gracias; thanks a lot=muchas gracias; you're welcome=de nada; you are welcome=de nada
excuse me=disculpa; i'm sorry=lo siento; i am sorry=lo siento; no problem=no hay problema; of course=claro
i don't know=no sé; i do not know=no sé; i don't understand=no entiendo; i do not understand=no entiendo
what time is it=qué hora es; what is your name=cómo te llamas; what's your name=cómo te llamas; my name is=me llamo
how old are you=cuántos años tienes; where are you from=de dónde eres; i love you=te amo; i miss you=te extraño
i am hungry=tengo hambre; i am thirsty=tengo sed; i am afraid=tengo miedo; i am sleepy=tengo sueño; i'm fine=estoy bien; i am fine=estoy bien; i'm ok=estoy bien; i am ok=estoy bien; take care=cuídate
happy birthday=feliz cumpleaños; merry christmas=feliz navidad; happy new year=feliz año nuevo; good luck=buena suerte
let's go=vámonos; let us go=vámonos; come on=ándale; hurry up=apúrate; be careful=ten cuidado; never mind=no importa
it doesn't matter=no importa; it does not matter=no importa; how much is it=cuánto cuesta; how much does it cost=cuánto cuesta
a lot=mucho; a lot of=mucho; a little=un poco; a little bit=un poquito; right now=ahora mismo; at night=en la noche
in the morning=en la mañana; in the afternoon=en la tarde; every day=todos los días; last night=anoche; last week=la semana pasada
next week=la próxima semana; this week=esta semana; of course not=claro que no; i think so=creo que sí; i don't think so=creo que no
what do you mean=qué quieres decir; what does it mean=qué significa; how do you say=cómo se dice; can you help me=me puedes ayudar
you know=sabes; i mean=o sea; by the way=por cierto; at least=al menos; at home=en casa; go home=ir a casa; on time=a tiempo
"""

# Pasados y participios irregulares en inglés -> forma base
IRREGULARES = """
was=be; were=be; been=be; am=be; is=be; are=be; had=have; has=have; did=do; done=do; does=do; made=make; went=go; gone=go
came=come; got=get; gotten=get; gave=give; given=give; took=take; taken=take; said=say; told=tell; spoke=speak; spoken=speak
knew=know; known=know; thought=think; saw=see; seen=see; heard=hear; felt=feel; ate=eat; eaten=eat; drank=drink; drunk=drink
slept=sleep; woke=wake; woken=wake; ran=run; drove=drive; driven=drive; flew=fly; flown=fly; swam=swim; sang=sing; sung=sing
began=begin; begun=begin; found=find; lost=lose; won=win; left=leave; kept=keep; sat=sit; stood=stand; fell=fall; fallen=fall
grew=grow; grown=grow; held=hold; threw=throw; thrown=throw; caught=catch; meant=mean; became=become; bought=buy; sold=sell
paid=pay; spent=spend; brought=bring; taught=teach; wrote=write; written=write; broke=break; broken=break; built=build
fought=fight; met=meet; chose=choose; chosen=choose; understood=understand; forgot=forget; forgotten=forget; sent=send
wore=wear; worn=wear; hurt=hurt; let=let; put=put; cut=cut; hit=hit; read=read; cost=cost; shut=shut; dreamt=dream
"""

# Participios irregulares en español (para «have done» = «he hecho»)
PARTICIPIOS_ES = {'hacer': 'hecho', 'decir': 'dicho', 'ver': 'visto', 'escribir': 'escrito', 'poner': 'puesto',
                  'volver': 'vuelto', 'abrir': 'abierto', 'romper': 'roto', 'morir': 'muerto', 'ir': 'ido', 'ser': 'sido',
                  'leer': 'leído', 'traer': 'traído', 'caer': 'caído', 'creer': 'creído', 'oír': 'oído', 'reír': 'reído'}


def _entradas(bloque):
    for renglon in bloque.strip().splitlines():
        for pedazo in renglon.split(';'):
            if '=' in pedazo:
                a, b = pedazo.split('=', 1)
                yield a.strip().lower(), b.strip()


def cargar():
    sust, adj, verb, otros, frases, irr = {}, {}, {}, {}, {}, {}
    for en, es in _entradas(SUSTANTIVOS):
        palabra, _, g = es.partition('/')
        sust[en] = (palabra.strip(), g.strip() or 'm')
    for en, es in _entradas(ADJETIVOS):
        adj[en] = es
    for en, es in _entradas(VERBOS):
        partes = es.split()
        marca = partes[-1] if len(partes) > 1 and partes[-1] in ('ie', 'ue', 'i') else ''
        inf = ' '.join(partes[:-1]) if marca else es
        verb[en] = (inf, marca)
    for en, es in _entradas(OTROS):
        otros.setdefault(en, es)
    for en, es in _entradas(FRASES):
        frases[en] = es
    for en, es in _entradas(IRREGULARES):
        irr[en] = es.lower()
    return sust, adj, verb, otros, frases, irr
