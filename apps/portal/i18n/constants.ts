export interface Language {
  /** English name. */
  text: string;
  code: string;
  /** The language's own name, as a person who reads it expects to find it in a list. */
  nativeName: string;
  /** Set for a language written right to left: the portal then lays out mirrored (`<html dir>`). */
  dir?: 'rtl';
}

/**
 * i18next-browser-languagedetector's options, written out (they are its defaults): the script in
 * `_document` that sets `<html dir>` before the first paint reads the same sources in the same order.
 */
export const languageDetection = {
  order: [
    'querystring',
    'cookie',
    'localStorage',
    'sessionStorage',
    'navigator',
    'htmlTag',
  ],
  lookupQuerystring: 'lng',
  lookupCookie: 'i18next',
  lookupLocalStorage: 'i18nextLng',
  lookupSessionStorage: 'i18nextLng',
  caches: ['localStorage'],
};

export const languages: Language[] = [
  { text: 'English', code: 'en', nativeName: 'English' },
  { text: 'Bulgarian', code: 'bg', nativeName: 'Български' },
  { text: 'Hebrew', code: 'he', nativeName: 'עברית', dir: 'rtl' },
  { text: 'Russian', code: 'ru', nativeName: 'Русский' },
  { text: 'French', code: 'fr', nativeName: 'Français' },
  { text: 'Spanish', code: 'es', nativeName: 'Español' },
  { text: 'Chinese', code: 'zh', nativeName: '中文' },
  { text: 'German', code: 'de', nativeName: 'Deutsch' },
  { text: 'Portuguese', code: 'pt', nativeName: 'Português' },
  { text: 'Italian', code: 'it', nativeName: 'Italiano' },
  { text: 'Dutch', code: 'nl', nativeName: 'Nederlands' },
  { text: 'Polish', code: 'pl', nativeName: 'Polski' },
  { text: 'Arabic', code: 'ar', nativeName: 'العربية', dir: 'rtl' },
];
