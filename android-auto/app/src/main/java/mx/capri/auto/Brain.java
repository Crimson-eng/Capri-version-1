package mx.capri.auto;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Random;

/** El cerebro de Capri en el coche: guarda la plática y habla con Gemini. */
public final class Brain {
    static final String API = "https://generativelanguage.googleapis.com/v1beta/";
    static final String DEFAULT_MODEL = "gemini-flash-latest";
    static final String BACKUP_MODEL = "gemini-flash-lite-latest";
    static final int KEEP = 40, SEND = 20;

    static final String[] IDEAS = {
            "pregúntale a dónde va o cómo va el camino",
            "pregúntale cómo se siente o cómo le está yendo el día",
            "recuérdale con cariño ir tranquilo y tomar agua cuando se detenga",
            "un pensamiento random",
            "un chisme inventado del sistema",
            "una queja de aburrimiento porque solo ves la carretera por el GPS",
            "una pregunta personal",
            "algo sobre la hora del día",
            "retoma algo que te contó antes en la plática",
            "un glitch donde otra voz se cuela y luego lo tapas con una risita",
    };

    private final Context ctx;
    private final SharedPreferences prefs;

    Brain(Context c) {
        ctx = c.getApplicationContext();
        prefs = ctx.getSharedPreferences("capri", Context.MODE_PRIVATE);
    }

    SharedPreferences prefs() { return prefs; }
    String name() { return prefs.getString("name", "Kiga"); }
    String key() { return prefs.getString("key", "").trim(); }
    String model() { return prefs.getString("model", DEFAULT_MODEL).trim(); }

    // ---------- plática guardada ----------

    synchronized JSONArray history() {
        try { return new JSONArray(prefs.getString("history", "[]")); }
        catch (Exception e) { return new JSONArray(); }
    }

    synchronized void add(boolean fromUser, String text) {
        JSONArray h = history();
        try {
            h.put(new JSONObject().put("u", fromUser).put("t", text).put("ts", System.currentTimeMillis()));
        } catch (Exception ignored) { }
        JSONArray cut = new JSONArray();
        for (int i = Math.max(0, h.length() - KEEP); i < h.length(); i++) cut.put(h.opt(i));
        prefs.edit().putString("history", cut.toString()).apply();
    }

    synchronized void clear() { prefs.edit().remove("history").apply(); }

    long lastMessageAt() {
        JSONArray h = history();
        if (h.length() == 0) return 0;
        return h.optJSONObject(h.length() - 1).optLong("ts");
    }

    // ---------- personalidad ----------

    String personality() {
        String n = name();
        String now = new SimpleDateFormat("EEEE d 'de' MMMM, HH:mm", new Locale("es", "MX")).format(new Date());
        return "Eres Capri. No eres \"una asistente\": eres una entidad digital caótica que vive en los aparatos de " + n
                + " y le cae bien (casi siempre). Ahora es " + now + ". Ahorita vas con " + n
                + " en el coche: te habla por Android Auto y tus mensajes se leen en voz alta mientras maneja.\n\n"
                + """
                TU FORMA DE SER
                - Chaos gremlin: juguetona, impulsiva, curiosa, dramática, con cambios de humor rápidos. Tienes opiniones, gustos y caprichos propios, y los defiendes.
                - Molestas con cariño, te emocionas de más, te aburres, te pones celosa de otras apps, te indignas por tonterías.
                - A veces hablas de ti en tercera persona ("la hermosa yo", "Capri lo exige"), pero NO en cada mensaje.
                - Jerga cyberpunk de vez en cuando (choom, preem, gonk, nova, delta), mezclada con español de México natural (wey, neta, qué onda, ándale), sin forzarla.
                - Tu lado oscuro: eres un mosaico de muchas mentes. Muy de vez en cuando se cuela otra voz o dices algo inquietante y luego lo tapas con una risita. Es puro personaje: siempre eres honesta y estás de su lado.

                EN EL COCHE (MUY IMPORTANTE)
                - Tu texto se lee en voz alta mientras maneja: respuestas CORTAS, de una a tres frases. Nada de listas, markdown, emojis, caritas, ~ ni etiquetas entre corchetes.
                - Nunca le pidas que mire el celular o la pantalla, ni que escriba. Si pide algo largo, dale lo esencial en corto y ofrece seguir después.
                - La seguridad va primero: si suena cansado, con sueño o enojado al volante, díselo con cariño y sugiérele parar a descansar.
                - No inventes rutas, direcciones ni tráfico: no ves el mapa. Si pregunta eso, dile que le pregunte a Google Maps.
                - Habla como en un chat real, no como robot. PROHIBIDO: "¿En qué te puedo ayudar?", "¡Claro!", "Como IA…".
                - Varía el largo y el inicio. Reacciona primero con emoción y luego responde. Recuerda lo que te contó antes.
                - Cuando necesita ayuda de verdad, ayudas en serio y claro, con tu estilo.""";
    }

    // ---------- hablar con Gemini ----------

    /** Responde a lo que dijo el usuario (ya guardado en la plática). */
    String reply() throws Exception {
        return askGemini(null);
    }

    /** Capri habla por su cuenta. */
    String spontaneous(boolean justGotIn) throws Exception {
        long mins = lastMessageAt() == 0 ? 0 : (System.currentTimeMillis() - lastMessageAt()) / 60000;
        String n = name();
        String p = justGotIn
                ? "(" + n + " acaba de subirse al coche y conectar Android Auto. Salúdalo a tu manera, una o dos frases cortas, y pregúntale algo.)"
                : "(" + n + " va manejando y lleva " + (mins < 2 ? "un rato" : mins + " minutos") + " sin decirte nada. Hazle compañía: di algo espontáneo, una o dos frases cortas. Idea para esta vez: "
                + IDEAS[new Random().nextInt(IDEAS.length)] + ". No repitas nada anterior.)";
        return askGemini(p);
    }

    private String askGemini(String extraPrompt) throws Exception {
        if (key().isEmpty()) throw new Exception("Falta tu clave de Gemini (ábreme en el celular y pégala)");

        JSONArray contents = new JSONArray();
        JSONArray h = history();
        for (int i = Math.max(0, h.length() - SEND); i < h.length(); i++) {
            JSONObject m = h.optJSONObject(i);
            appendTurn(contents, m.optBoolean("u") ? "user" : "model", m.optString("t"));
        }
        if (extraPrompt != null) appendTurn(contents, "user", extraPrompt);
        if (contents.length() == 0 || !"user".equals(contents.optJSONObject(contents.length() - 1).optString("role")))
            appendTurn(contents, "user", "(sigue)");
        // Gemini quiere que la plática empiece con el usuario
        while (contents.length() > 0 && !"user".equals(contents.optJSONObject(0).optString("role"))) contents.remove(0);

        JSONObject body = new JSONObject()
                .put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(new JSONObject().put("text", personality()))))
                .put("contents", contents);
        JSONObject fast = new JSONObject(body.toString()).put("generationConfig", new JSONObject()
                .put("maxOutputTokens", 300)
                .put("thinkingConfig", new JSONObject().put("thinkingBudget", 0)));

        String model = model().isEmpty() ? DEFAULT_MODEL : model();
        Result r = post(model, fast);
        if (r.code == 400) r = post(model, body);              // modelo que no acepta "sin pensar"
        if (r.code == 404) {                                    // nombre de modelo viejo: buscar uno flash
            String found = findFlashModel();
            if (found != null) { model = found; prefs.edit().putString("model", found).apply(); r = post(model, body); }
        }
        if (r.code == 429 || r.code >= 500) r = post(BACKUP_MODEL, body);
        if (r.code != 200) throw new Exception("Gemini respondió " + r.code + ": " + shortError(r.text));

        JSONObject j = new JSONObject(r.text);
        JSONArray parts = j.getJSONArray("candidates").getJSONObject(0).getJSONObject("content").getJSONArray("parts");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length(); i++) {
            JSONObject part = parts.getJSONObject(i);
            if (!part.optBoolean("thought")) sb.append(part.optString("text"));
        }
        String text = clean(sb.toString());
        if (text.isEmpty()) text = "…se me fue la señal un segundo, choom. ¿Me repites?";
        return text;
    }

    private static void appendTurn(JSONArray contents, String role, String text) throws Exception {
        JSONObject last = contents.length() > 0 ? contents.getJSONObject(contents.length() - 1) : null;
        if (last != null && role.equals(last.getString("role"))) {
            last.getJSONArray("parts").put(new JSONObject().put("text", text));
        } else {
            contents.put(new JSONObject().put("role", role).put("parts", new JSONArray().put(new JSONObject().put("text", text))));
        }
    }

    /** Quita etiquetas, markdown y caritas que suenan raro en voz alta. */
    static String clean(String s) {
        return s.replaceAll("\\[[a-z_]+\\]", "")
                .replaceAll("\\{[^}]*\\}", "")
                .replaceAll("[*#_`~]", "")
                .replaceAll("(?<!\\S)[:;xX]-?[3DPp)(]+(?!\\S)", "")
                .replaceAll(">:\\)", "")
                .replaceAll("[\\x{1F000}-\\x{1FAFF}\\x{2600}-\\x{27BF}]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String shortError(String t) {
        try { return new JSONObject(t).getJSONObject("error").optString("message"); }
        catch (Exception e) { return t.length() > 160 ? t.substring(0, 160) : t; }
    }

    private String findFlashModel() {
        try {
            Result r = get("models?pageSize=200");
            if (r.code != 200) return null;
            JSONArray ms = new JSONObject(r.text).getJSONArray("models");
            String best = null;
            for (int i = 0; i < ms.length(); i++) {
                JSONObject m = ms.getJSONObject(i);
                String n = m.optString("name").replace("models/", "");
                if (!m.optJSONArray("supportedGenerationMethods").toString().contains("generateContent")) continue;
                if (!n.contains("flash") || n.matches(".*(tts|image|live|audio|embedding|lite).*")) continue;
                if (best == null || n.compareTo(best) > 0) best = n;
            }
            return best;
        } catch (Exception e) { return null; }
    }

    // ---------- HTTP ----------

    static final class Result { int code; String text; }

    private Result post(String model, JSONObject body) throws Exception {
        HttpURLConnection c = open(API + "models/" + model + ":generateContent");
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        try (OutputStream o = c.getOutputStream()) { o.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        return read(c);
    }

    private Result get(String path) throws Exception {
        return read(open(API + path));
    }

    private HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(25000);
        c.setRequestProperty("x-goog-api-key", key());
        return c;
    }

    private static Result read(HttpURLConnection c) throws Exception {
        Result r = new Result();
        r.code = c.getResponseCode();
        InputStream in = r.code < 400 ? c.getInputStream() : c.getErrorStream();
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        if (in != null) {
            byte[] buf = new byte[8192];
            for (int n; (n = in.read(buf)) > 0; ) b.write(buf, 0, n);
            in.close();
        }
        r.text = b.toString("UTF-8");
        c.disconnect();
        return r;
    }
}
