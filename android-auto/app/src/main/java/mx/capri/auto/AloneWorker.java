package mx.capri.auto;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.car.app.connection.CarConnection;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.Observer;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Cada ~15 min Capri decide si dice algo por su cuenta (sobre todo cuando vas en el coche). */
public class AloneWorker extends Worker {
    static final String NAME = "capri_sola";

    public AloneWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

    static void schedule(Context c, boolean on) {
        WorkManager wm = WorkManager.getInstance(c);
        if (!on) { wm.cancelUniqueWork(NAME); return; }
        wm.enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.KEEP,
                new PeriodicWorkRequest.Builder(AloneWorker.class, 15, TimeUnit.MINUTES).build());
    }

    @NonNull
    @Override
    public Result doWork() {
        Context c = getApplicationContext();
        Brain brain = new Brain(c);
        SharedPreferences p = brain.prefs();
        if (!p.getBoolean("alone", true)) return Result.success();

        boolean inCar = carType(c) == CarConnection.CONNECTION_TYPE_PROJECTION;
        boolean wasInCar = p.getBoolean("inCar", false);
        p.edit().putBoolean("inCar", inCar).apply();
        if (!inCar && !p.getBoolean("aloneOutside", false)) return Result.success();

        long quiet = System.currentTimeMillis() - brain.lastMessageAt();
        boolean often = p.getBoolean("often", false);
        if (inCar && !wasInCar && quiet > TimeUnit.MINUTES.toMillis(30)) {
            Talk.speakAlone(c, brain, true);
        } else if (quiet > TimeUnit.MINUTES.toMillis(often ? 14 : 29) && new Random().nextInt(100) < (often ? 80 : 55)) {
            Talk.speakAlone(c, brain, false);
        }
        return Result.success();
    }

    /** Pregunta a Android Auto si está conectado. -1 si no se pudo saber. */
    static int carType(Context c) {
        final int[] type = {-1};
        CountDownLatch done = new CountDownLatch(1);
        Handler main = new Handler(Looper.getMainLooper());
        final LiveData<Integer>[] live = new LiveData[1];
        Observer<Integer> o = v -> { if (v != null) { type[0] = v; done.countDown(); } };
        main.post(() -> { live[0] = new CarConnection(c).getType(); live[0].observeForever(o); });
        try { done.await(4, TimeUnit.SECONDS); } catch (InterruptedException ignored) { }
        main.post(() -> { if (live[0] != null) live[0].removeObserver(o); });
        return type[0];
    }
}
