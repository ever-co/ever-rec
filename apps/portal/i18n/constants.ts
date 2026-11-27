export interface Language {
  /** English name. */
  text: string;
  code: string;
  /** The language's own name, as a person who reads it expects to find it in a list. */
  nativeName: string;
}

export const languages: Language[] = [
  { text: 'English', code: 'en', nativeName: 'English' },
  { text: 'Bulgarian', code: 'bg', nativeName: 'Български' },
  { text: 'Hebrew', code: 'he', nativeName: 'עברית' },
  { text: 'Russian', code: 'ru', nativeName: 'Русский' },
  { text: 'French', code: 'fr', nativeName: 'Français' },
  { text: 'Spanish', code: 'es', nativeName: 'Español' },
  { text: 'Chinese', code: 'zh', nativeName: '中文' },
  { text: 'German', code: 'de', nativeName: 'Deutsch' },
  { text: 'Portuguese', code: 'pt', nativeName: 'Português' },
  { text: 'Italian', code: 'it', nativeName: 'Italiano' },
  { text: 'Dutch', code: 'nl', nativeName: 'Nederlands' },
  { text: 'Polish', code: 'pl', nativeName: 'Polski' },
  { text: 'Arabic', code: 'ar', nativeName: 'العربية' },
];
