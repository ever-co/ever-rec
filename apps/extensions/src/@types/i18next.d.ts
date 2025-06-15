import en from '../../i18n/locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: '';
    nsSeparator: '.';
    resources: typeof en;
  }
}
