import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  return useContext(SettingsContext);
};

export const SettingsProvider = ({ children }) => {
  const [language, setLanguage] = useState('zh');
  const [theme, setTheme] = useState('dark'); // 默认设置为暗黑主题

  // 从localStorage加载设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // 保存语言设置到localStorage
  const updateLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  // 保存主题设置到localStorage
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const value = {
    language,
    theme,
    updateLanguage,
    updateTheme
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};