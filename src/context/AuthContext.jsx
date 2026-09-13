import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { dbGetUsers, dbSaveUser, dbLogAuditEvent } from '../services/dbService';

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
      let profile = users.find(u => u.uid === uid || u.email === email);
      
      if (!profile) {
        // Initialize superadmin if first user
        profile = {
          uid,
          name: email ? email.split('@')[0] : 'Admin User',
          email,
          role: users.length === 0 ? 'Admin' : 'Farmer',
          active: true,
          farmName: 'KG Main Farm',
          assignedBatches: users.length === 0 ? [] : ['KG001'],
          createdAt: new Date().toISOString()
        };
        await dbSaveUser(profile);
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
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const profile = await loadUserProfile(res.user.uid, res.user.email);
      dbLogAuditEvent('LOGIN', `User ${email} logged in`, profile?.name || email);
      return profile;
    } catch (err) {
      // Demo fallback login if firebase auth fails in demo mode
      const users = await dbGetUsers();
      const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        if (!matched.active) {
          setError('Account is inactive. Contact Admin.');
          throw new Error('Account inactive');
        }
        setCurrentUser({ uid: matched.uid, email: matched.email });
        setUserProfile(matched);
        localStorage.setItem('kg_poultry_active_session', JSON.stringify(matched));
        dbLogAuditEvent('DEMO_LOGIN', `User ${matched.email} logged in (Local mode)`, matched.name);
        return matched;
      }
      setError(err.message || 'Invalid email or password.');
      throw err;
    }
  };

  const loginAsDemo = async (role = 'Admin') => {
    setError(null);
    const demoUser = {
      uid: role === 'Admin' ? 'admin-uid-1' : 'farmer-uid-1',
      name: role === 'Admin' ? 'System Admin' : 'Ramesh Kumar',
      email: role === 'Admin' ? 'admin@kgpoultry.com' : 'farmer@kgpoultry.com',
      role,
      active: true,
      farmName: role === 'Admin' ? 'KG Central Farm' : 'KG North Shed',
      assignedBatches: role === 'Farmer' ? ['KG001'] : []
    };

    setCurrentUser({ uid: demoUser.uid, email: demoUser.email });
    setUserProfile(demoUser);
    localStorage.setItem('kg_poultry_active_session', JSON.stringify(demoUser));
    try {
      dbLogAuditEvent('DEMO_LOGIN', `Logged in as Demo ${role}`, demoUser.name);
    } catch (_e) {
      // ignore
    }
    return demoUser;
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
    loginAsDemo,
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
