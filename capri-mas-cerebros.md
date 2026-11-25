# Capri 2.29: más cerebros de respaldo (Groq y OpenRouter)

Antes, si Gemini no contestaba (sin cupo, Google saturado, sin internet o sin key), Capri caía directo al cerebro
chico de tu GPU (gemma3:4b con Ollama). Ahora, antes de eso, prueba dos cerebros grandes en la nube que tienen
capa gratis, cada uno con su propia key.

## La cadena

```
Gemini  →  (Claude, si lo tienes prendido)  →  Groq  →  OpenRouter  →  tu GPU (Ollama)
```

- **Groq** va primero porque es el más rápido: contesta casi al instante.
- **OpenRouter** va después porque ahí están los modelos gratis que mejor razonan (DeepSeek).
- **Tu GPU** queda al final: es la más simple, pero es la única que funciona sin internet.

Cuando la plática corta la contesta tu GPU (modo Auto) y tu GPU se traba o se tarda, y no hay Gemini, también
contesta Groq u OpenRouter antes que Claude.

Groq y OpenRouter solo leen texto. Lo que trae foto, voz o PDF sigue yendo a Gemini (o Claude).

## Del más listo al más simple

| # | Cerebro | Dónde | Cómo es |
|---|---------|-------|---------|
| 1 | DeepSeek R1 | OpenRouter (gratis) | El que mejor razona, pero tarda porque «piensa» antes de contestar |
| 2 | Gemini | Google | Parejo con R1 y bastante más rápido |
| 3 | Kimi K2 | Groq | Muy bueno para platicar, y vuela |
| 4 | DeepSeek V3 | OpenRouter (gratis) | Listo y sin la pausa de R1 (es el que viene puesto) |
| 5 | Llama 3.3 70B | Groq | Decente y rapidísimo (es el que viene puesto) |
| 6 | gemma3:4b | Tu GPU | El más simple, pero jala sin internet |

Si usas a Claude como coprocesador, va arriba de todos (pero cuesta).

## Cómo prenderlos

1. **Groq**: entra a <https://console.groq.com/keys>, crea una key (empieza con `gsk_`).
2. **OpenRouter**: entra a <https://openrouter.ai/keys>, crea una key (empieza con `sk-or-`).
   Los modelos que terminan en `:free` no cuestan.
3. En Capri: **⚙ AJUSTES → Cerebros de respaldo**. Pega cada key, elige el modelo y toca **▶ Probar**.
   **Cargar modelos** trae la lista real de cada servicio (en OpenRouter solo los gratis), por si alguno cambia de nombre.

Las keys se quedan solo en tu PC, junto con la de Gemini.

## Lo que se cuidó para no repetir el bug de 2.28.1

El bug de 2.28.1 era que a tu GPU se le mandaba más de lo que le cabe y tronaba con
«the prompt is longer than the context length». Groq gratis tiene el mismo problema: rechaza los mensajes que
pasan de su tope de tokens por minuto (Llama 3.3 70B aguanta 12 000, Kimi K2 10 000, GPT-OSS 8 000).

- Lo que se le manda a Groq y OpenRouter se arma con **la misma función que la GPU** (`armaChat`, antes `armaGPU`):
  primero tu pregunta, luego lo de ahorita (hora, clima, recuerdos), luego su personalidad, y la plática vieja
  se va quitando de 4 en 4. Nunca se pasa del tope.
- Topes de arranque: Groq 9 000 tokens con Llama 70B (8 000 con Kimi, 7 000 con GPT-OSS) y OpenRouter 24 000.
- Si aun así el servicio dice «muy grande» (413 o «Limit 6000, Requested 7400»), Capri **aprende el tope real** de
  ese modelo, lo guarda, y lo vuelve a armar a ese tamaño. Si no dice el número, lo arma más chico (60 %, 36 %).
- Si un modelo no tiene cupo (429), prueba otro modelo de la misma nube (en Groq el cupo es por modelo).
  Si la nube entera falla, descansa un rato (lo que diga el servicio, o 1 a 2 min; 30 min si la key es mala)
  y pasa a la siguiente.
- Si no suelta la primera palabra en 20 s (Groq) o 40 s (OpenRouter; 90 s con R1, que piensa antes), se corta y
  sigue con el siguiente. Mientras R1 «piensa», eso cuenta como señal de vida para el vigilante de «pensando».

## Cerebro Python (capri-cerebro 1.4.0)

Si le pasaste tus keys con «cerebro key sí», el cerebro Python también recibe las de Groq y OpenRouter y usa la
misma cadena para hablarte con la app cerrada: Gemini → Groq → OpenRouter → Ollama. Recorta con `cabe_en_ctx()`
igual que para Ollama.

## Archivos

- `cerebro.js`: `NUBES`, `nube1()`/`nubePide()`/`respaldoNubes()`, la cadena en `ask`, `armaChat()` y el panel en Ajustes.
- `cerebropy.js`: manda las keys de respaldo al cerebro Python; «sin IA» ya cuenta Groq/OpenRouter.
- `capri-cerebro/capri_cerebro.py`: `groq()`, `openrouter()`, y `pensar()` con la cadena nueva.
- `desktop/main.js`: si Groq u OpenRouter dejaran de mandar el permiso CORS, la app de escritorio se lo pone.

## Probado

Con Gemini, Ollama, Groq y OpenRouter simulados (Playwright):

1. Gemini 503 → contesta Groq.
2. Groq dice «Limit 6000, Requested 9400» → aprende el tope (5 100) y lo vuelve a mandar a ese tamaño → contesta.
3. Gemini 429 y Groq 429 en sus 3 modelos → contesta OpenRouter (DeepSeek V3), y Groq descansa.
4. Sin key de Gemini ni GPU → contesta Groq.
5. Plática enorme llena de números (clima, coordenadas) → lo que se le manda a Groq se queda en ~7 100 + 1 024 de respuesta, abajo del tope.
6. Sin keys de respaldo → todo igual que antes.
7. Sin Gemini y la GPU truena → contesta Groq.

Falta probarlo en tu PC con keys reales de Groq y OpenRouter.
