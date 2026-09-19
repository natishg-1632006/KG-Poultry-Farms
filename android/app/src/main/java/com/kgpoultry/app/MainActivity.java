package com.kgpoultry.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DownloadPdfPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Start native background weather worker check (runs even when app is closed)
        WeatherWorkerReceiver.scheduleNextCheck(this);
    }
}
