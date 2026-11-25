import fs from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

// Only the hooks.toasts section is checked: i18next falls back to English for a missing key, so a
// missing toast shows up in English without any error.
const localesDir = path.resolve(__dirname, '../../../../../../i18n/locales');
const locales = fs
  .readdirSync(localesDir)
  .filter((file) => file.endsWith('.json'));

const readToasts = (file: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')).hooks
    ?.toasts ?? {};

const placeholders = (text: string): string[] =>
  (text.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).sort();

const englishToasts = readToasts('en.json') as Record<string, string>;

describe('extension hooks.toasts locale strings', () => {
  it('finds all 13 locales', () => {
    expect(locales).toHaveLength(13);
  });

  it.each(locales.filter((file) => file !== 'en.json'))(
    '%s has every hooks.toasts string of en.json, with the same placeholders',
    (file) => {
      const toasts = readToasts(file);

      for (const [key, english] of Object.entries(englishToasts)) {
        const translated = toasts[key];
        expect({ key, type: typeof translated }).toEqual({
          key,
          type: 'string',
        });
        expect({ key, empty: (translated as string).trim() === '' }).toEqual({
          key,
          empty: false,
        });
        expect({
          key,
          placeholders: placeholders(translated as string),
        }).toEqual({ key, placeholders: placeholders(english) });
      }
    },
  );
});
