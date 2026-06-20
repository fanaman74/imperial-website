'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Locale } from './config';
import frDict from './dictionaries/fr.json';
import nlDict from './dictionaries/nl.json';
import enDict from './dictionaries/en.json';

const dicts = { fr: frDict, nl: nlDict, en: enDict } as const;
type Dict = typeof frDict;

interface LangCtx {
  locale: Locale;
  dict: Dict;
  setLocale: (l: Locale) => void;
}

const LanguageContext = createContext<LangCtx>({
  locale: 'fr',
  dict: frDict,
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const saved = localStorage.getItem('imperial-locale') as Locale;
    if (saved === 'fr' || saved === 'nl' || saved === 'en') {
      setLocaleState(saved);
    }
  }, []);

  // Sync <html lang> attribute with the active locale for screen readers and SEO
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(lng: Locale) {
    setLocaleState(lng);
    localStorage.setItem('imperial-locale', lng);
    document.documentElement.lang = lng;
  }

  return (
    <LanguageContext.Provider value={{ locale, dict: dicts[locale], setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
