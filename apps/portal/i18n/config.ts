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

// Initialize i18next
i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      es: {
        translation: esTranslation,
      },
      ar: {
        translation: arTranslation,
      },
      bg: {
        translation: bgTranslation,
      },
      de: {
        translation: deTranslation,
      },
      fr: {
        translation: frTranslation,
      },
      he: {
        translation: heTranslation,
      },
      it: {
        translation: itTranslation,
      },
      nl: {
        translation: nlTranslation,
      },
      pl: {
        translation: plTranslation,
      },
      pt: {
        translation: ptTranslation,
      },
      ru: {
        translation: ruTranslation,
      },
      zh: {
        translation: zhTranslation,
      },
    },
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
  });

export default i18n;
