import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import type { i18n as I18n } from 'i18next';
import { languages } from './constants';

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
 * `<html lang>` and `<html dir>` from what i18next's language detector will pick (the `lng` query
 * parameter, then the language it stored, then the browser's), so an Arabic or Hebrew reader does
 * not see the shell jump from left to right when the app starts. `useDocumentDirection` sets both
 * again from i18next itself once the app runs.
 */
export const documentLanguageScript = `(function(){try{var r=${JSON.stringify(
  RTL_LANGUAGES,
)},s=${JSON.stringify(
  SUPPORTED_LANGUAGES,
)},q=/[?&]lng=([^&#]*)/.exec(location.search),l=(q&&decodeURIComponent(q[1]))||localStorage.getItem('i18nextLng')||(navigator.languages&&navigator.languages[0])||navigator.language||'en',b=String(l).toLowerCase().split('-')[0],e=document.documentElement;e.lang=s.indexOf(b)<0?'en':b;e.dir=r.indexOf(b)<0?'ltr':'rtl'}catch(x){}})();`;

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
