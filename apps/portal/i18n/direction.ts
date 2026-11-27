import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import type { i18n as I18n } from 'i18next';
import { languageDetection, languages } from './constants';

/** The reading direction of the page: `<html dir>`, antd's `ConfigProvider` and Radix menus. */
export type Direction = 'ltr' | 'rtl';

/** The languages the portal ships that are written right to left (Arabic, Hebrew). */
export const RTL_LANGUAGES = languages
  .filter((language) => language.dir === 'rtl')
  .map((language) => language.code);

const SUPPORTED_LANGUAGES = languages.map((language) => language.code);

/** `ar-EG` → `ar`. */
const baseOf = (language: string | undefined) =>
  (language ?? '').toLowerCase().split('-')[0];

export function directionOf(language: string | undefined): Direction {
  return RTL_LANGUAGES.includes(baseOf(language)) ? 'rtl' : 'ltr';
}

/**
 * The language on screen. `language` is what the detector asked for (`ar-EG`, or `ja`, which the
 * portal does not ship); `resolvedLanguage` is the one whose strings are shown (`ar`, `en`).
 */
export function activeLanguage(
  i18n: Pick<I18n, 'language' | 'resolvedLanguage'>,
): string {
  return i18n.resolvedLanguage || i18n.language || 'en';
}

/** Sets `<html lang>` and `<html dir>` for a language; returns the direction. */
export function applyDocumentLanguage(
  language: string,
  root: HTMLElement = document.documentElement,
): Direction {
  const direction = directionOf(language);
  root.lang = language;
  root.dir = direction;
  return direction;
}

/**
 * Runs in `<head>` before the first paint, as next-themes' script does for the theme: it sets
 * `<html lang>` and `<html dir>` for the language i18next will show, so an Arabic or Hebrew reader
 * does not see the shell jump from left to right when the app starts. `useDocumentDirection` sets
 * both again from i18next itself once the app runs.
 *
 * It follows i18next-browser-languagedetector 8 step by step with the portal's options
 * (`languageDetection`): the first value found in the query (`lng`, the last one, in the hash
 * when there is no query), the cookie, localStorage, sessionStorage, then the browser, skipping
 * what the detector rejects as XSS; each source on its own, so blocked storage falls through to
 * the browser as it does there. Then i18next's resolution: a code with a region is canonicalised
 * (`AR-eg` → `ar-EG`) and falls back to its language (`ar`); a code the portal does not ship,
 * including `AR` written in capitals, ends on English. `specs/document-direction.spec.tsx` runs
 * the real detector and i18next on the same inputs.
 */
export const documentLanguageScript = String.raw`(function () {
  var rtl = ${JSON.stringify(RTL_LANGUAGES)};
  var shipped = ${JSON.stringify(SUPPORTED_LANGUAGES)};
  var keys = ${JSON.stringify(languageDetection)};
  var xss = [/<\s*script.*?>/i, /<\s*\/\s*script\s*>/i, /<\s*img.*?on\w+\s*=/i, /<\s*\w+\s*on\w+\s*=.*?>/i, /javascript\s*:/i, /vbscript\s*:/i, /expression\s*\(/i, /eval\s*\(/i, /alert\s*\(/i, /document\.cookie/i, /document\.write\s*\(/i, /window\.location/i, /innerHTML/i];
  var sources = {
    querystring: function () {
      var search = location.search, found;
      if (!search && location.hash.indexOf('?') > -1) search = location.hash.substring(location.hash.indexOf('?'));
      search.substring(1).split('&').forEach(function (param) {
        var at = param.indexOf('=');
        if (at > 0 && param.substring(0, at) === keys.lookupQuerystring) found = param.substring(at + 1);
      });
      return found;
    },
    cookie: function () {
      var parts = document.cookie.split(';');
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].replace(/^ +/, '');
        if (part.indexOf(keys.lookupCookie + '=') === 0) return part.substring(keys.lookupCookie.length + 1);
      }
    },
    localStorage: function () { return localStorage.getItem(keys.lookupLocalStorage); },
    sessionStorage: function () { return sessionStorage.getItem(keys.lookupSessionStorage); },
    navigator: function () {
      return (navigator.languages && navigator.languages[0]) || navigator.userLanguage || navigator.language;
    }
  };
  var detected;
  for (var i = 0; i < keys.order.length && !detected; i++) {
    try {
      var value = sources[keys.order[i]] && sources[keys.order[i]]();
      if (value && !xss.some(function (pattern) { return pattern.test(value); })) detected = value;
    } catch (error) {}
  }
  var code = detected || 'en';
  if (code.indexOf('-') > -1) {
    try { code = Intl.getCanonicalLocales(code)[0] || code; } catch (error) {}
  }
  var shown = shipped.indexOf(code) > -1 ? code : shipped.indexOf(code.split('-')[0]) > -1 ? code.split('-')[0] : 'en';
  var root = document.documentElement;
  root.lang = shown;
  root.dir = rtl.indexOf(shown) > -1 ? 'rtl' : 'ltr';
})();`;

// useLayoutEffect warns during server rendering; there is no document to change there anyway.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Keeps `<html lang>` and `<html dir>` on the language i18next shows, from the first render and
 * on every `languageChanged`, and returns the direction for the providers that need it as a prop.
 *
 * The first render says `ltr`, as the server did (it has no reader's language), so hydration
 * matches; the layout effect then switches before the browser paints.
 */
export function useDocumentDirection(i18n: I18n): Direction {
  const [direction, setDirection] = useState<Direction>('ltr');

  useIsomorphicLayoutEffect(() => {
    const apply = () =>
      setDirection(applyDocumentLanguage(activeLanguage(i18n)));

    apply();
    i18n.on('languageChanged', apply);
    return () => i18n.off('languageChanged', apply);
  }, [i18n]);

  return direction;
}

export const DirectionContext = createContext<Direction>('ltr');

/** The page's reading direction, for code that picks a physical side (menus, arrow keys). */
export const useDirection = (): Direction => useContext(DirectionContext);

/**
 * The physical side where a line of text ends: `right` left to right, `left` right to left. A menu
 * or hint of the collapsed sidebar opens on this side, away from the window edge.
 */
export const inlineEndSide = (direction: Direction): 'left' | 'right' =>
  direction === 'rtl' ? 'left' : 'right';

/**
 * antd names a dropdown's corner physically (`bottomRight`) and keeps it right to left. Mirrored,
 * the menu opens over its own card again instead of the neighbour's.
 */
export function mirrorPlacement<P extends string>(
  placement: P,
  direction: Direction,
): P {
  if (direction !== 'rtl') return placement;
  return placement.replace(/(Left|Right)$/, (side) =>
    side === 'Left' ? 'Right' : 'Left',
  ) as P;
}
