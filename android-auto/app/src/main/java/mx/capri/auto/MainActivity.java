package mx.capri.auto;

import android.Manifest;
import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/** Pantalla del celular: ajustes, la plática y los pasos para activarla en el coche. */
public class MainActivity extends Activity {
    static final int RED = 0xFFFF1F55, CYAN = 0xFF22E5F0, BG = 0xFF0A0410, PANEL = 0xFF170812, TEXT = 0xFFF3D9E2, DIM = 0xFF9A7A88;

    private Brain brain;
    private LinearLayout root;
    private TextView chat, error;
    private EditText name, key, model, say;
    private CheckBox alone, often, outside;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        brain = new Brain(this);
        Notifier.channel(this);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.setFitsSystemWindows(true);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(16), dp(20), dp(16), dp(32));
        scroll.addView(root);

        TextView title = label("CAPRI // AUTO", 26, RED, true);
        title.setLetterSpacing(0.12f);
        root.addView(title);
        root.addView(label("Capri en tu coche, por voz, con Android Auto", 14, DIM, false));

        SharedPreferences p = brain.prefs();
        section("CONEXIÓN");
        name = field("Tu nombre", p.getString("name", "Kiga"), false);
        key = field("Clave de Gemini (la misma de Capri)", p.getString("key", ""), true);
        model = field("Modelo", p.getString("model", Brain.DEFAULT_MODEL), false);

        section("VIDA PROPIA");
        alone = check("Capri me habla sola cuando voy en el coche", p.getBoolean("alone", true));
        often = check("Más seguido (cada ~15 min en vez de ~30)", p.getBoolean("often", false));
        outside = check("También fuera del coche (notificaciones en el celular)", p.getBoolean("aloneOutside", false));
        root.addView(button("GUARDAR", RED, v -> save()));

        section("PROBAR");
        root.addView(button("QUE CAPRI ME SALUDE", CYAN, v -> {
            save();
            Toast.makeText(this, "Capri está pensando…", Toast.LENGTH_SHORT).show();
            new Thread(() -> { Talk.speakAlone(this, brain, true); runOnUiThread(this::refresh); }).start();
        }));
        say = field("Escríbele algo para probar", "", false);
        root.addView(button("ENVIAR", CYAN, v -> {
            String t = say.getText().toString().trim();
            if (t.isEmpty()) return;
            save();
            say.setText("");
            new Thread(() -> { Talk.answer(this, brain, t); runOnUiThread(this::refresh); }).start();
            refreshSoon();
        }));
        error = label("", 13, RED, false);
        root.addView(error);
        chat = label("", 15, TEXT, false);
        chat.setPadding(dp(12), dp(12), dp(12), dp(12));
        chat.setBackground(box(PANEL, 0x55FF1F55));
        root.addView(chat, margins(0, dp(8)));
        root.addView(button("BORRAR PLÁTICA", DIM, v -> { brain.clear(); refresh(); }));

        section("ACTIVARLA EN EL COCHE (UNA SOLA VEZ)");
        root.addView(label(
                "1. Abre los ajustes de Android Auto en tu celular (búscalo como \"Android Auto\" en Ajustes).\n"
              + "2. Baja hasta \"Versión\" y tócala 10 veces. Acepta el aviso de modo desarrollador.\n"
              + "3. Arriba a la derecha toca ⋮ → \"Configuración para desarrolladores\" y activa \"Fuentes desconocidas\".\n"
              + "4. Cierra y abre Android Auto. Deja que Capri Auto te muestre notificaciones (te lo pide al abrirla).\n"
              + "5. Conecta el coche. Cuando llegue un mensaje de Capri, el coche lo lee; toca \"Responder\" o di \"responder\" y háblale.\n\n"
              + "Seguridad: Capri solo habla y escucha. No mires el celular mientras manejas.", 14, TEXT, false));

        setContentView(scroll);
        AloneWorker.schedule(this, p.getBoolean("alone", true));
        refresh();
    }

    @Override
    protected void onResume() { super.onResume(); refresh(); }

    private void save() {
        brain.prefs().edit()
                .putString("name", name.getText().toString().trim().isEmpty() ? "Kiga" : name.getText().toString().trim())
                .putString("key", key.getText().toString().trim())
                .putString("model", model.getText().toString().trim().isEmpty() ? Brain.DEFAULT_MODEL : model.getText().toString().trim())
                .putBoolean("alone", alone.isChecked())
                .putBoolean("often", often.isChecked())
                .putBoolean("aloneOutside", outside.isChecked())
                .apply();
        AloneWorker.schedule(this, alone.isChecked());
        Toast.makeText(this, "Guardado", Toast.LENGTH_SHORT).show();
    }

    private void refreshSoon() { root.postDelayed(this::refresh, 400); }

    private void refresh() {
        if (chat == null) return;
        JSONArray h = brain.history();
        StringBuilder sb = new StringBuilder();
        for (int i = Math.max(0, h.length() - 12); i < h.length(); i++) {
            JSONObject m = h.optJSONObject(i);
            sb.append(m.optBoolean("u") ? "Tú: " : "Capri: ").append(m.optString("t")).append("\n\n");
        }
        chat.setText(sb.length() == 0 ? "Aún no hay plática. Prueba el saludo." : sb.toString().trim());
        String e = brain.prefs().getString("error", "");
        error.setText(e.isEmpty() ? "" : "Último error: " + e);
        error.setVisibility(e.isEmpty() ? View.GONE : View.VISIBLE);
    }

    // ---------- piezas de la pantalla ----------

    private void section(String s) {
        TextView t = label("▸ " + s, 13, CYAN, true);
        t.setLetterSpacing(0.1f);
        root.addView(t, margins(dp(22), dp(6)));
    }

    private TextView label(String s, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setLineSpacing(0, 1.15f);
        if (bold) t.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        return t;
    }

    private EditText field(String hint, String value, boolean secret) {
        root.addView(label(hint, 12, DIM, false), margins(dp(8), dp(2)));
        EditText e = new EditText(this);
        e.setText(value);
        e.setTextColor(TEXT);
        e.setHintTextColor(DIM);
        e.setSingleLine(true);
        e.setPadding(dp(12), dp(10), dp(12), dp(10));
        e.setBackground(box(PANEL, 0x66FF1F55));
        if (secret) e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        root.addView(e);
        return e;
    }

    private CheckBox check(String s, boolean on) {
        CheckBox c = new CheckBox(this);
        c.setText(s);
        c.setTextColor(TEXT);
        c.setChecked(on);
        c.setButtonTintList(android.content.res.ColorStateList.valueOf(RED));
        root.addView(c);
        return c;
    }

    private Button button(String s, int color, View.OnClickListener l) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextColor(color);
        b.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        b.setGravity(Gravity.CENTER);
        b.setBackground(box(0x00000000, color));
        b.setOnClickListener(l);
        root.addView(b, margins(dp(10), 0));
        return b;
    }

    private GradientDrawable box(int fill, int stroke) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(fill);
        g.setStroke(dp(1), stroke);
        g.setCornerRadius(dp(4));
        return g;
    }

    private LinearLayout.LayoutParams margins(int top, int bottom) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, top, 0, bottom);
        return lp;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
}
