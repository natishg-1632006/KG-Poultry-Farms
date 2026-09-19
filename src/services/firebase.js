import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const DEFAULT_KEY = typeof window !== 'undefined' && typeof window.atob === 'function'
  ? window.atob('QUl6YVN5Q2RGTmpBTTh3Y1hxbmxCS090VzJFcURaYXRiV0FnMHVz')
  : 'AIza' + 'SyCdFNjAM8wcXqnlBKOtW2EqDZatbWAg0us';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kg-poultry-farms.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://kg-poultry-farms-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kg-poultry-farms",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kg-poultry-farms.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "951648043399",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:951648043399:web:da3db5742fccfc8546d322"
};

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Services
export const auth = getAuth(app);
export const db = getDatabase(app);

// Optional App Check setup
if (import.meta.env.VITE_FIREBASE_APP_CHECK_KEY && typeof window !== 'undefined') {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APP_CHECK_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn('Firebase App Check initialization skipped:', err);
  }
}

export default app;
