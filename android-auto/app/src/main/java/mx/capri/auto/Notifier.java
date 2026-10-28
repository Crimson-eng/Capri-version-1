package mx.capri.auto;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.app.RemoteInput;
import androidx.core.graphics.drawable.IconCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Muestra la plática como una conversación de mensajes. Android Auto la lee en
 * voz alta y deja contestar hablando (acción "Responder" con RemoteInput).
 */
final class Notifier {
    static final String CHANNEL = "capri_chat";
    static final int ID = 7;
    static final String KEY_TEXT = "capri_reply";
    static final String ACTION_REPLY = "mx.capri.auto.REPLY";
    static final String ACTION_READ = "mx.capri.auto.READ";
    static final int SHOW = 6;

    static void channel(Context c) {
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Plática con Capri", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Mensajes de Capri (se leen en Android Auto)");
        c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }

    /** Publica la conversación. alert=false la actualiza sin volver a sonar. */
    static void show(Context c, Brain brain, boolean alert) {
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        channel(c);

        Person me = new Person.Builder().setName("Tú").setKey("me").build();
        Person capri = new Person.Builder().setName("Capri").setKey("capri")
                .setIcon(IconCompat.createWithBitmap(BitmapFactory.decodeResource(c.getResources(), R.mipmap.ic_launcher)))
                .build();

        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(me).setGroupConversation(false);
        JSONArray h = brain.history();
        for (int i = Math.max(0, h.length() - SHOW); i < h.length(); i++) {
            JSONObject m = h.optJSONObject(i);
            boolean mine = m.optBoolean("u");
            style.addMessage(new NotificationCompat.MessagingStyle.Message(m.optString("t"), m.optLong("ts"), mine ? null : capri));
        }

        RemoteInput input = new RemoteInput.Builder(KEY_TEXT).setLabel("Háblale a Capri").build();
        PendingIntent replyPi = PendingIntent.getBroadcast(c, 1,
                new Intent(c, ReplyReceiver.class).setAction(ACTION_REPLY),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        NotificationCompat.Action reply = new NotificationCompat.Action.Builder(R.drawable.ic_capri, "Responder", replyPi)
                .addRemoteInput(input)
                .setAllowGeneratedReplies(true)
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY)
                .setShowsUserInterface(false)
                .build();

        PendingIntent readPi = PendingIntent.getBroadcast(c, 2,
                new Intent(c, ReplyReceiver.class).setAction(ACTION_READ),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Action read = new NotificationCompat.Action.Builder(R.drawable.ic_capri, "Leído", readPi)
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_MARK_AS_READ)
                .setShowsUserInterface(false)
                .build();

        PendingIntent open = PendingIntent.getActivity(c, 3,
                new Intent(c, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_capri)
                .setColor(0xFFFF1F55)
                .setStyle(style)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(open)
                .addAction(reply)
                .addInvisibleAction(read)
                .setSilent(!alert);

        try {
            NotificationManagerCompat.from(c).notify(ID, b.build());
        } catch (SecurityException ignored) { }
    }
}
