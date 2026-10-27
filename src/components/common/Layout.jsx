import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { initRealtimeSync, dbForceSyncAll } from '../../services/dbService';
import { 
  initNotificationChannels, 
  syncDailyDataEntryReminders, 
  syncFarmWeatherAndLightingAlerts 
} from '../../services/notificationService';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initRealtimeSync();
    initNotificationChannels();
    syncDailyDataEntryReminders();
    syncFarmWeatherAndLightingAlerts();

    // Auto re-sync when app resumes from background (mobile app or browser tab focus)
    const handleAppResume = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        dbForceSyncAll().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleAppResume);
    window.addEventListener('focus', handleAppResume);

    // Periodic cloud re-sync every 5 minutes
    const timer = setInterval(() => {
      syncDailyDataEntryReminders();
      syncFarmWeatherAndLightingAlerts();
      dbForceSyncAll().catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleAppResume);
      window.removeEventListener('focus', handleAppResume);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
          <div className="mx-auto max-w-7xl w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
