package mx.capri.auto;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.core.app.RemoteInput;

/** Recibe lo que el usuario le dijo a Capri desde el coche (o desde la notificación). */
public class ReplyReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Context c = context.getApplicationContext();
        Brain brain = new Brain(c);
        if (Notifier.ACTION_READ.equals(intent.getAction())) {
            Notifier.show(c, brain, false);
            return;
        }
        Bundle in = RemoteInput.getResultsFromIntent(intent);
        CharSequence said = in == null ? null : in.getCharSequence(Notifier.KEY_TEXT);
        if (said == null || said.toString().trim().isEmpty()) return;

        PendingResult pending = goAsync();
        new Thread(() -> {
            try { Talk.answer(c, brain, said.toString().trim()); }
            finally { pending.finish(); }
        }).start();
    }
}
