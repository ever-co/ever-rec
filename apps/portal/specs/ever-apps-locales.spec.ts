/**
 * Every portal locale carries the Ever app switcher's strings (title, mark label, "Add", its label and the eight
 * lines), and the "+ Add" link's accessible name contains the word it shows (WCAG 2.5.3, Label in Name), so a
 * voice-control user can say the visible word in any language.
 */
import ar from 'i18n/locales/ar.json';
import bg from 'i18n/locales/bg.json';
import de from 'i18n/locales/de.json';
import en from 'i18n/locales/en.json';
import es from 'i18n/locales/es.json';
import fr from 'i18n/locales/fr.json';
import he from 'i18n/locales/he.json';
import italian from 'i18n/locales/it.json';
import nl from 'i18n/locales/nl.json';
import pl from 'i18n/locales/pl.json';
import pt from 'i18n/locales/pt.json';
import ru from 'i18n/locales/ru.json';
import zh from 'i18n/locales/zh.json';
import { EVER_APP_ENTRIES } from 'misc/everApps';

// `it` (Italian) is renamed on import so it does not hide Jest's `it`.
const LOCALES = { ar, bg, de, en, es, fr, he, it: italian, nl, pl, pt, ru, zh };

describe.each(Object.entries(LOCALES))('everApps strings in %s', (_locale, messages) => {
  const strings = messages.everApps;

  it('has the title, the labels and "Add"', () => {
    for (const key of ['title', 'switchLabel', 'add', 'addLabel'] as const) {
      expect(typeof strings[key]).toBe('string');
      expect(strings[key].trim()).not.toBe('');
    }
  });

  it('has a line for each of the eight apps', () => {
    const lines = strings.lines as Record<string, string>;
    expect(Object.keys(lines).sort()).toEqual(EVER_APP_ENTRIES.map((app) => app.id).sort());
    for (const line of Object.values(lines)) {
      expect(line.trim()).not.toBe('');
    }
  });

  it('names the "+ Add" link with words that contain the visible one', () => {
    expect(strings.addLabel.toLocaleLowerCase()).toContain(strings.add.toLocaleLowerCase());
    expect(strings.addLabel).toContain('Ever Platform');
  });
});
