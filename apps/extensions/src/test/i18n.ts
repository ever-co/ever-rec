import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../i18n/locales/en.json';

// English strings, so tests find controls by the names a screen reader announces.
i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { ns1: en } },
  defaultNS: 'ns1',
  initAsync: false,
  interpolation: { escapeValue: false },
});

export default i18n;
