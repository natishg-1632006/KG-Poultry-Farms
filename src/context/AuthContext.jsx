import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { dbGetUsers, dbSaveUser, dbLogAuditEvent } from '../services/dbService';

const googleProvider = new GoogleAuthProvider();

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync auth state and load user profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadUserProfile(user.uid, user.email);
      } else {
        // Fallback to active session stored in localStorage if demo/offline mode
        const savedSession = localStorage.getItem('kg_poultry_active_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          setCurrentUser({ uid: parsed.uid, email: parsed.email });
          setUserProfile(parsed);
        } else {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserProfile = async (uid, email) => {
    try {
      const users = await dbGetUsers();
      let profile = users.find(u => u.uid === uid || (u.email && u.email.toLowerCase().trim() === (email || '').toLowerCase().trim()));
      
      if (!profile) {
        const deniedMsg = 'Access Denied: Unauthorized account. Please sign in with an authorized farm account.';
        setError(deniedMsg);
        try { await firebaseSignOut(auth); } catch (_e) {}
        localStorage.removeItem('kg_poultry_active_session');
        setCurrentUser(null);
        setUserProfile(null);
        return null;
      }

      if (!profile.active) {
        setError('Your account has been deactivated. Please contact an Administrator.');
        await logout();
        return null;
      }

      setUserProfile(profile);
      localStorage.setItem('kg_poultry_active_session', JSON.stringify(profile));
      return profile;
    } catch (err) {
      console.error('Failed loading user profile:', err);
      return null;
    }
  };

  const login = async (email, password) => {
    setError(null);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      const errMsg = 'Please enter both email and password.';
      setError(errMsg);
      throw new Error(errMsg);
    }

    try {
      // 1. Primary: Verify email & password directly via Firebase Authentication
      const res = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const profile = await loadUserProfile(res.user.uid, res.user.email);
      if (!profile) {
        throw new Error('Access Denied: Unauthorized account. Please sign in with an authorized farm account.');
      }
      dbLogAuditEvent('LOGIN', `User ${cleanEmail} logged in`, profile?.name || cleanEmail);
      return profile;
    } catch (fbErr) {
      // If Firebase Auth returned invalid credentials, reject immediately
      if (
        fbErr.code === 'auth/wrong-password' ||
        fbErr.code === 'auth/invalid-credential' ||
        fbErr.code === 'auth/user-not-found' ||
        fbErr.code === 'auth/invalid-email'
      ) {
        const invMsg = 'Invalid email or password. Please try again.';
        setError(invMsg);
        throw new Error(invMsg);
      }

      // 2. Offline / local fallback mode
      const users = await dbGetUsers();
      const matched = users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);
      
      if (!matched) {
        const invMsg = 'Invalid email or password. Please try again.';
        setError(invMsg);
        throw new Error(invMsg);
      }

      if (!matched.active) {
        const inactiveMsg = 'Account is inactive. Please contact Administrator.';
        setError(inactiveMsg);
        throw new Error(inactiveMsg);
      }

      const expectedPassword = matched.password || (cleanEmail.includes('kgpoultryfarms') ? 'kgpoultry123' : 'farmer123');
      if (cleanPassword !== expectedPassword) {
        const invMsg = 'Invalid email or password. Please try again.';
        setError(invMsg);
        throw new Error(invMsg);
      }

      setCurrentUser({ uid: matched.uid, email: matched.email });
      setUserProfile(matched);
      localStorage.setItem('kg_poultry_active_session', JSON.stringify(matched));
      dbLogAuditEvent('LOGIN', `User ${matched.email} logged in`, matched.name);
      return matched;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const googleEmail = (res.user.email || '').toLowerCase().trim();
      const ALLOWED_EMAIL = 'kgpoultryfarms@gmail.com';

      if (googleEmail !== ALLOWED_EMAIL) {
        try { await firebaseSignOut(auth); } catch (_e) {}
        const deniedMsg = 'Access Denied: Unauthorized account. Please sign in with an authorized farm account.';
        setError(deniedMsg);
        throw new Error(deniedMsg);
      }

      const users = await dbGetUsers();
      let matched = users.find(u => (u.email || '').toLowerCase().trim() === googleEmail);

      if (!matched) {
        matched = {
          uid: res.user.uid,
          name: 'KG Poultry Farms',
          email: ALLOWED_EMAIL,
          role: 'Farmer',
          active: true,
          farmName: 'KG Poultry Farms',
          assignedBatches: ['KG001', 'KG002'],
          createdAt: new Date().toISOString()
        };
        await dbSaveUser(matched);
      }

      if (!matched.active) {
        try { await firebaseSignOut(auth); } catch (_e) {}
        const inactiveMsg = 'Your account is inactive. Please contact Administrator.';
        setError(inactiveMsg);
        throw new Error(inactiveMsg);
      }

      setUserProfile(matched);
      localStorage.setItem('kg_poultry_active_session', JSON.stringify(matched));
      dbLogAuditEvent('GOOGLE_LOGIN', `User ${res.user.email} logged in via Google`, matched.name || res.user.email);
      return matched;
    } catch (err) {
      console.error('Google login error:', err);
      const msg = err.code === 'auth/popup-closed-by-user'
        ? 'Sign-in window closed before completion.'
        : (err.message || 'Google Sign-In failed.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      // ignore
    }
    localStorage.removeItem('kg_poultry_active_session');
    setCurrentUser(null);
    setUserProfile(null);
  };

  const value = {
    currentUser,
    userProfile,
    role: userProfile?.role || null,
    isAdmin: userProfile?.role === 'Admin',
    isFarmer: userProfile?.role === 'Farmer',
    loading,
    error,
    login,
    loginWithGoogle,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
