package mx.capri.auto;

import android.content.Context;

/** Una vuelta de plática: guarda, pregunta a Gemini y publica la respuesta. Llamar fuera del hilo principal. */
final class Talk {
    static void answer(Context c, Brain brain, String said) {
        brain.add(true, said);
        Notifier.show(c, brain, false);
        String text;
        try {
            text = brain.reply();
            brain.prefs().edit().remove("error").apply();
        } catch (Exception e) {
            brain.prefs().edit().putString("error", e.getMessage()).apply();
            text = "Ugh, se me cayó la conexión con mi cerebro, choom. Dímelo otra vez en un ratito.";
        }
        brain.add(false, text);
        Notifier.show(c, brain, true);
    }

    static boolean speakAlone(Context c, Brain brain, boolean justGotIn) {
        try {
            String text = brain.spontaneous(justGotIn);
            brain.prefs().edit().remove("error").apply();
            brain.add(false, text);
            Notifier.show(c, brain, true);
            return true;
        } catch (Exception e) {
            brain.prefs().edit().putString("error", e.getMessage()).apply();
            return false;
        }
    }
}
