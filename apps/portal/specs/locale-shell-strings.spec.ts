import fs from 'fs';
import path from 'path';
import en from '../i18n/locales/en.json';
import { languages } from '../i18n/constants';

// The shell's strings (sidebar, switcher, user block, top bar, Preferences) exist in every
// locale: a missing key would show the English text, or the raw key, in the app frame.

const LOCALES_DIR = path.join(__dirname, '..', 'i18n', 'locales');

const load = (code: string): any =>
  JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8'));

// Plural forms differ per language (`members_one`, `members_few`, …); every locale has the base.
const isPluralForm = (key: string) =>
  /_(zero|one|two|few|many|other)$/.test(key);

const shellKeys = Object.keys(en.shell).filter((key) => !isPluralForm(key));
const appearanceKeys = Object.keys(en.page.appearance);

describe.each(languages.map(({ code }) => code))('locale %s', (code) => {
  const locale = load(code);

  it('has every shell string', () => {
    for (const key of shellKeys) {
      expect(typeof locale.shell?.[key]).toBe('string');
      expect(locale.shell[key].trim()).not.toBe('');
    }
  });

  it('has every Preferences string', () => {
    for (const key of appearanceKeys) {
      expect(typeof locale.page?.appearance?.[key]).toBe('string');
      expect(locale.page.appearance[key].trim()).not.toBe('');
    }
  });

  it('counts members with the number in the text', () => {
    expect(locale.shell.members).toContain('{{count}}');
    expect(locale.shell.members_other).toContain('{{count}}');
  });

  it('keeps the frame calm: no exclamation marks, no trailing ellipsis', () => {
    const strings = [
      ...Object.values(locale.shell),
      ...Object.values(locale.page.appearance),
      locale.header.helpSoon,
      locale.header.notificationsSoon,
      locale.header.user.availableSoon,
      locale.header.searchFiles,
    ] as string[];

    for (const text of strings) {
      expect(text).not.toMatch(/[!¡！]/);
      expect(text).not.toMatch(/(\.{3}|…)\s*$/);
    }
  });
});

describe('languages', () => {
  it('name each language in its own words', () => {
    for (const language of languages) {
      expect(language.nativeName.trim()).not.toBe('');
    }
    expect(new Set(languages.map(({ code }) => code)).size).toBe(
      languages.length,
    );
  });

  it('has a locale file for each', () => {
    for (const { code } of languages) {
      expect(fs.existsSync(path.join(LOCALES_DIR, `${code}.json`))).toBe(true);
    }
  });
});
