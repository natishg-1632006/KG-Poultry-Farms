package com.kgpoultry.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class WeatherWorkerReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "poultry_alerts_v4";
    public static final int HEAT_NOTIF_ID = 301;
    public static final int RAIN_NOTIF_ID = 302;

    @Override
    public void onReceive(final Context context, Intent intent) {
        // Schedule next check in 1 hour
        scheduleNextCheck(context);

        // System time throttling check: 1 hour cooldown (3,600,000 ms)
        android.content.SharedPreferences prefs = context.getSharedPreferences("weather_prefs", Context.MODE_PRIVATE);
        long lastCheck = prefs.getLong("last_check_time", 0);
        long now = System.currentTimeMillis();

        if (now - lastCheck < 60 * 60 * 1000L) {
            // Less than 1 hour passed since last check, skip duplicate weather alert
            return;
        }

        prefs.edit().putLong("last_check_time", now).apply();

        // Execute background fetch on separate thread
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    checkWeatherAndNotify(context);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }).start();
    }

    public static void scheduleNextCheck(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, WeatherWorkerReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, 888, intent, flags);

        // Interval: 1 Hour (3,600,000 ms)
        long triggerAtMillis = System.currentTimeMillis() + 60 * 60 * 1000L;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
        }
    }

    private void checkWeatherAndNotify(Context context) throws Exception {
        String urlString = "https://api.open-meteo.com/v1/forecast?latitude=11.3672&longitude=78.1707&current=temperature_2m,relative_humidity_2m&hourly=precipitation_probability,precipitation&timezone=Asia%2FKolkata";
        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);

        int responseCode = conn.getResponseCode();
        if (responseCode != 200) return;

        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        reader.close();

        JSONObject json = new JSONObject(sb.toString());

        // Check Temperature (Heat Alert >= 32°C)
        if (json.has("current")) {
            JSONObject current = json.getJSONObject("current");
            double temp = current.optDouble("temperature_2m", 0.0);
            double humidity = current.optDouble("relative_humidity_2m", 0.0);

            if (temp >= 32.0) {
                showNotification(
                    context,
                    HEAT_NOTIF_ID,
                    "🌡️ High Heat Warning (" + (int)Math.round(temp) + "°C)",
                    "High temperature (" + (int)Math.round(temp) + "°C, Humidity: " + (int)Math.round(humidity) + "%) detected at KG Poultry Farms! Turn ON cooling fans & foggers immediately."
                );
            }
        }

        // Check Rain Warning (next hour precip prob >= 60%)
        if (json.has("hourly")) {
            JSONObject hourly = json.getJSONObject("hourly");
            if (hourly.has("precipitation_probability")) {
                JSONArray popArray = hourly.getJSONArray("precipitation_probability");
                if (popArray.length() > 1) {
                    int nextHourPop = popArray.optInt(1, 0);
                    if (nextHourPop >= 60) {
                        showNotification(
                            context,
                            RAIN_NOTIF_ID,
                            "🌧️ Rain Expected in ~1 Hour! (" + nextHourPop + "% Chance)",
                            "Rain forecasted at KG Poultry Farms in 1 hour. Please close shed side curtains & secure feed bags now!"
                        );
                    }
                }
            }
        }
    }

    private void showNotification(Context context, int notificationId, String title, String body) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = nm.getNotificationChannel(CHANNEL_ID);
            if (channel == null) {
                channel = new NotificationChannel(
                    CHANNEL_ID,
                    "KG Poultry System Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Alerts for data entry, shed lights, heat, and rain warnings");
                channel.enableVibration(true);
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(channel);
            }
        }

        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (intent == null) intent = new Intent();
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_CANCEL_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(context, notificationId, intent, flags);

        int smallIconResId = context.getResources().getIdentifier("ic_stat_icon", "drawable", context.getPackageName());
        if (smallIconResId == 0) {
            smallIconResId = android.R.drawable.ic_dialog_info;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(smallIconResId)
            .setColor(Color.WHITE)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body).setSummaryText("KG Poultry Farms"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(notificationId, builder.build());
    }
}
