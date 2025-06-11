import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import arTranslation from './locales/ar.json';
import bgTranslation from './locales/bg.json';
import deTranslation from './locales/de.json';
import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';
import frTranslation from './locales/fr.json';
import heTranslation from './locales/he.json';
import itTranslation from './locales/it.json';
import nlTranslation from './locales/nl.json';
import plTranslation from './locales/pl.json';
import ptTranslation from './locales/pt.json';
import ruTranslation from './locales/ru.json';
import zhTranslation from './locales/zh.json';
export const resources = {
  en: {
    ns1: enTranslation,
  },
  es: {
    ns1: esTranslation,
  },
  ar: {
    ns1: arTranslation,
  },
  bg: {
    ns1: bgTranslation,
  },
  de: {
    ns1: deTranslation,
  },
  fr: {
    ns1: frTranslation,
  },
  he: {
    ns1: heTranslation,
  },
  it: {
    ns1: itTranslation,
  },
  nl: {
    ns1: nlTranslation,
  },
  pl: {
    ns1: plTranslation,
  },
  pt: {
    ns1: ptTranslation,
  },
  ru: {
    ns1: ruTranslation,
  },
  zh: {
    ns1: zhTranslation,
  },
} as const;
// Initialize i18next
i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    debug: true,
     //lng: 'ar',
    defaultNS: 'ns1',
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
  });

export default i18n;
