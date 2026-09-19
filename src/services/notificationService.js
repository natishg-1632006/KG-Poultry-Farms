import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { dbGetBatches, dbGetDailyRecords } from './dbService';

// Farm Village Location Coordinates: Thathayangarpatty, Namakkal, Tamil Nadu (637014)
export const FARM_LOCATION = {
  village: 'Thathayangarpatty, Namakkal',
  pincode: '637014',
  latitude: 11.3672,
  longitude: 78.1707
};

// Unique Notification IDs
const NOTIF_IDS = {
  ENTRY_8AM: 101,
  ENTRY_1PM: 102,
  ENTRY_6PM: 103,
  SUNRISE_LIGHT: 201,
  SUNSET_LIGHT: 202,
  HEAT_ALERT: 301,
  RAIN_WARNING: 302
};

// Pure white status bar small icon with default system alert sound & expandable summaryText
const DEFAULT_ICON_CONFIG = {
  smallIcon: 'ic_stat_icon',
  iconColor: '#FFFFFF', // Pure White Icon Background
  channelId: 'poultry_alerts_v4',
  summaryText: 'KG Poultry Farms'
};

/**
 * Get active app language ('en' or 'ta')
 */
const getAppLanguage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('app_language') || 'en';
  }
  return 'en';
};

/**
 * Initialize Local Notification Channels for Android
 */
export const initNotificationChannels = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Delete legacy channels so Android clears cached channel sound settings
    try { await LocalNotifications.deleteChannel({ id: 'poultry_alerts' }); } catch (_e) {}
    try { await LocalNotifications.deleteChannel({ id: 'poultry_alerts_v2' }); } catch (_e) {}
    try { await LocalNotifications.deleteChannel({ id: 'poultry_alerts_v3' }); } catch (_e) {}

    // Create fresh High Importance channel (omitting sound string so Android assigns System Default Notification Sound)
    await LocalNotifications.createChannel({
      id: 'poultry_alerts_v4',
      name: 'KG Poultry System Alerts',
      description: 'Alerts for data entry, shed lights, heat, and rain warnings',
      importance: 5, // MAX importance (plays default system sound & heads-up banner)
      visibility: 1,
      vibration: true
    });
  } catch (err) {
    console.warn('Failed to initialize notification channel:', err);
  }
};

/**
 * Helper to check if any batch is currently active
 */
const getActiveBatchesCount = async () => {
  try {
    const batches = await dbGetBatches();
    const active = (batches || []).filter(b => b.status === 'Active' || b.status === 'active');
    return active.length;
  } catch (err) {
    console.error('Error checking active batches for notifications:', err);
    return 0;
  }
};

/**
 * Helper to check if today's daily data log has already been submitted for active batches
 */
const isTodayEntrySubmitted = async () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const batches = await dbGetBatches();
    const activeBatches = (batches || []).filter(b => b.status === 'Active' || b.status === 'active');
    
    for (const b of activeBatches) {
      const records = await dbGetDailyRecords(b.id);
      if (!records) continue;

      let todayRecord = null;
      if (Array.isArray(records)) {
        todayRecord = records.find(r => r.recordDate === todayStr || (r.date && r.date.startsWith(todayStr)));
      } else if (typeof records === 'object') {
        todayRecord = records[todayStr] || Object.values(records).find(r => r && (r.recordDate === todayStr || (r.date && r.date.startsWith(todayStr))));
      }

      if (todayRecord) return true;
    }
    return false;
  } catch (err) {
    console.error('Error checking today daily entry status:', err);
    return false;
  }
};

/**
 * Requirement 1: Smart Daily Data Entry Reminders (8 AM, 1 PM, 6 PM)
 * - Reminds for Mortality, Feed, and Average Weight (NO water).
 * - Displays "KG Poultry Farms" in English for both languages.
 * - Supports English & Tamil (தமிழ்) based on app language.
 */
export const syncDailyDataEntryReminders = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const activeCount = await getActiveBatchesCount();
    
    // Rule: If NO active batch, cancel all entry reminders
    if (activeCount === 0) {
      await LocalNotifications.cancel({
        notifications: [
          { id: NOTIF_IDS.ENTRY_8AM },
          { id: NOTIF_IDS.ENTRY_1PM },
          { id: NOTIF_IDS.ENTRY_6PM }
        ]
      });
      return;
    }

    const todayDone = await isTodayEntrySubmitted();
    const lang = getAppLanguage();
    const now = new Date();

    // Helper to calculate next upcoming target Date (today if target time is in future, or tomorrow if passed)
    const getUpcomingTime = (targetHour, targetMinute = 0) => {
      const target = new Date();
      target.setHours(targetHour, targetMinute, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target;
    };

    const time8AM = getUpcomingTime(8, 0);
    const time1PM = getUpcomingTime(13, 0);
    const time6PM = getUpcomingTime(18, 0);

    // If today's entry is ALREADY done today, push 1 PM & 6 PM to tomorrow if they haven't rolled over yet
    if (todayDone) {
      if (time1PM.getDate() === now.getDate()) time1PM.setDate(time1PM.getDate() + 1);
      if (time6PM.getDate() === now.getDate()) time6PM.setDate(time6PM.getDate() + 1);
    }

    const notificationsToSchedule = [
      {
        id: NOTIF_IDS.ENTRY_8AM,
        title: lang === 'ta' 
          ? '📋 காலை தரவு பதிவு நினைவூட்டல் (காலை 8:00)'
          : '📋 Morning Data Entry Reminder (8:00 AM)',
        body: lang === 'ta'
          ? 'செயலில் உள்ள தொகுதி உள்ளது! KG Poultry Farms-க்கான காலை இறப்பு, தீவனம் மற்றும் சராசரி எடை பதிவுகளை உள்ளிடவும்.'
          : 'Active batch found! Please enter morning mortality, feed, and average weight records for KG Poultry Farms.',
        schedule: { at: time8AM, allowWhileIdle: true },
        ...DEFAULT_ICON_CONFIG
      },
      {
        id: NOTIF_IDS.ENTRY_1PM,
        title: lang === 'ta'
          ? '📋 மதிய தரவு பதிவு நினைவூட்டல் (மதியம் 1:00)'
          : '📋 Afternoon Data Entry Reminder (1:00 PM)',
        body: lang === 'ta'
          ? 'இன்றைய இறப்பு, தீவனம் மற்றும் சராசரி எடை பதிவை பூர்த்தி செய்யவும்.'
          : 'Active batch pending log! Please complete today\'s mortality, feed, and average weight entry.',
        schedule: { at: time1PM, allowWhileIdle: true },
        ...DEFAULT_ICON_CONFIG
      },
      {
        id: NOTIF_IDS.ENTRY_6PM,
        title: lang === 'ta'
          ? '📋 மாலை தரவு பதிவு நினைவூட்டல் (மாலை 6:00)'
          : '📋 Evening Data Entry Reminder (6:00 PM)',
        body: lang === 'ta'
          ? 'இன்றைய கடைசி நினைவூட்டல்! முடிப்பதற்கு முன் நாள்தோறும் இறப்பு, தீவனம் மற்றும் சராசரி எடை பதிவை சமர்ப்பிக்கவும்.'
          : 'Final reminder for today! Please submit daily mortality, feed, and average weight before closing.',
        schedule: { at: time6PM, allowWhileIdle: true },
        ...DEFAULT_ICON_CONFIG
      }
    ];

    await LocalNotifications.schedule({ notifications: notificationsToSchedule });
  } catch (err) {
    console.error('Error syncing daily data entry reminders:', err);
  }
};

/**
 * Requirement 2 & 3: Weather, Sunrise/Sunset Lighting, Heat & 1-Hour Rain Warning
 * Displays "KG Poultry Farms" in English for both languages.
 * Supports English & Tamil (தமிழ்) based on app language.
 */
export const syncFarmWeatherAndLightingAlerts = async () => {
  try {
    const activeCount = await getActiveBatchesCount();
    if (activeCount === 0) return; // Only process if active batch found!

    const now = new Date();
    const nowMs = now.getTime();

    // System Time Throttling: Check if at least 1 hour (3,600,000 ms) has passed since last check
    const LAST_WEATHER_CHECK_KEY = 'last_weather_check_timestamp';
    const lastCheckMs = Number(localStorage.getItem(LAST_WEATHER_CHECK_KEY) || 0);

    if (nowMs - lastCheckMs < 60 * 60 * 1000) {
      // Less than 1 hour has passed since last check; skip weather alert popups when opening app!
      return;
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${FARM_LOCATION.latitude}&longitude=${FARM_LOCATION.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation&daily=sunrise,sunset&timezone=Asia%2FKolkata`;

    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();

    // Mark current system time as last checked
    localStorage.setItem(LAST_WEATHER_CHECK_KEY, String(nowMs));

    if (!Capacitor.isNativePlatform()) return;

    const lang = getAppLanguage();
    const todayStr = now.toISOString().split('T')[0];

    // --- REQUIREMENT 2: Sunrise & Sunset Lighting Alerts ---
    if (data.daily && data.daily.sunrise && data.daily.sunset) {
      const lightingAlerts = [];

      // Find NEXT upcoming sunrise (today if in future, or tomorrow)
      let nextSunriseDate = null;
      for (const sIso of data.daily.sunrise) {
        const sDate = new Date(sIso);
        if (sDate.getTime() > now.getTime()) {
          nextSunriseDate = sDate;
          break;
        }
      }

      // Find NEXT upcoming sunset (today if in future, or tomorrow)
      let nextSunsetDate = null;
      for (const sIso of data.daily.sunset) {
        const sDate = new Date(sIso);
        if (sDate.getTime() > now.getTime()) {
          nextSunsetDate = sDate;
          break;
        }
      }

      // Sunrise Turn OFF Light Alert
      if (nextSunriseDate) {
        const sunriseFormatted = nextSunriseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lightingAlerts.push({
          id: NOTIF_IDS.SUNRISE_LIGHT,
          title: lang === 'ta'
            ? `🌅 KG Poultry Farms-ல் சூரிய உதயம் (${sunriseFormatted})`
            : `🌅 Sunrise at KG Poultry Farms (${sunriseFormatted})`,
          body: lang === 'ta'
            ? `KG Poultry Farms-ல் சூரியன் உதித்துவிட்டது! மின்சாரத்தை சேமிக்க கொட்டகை விளக்குகளை அணைக்கவும்.`
            : `Sunrise has arrived at KG Poultry Farms! Please turn OFF shed lights to save electricity.`,
          schedule: { at: nextSunriseDate, allowWhileIdle: true },
          ...DEFAULT_ICON_CONFIG
        });
      }

      // Sunset Turn ON Light Alert
      if (nextSunsetDate) {
        const sunsetFormatted = nextSunsetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lightingAlerts.push({
          id: NOTIF_IDS.SUNSET_LIGHT,
          title: lang === 'ta'
            ? `🌙 KG Poultry Farms-ல் சூரிய அஸ்தமனம் (${sunsetFormatted})`
            : `🌙 Sunset at KG Poultry Farms (${sunsetFormatted})`,
          body: lang === 'ta'
            ? `KG Poultry Farms-ல் சூரியன் அஸ்தமித்துவிட்டது! தீவன உணவளிப்பிற்கு கொட்டகை விளக்குகளை இயக்கவும்.`
            : `Sunset at KG Poultry Farms! Please turn ON shed lights for active batch feeding.`,
          schedule: { at: nextSunsetDate, allowWhileIdle: true },
          ...DEFAULT_ICON_CONFIG
        });
      }

      if (lightingAlerts.length > 0) {
        await LocalNotifications.schedule({ notifications: lightingAlerts });
      }
    }

    // --- REQUIREMENT 3: Heat Warning & 1-Hour Rain Advance Warning ---
    const currentTemp = data.current?.temperature_2m;
    const currentHumidity = data.current?.relative_humidity_2m;

    // Heat & Ventilation Warning (Current Temp >= 32°C) - Only issued during periodic system time checks
    if (currentTemp >= 32) {
      await LocalNotifications.schedule({
        notifications: [{
          id: NOTIF_IDS.HEAT_ALERT,
          title: lang === 'ta'
            ? `🌡️ அதிக வெப்ப எச்சரிக்கை (${currentTemp}°C)`
            : `🌡️ High Heat Warning (${currentTemp}°C)`,
          body: lang === 'ta'
            ? `KG Poultry Farms-ல் அதிக வெப்பநிலை (${currentTemp}°C) கண்டறியப்பட்டது! குளிரூட்டும் விசிறிகளை உடனடியாக இயக்கவும்.`
            : `High temperature (${currentTemp}°C, Humidity: ${currentHumidity}%) detected at KG Poultry Farms! Turn ON cooling fans & foggers immediately.`,
          ...DEFAULT_ICON_CONFIG
        }]
      });
    }

    // Rain Advance Warning (Check hourly forecast for next 1-2 hours)
    if (data.hourly && data.hourly.time && data.hourly.precipitation_probability) {
      const times = data.hourly.time;
      const popList = data.hourly.precipitation_probability;

      const nowTimeStr = `${todayStr}T${String(now.getHours()).padStart(2, '0')}:00`;
      const currentIndex = times.findIndex(t => t.startsWith(nowTimeStr));

      if (currentIndex !== -1 && currentIndex + 1 < popList.length) {
        const next1HourPop = popList[currentIndex + 1];
        const next1HourPrecip = data.hourly.precipitation ? data.hourly.precipitation[currentIndex + 1] : 0;

        if (next1HourPop >= 60 || next1HourPrecip >= 0.5) {
          await LocalNotifications.schedule({
            notifications: [{
              id: NOTIF_IDS.RAIN_WARNING,
              title: lang === 'ta'
                ? `🌧️ 1 மணி நேரத்தில் மழை எதிர்பார்க்கப்படுகிறது! (${next1HourPop}% வாய்ப்பு)`
                : `🌧️ Rain Expected in ~1 Hour! (${next1HourPop}% Chance)`,
              body: lang === 'ta'
                ? `KG Poultry Farms-ல் 1 மணி நேரத்தில் மழை பெய்ய வாய்ப்புள்ளது. கொட்டகை பக்க திரைச்சீலைகளை மூடி தீவன பைகளை பாதுகாக்கவும்!`
                : `Rain forecasted at KG Poultry Farms in 1 hour. Please close shed side curtains & secure feed bags now!`,
              ...DEFAULT_ICON_CONFIG
            }]
          });
        }
      }
    }

  } catch (err) {
    console.error('Error syncing farm weather and lighting alerts:', err);
  }
};


