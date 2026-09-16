import React, { createContext, useContext, useState, useEffect } from 'react';
import { content } from '../constants/content';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  const setLanguage = (lang) => {
    if (content[lang]) {
      setLanguageState(lang);
      localStorage.setItem('app_language', lang);
    }
  };

  const t = (key) => {
    if (!key) return '';
    return content[language]?.[key] || content['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, content }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
