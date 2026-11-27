import React, { useContext } from 'react';
import { createRoot, Root } from 'react-dom/client';
import i18next, { i18n as I18n } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { ConfigProvider } from 'antd';
import DirectionProvider from 'components/shell/DirectionProvider';
import {
  directionOf,
  documentLanguageScript,
  inlineEndSide,
  mirrorPlacement,
  RTL_LANGUAGES,
  useDirection,
} from 'i18n/direction';
import { languages } from 'i18n/constants';

// Arabic and Hebrew lay the portal out right to left: `<html lang/dir>` follow the language
// i18next shows, from the first render and on every change, and antd gets the same direction.

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const html = document.documentElement;

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

const Probe = () => {
  const direction = useDirection();
  const antd = useContext(ConfigProvider.ConfigContext);
  return (
    <span data-testid="probe">
      {direction}/{antd.direction ?? 'none'}
    </span>
  );
};

const probe = () =>
  document.querySelector('[data-testid="probe"]')?.textContent;

/** `<html lang>`, `<html dir>`, and what `useDirection()` / antd see: `ar rtl rtl/rtl`. */
const page = () =>
  `${html.getAttribute('lang')} ${html.getAttribute('dir')} ${probe()}`;

describe('directionOf', () => {
  it('reads Arabic and Hebrew right to left, region or not', () => {
    expect([...RTL_LANGUAGES].sort()).toEqual(['ar', 'he']);
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('he')).toBe('rtl');
    expect(directionOf('ar-EG')).toBe('rtl');
    expect(directionOf('he-IL')).toBe('rtl');
  });

  it('reads every other shipped language left to right', () => {
    for (const { code } of languages.filter((l) => l.dir !== 'rtl')) {
      expect(directionOf(code)).toBe('ltr');
    }
    expect(directionOf(undefined)).toBe('ltr');
    expect(directionOf('')).toBe('ltr');
  });

  it('puts the collapsed sidebar’s menus on the line-end side', () => {
    expect(inlineEndSide('ltr')).toBe('right');
    expect(inlineEndSide('rtl')).toBe('left');
  });

  it('mirrors antd dropdown corners right to left only', () => {
    expect(mirrorPlacement('bottomRight', 'ltr')).toBe('bottomRight');
    expect(mirrorPlacement('bottomRight', 'rtl')).toBe('bottomLeft');
    expect(mirrorPlacement('topLeft', 'rtl')).toBe('topRight');
    expect(mirrorPlacement('bottom', 'rtl')).toBe('bottom');
  });
});

describe('DirectionProvider', () => {
  let container: HTMLDivElement;
  let root: Root;
  let i18n: I18n;

  beforeEach(async () => {
    html.removeAttribute('lang');
    html.removeAttribute('dir');
    i18n = i18next.createInstance();
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      // A language counts as shown only when it has strings.
      resources: Object.fromEntries(
        languages.map(({ code }) => [code, { translation: { hello: code } }]),
      ),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <DirectionProvider>
            <Probe />
          </DirectionProvider>
        </I18nextProvider>,
      );
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const switchTo = (language: string) =>
    act(async () => {
      await i18n.changeLanguage(language);
    });

  it('sets lang and dir at the first render', () => {
    expect(page()).toBe('en ltr ltr/ltr');
  });

  it('flips to right to left for Arabic and Hebrew, and back', async () => {
    for (const [language, expected] of [
      ['ar', 'ar rtl rtl/rtl'],
      ['fr', 'fr ltr ltr/ltr'],
      ['he', 'he rtl rtl/rtl'],
      ['en', 'en ltr ltr/ltr'],
    ]) {
      await switchTo(language);
      expect(page()).toBe(expected);
    }
  });

  it('uses the language shown, not the one asked for', async () => {
    // The browser asks for Egyptian Arabic: the strings, and the layout, are Arabic.
    await switchTo('ar-EG');
    expect(page()).toBe('ar rtl rtl/rtl');

    // A language the portal does not ship falls back to English, left to right.
    await switchTo('ja');
    expect(page()).toBe('en ltr ltr/ltr');
  });

  it('stops following i18next once unmounted', async () => {
    await act(async () => root.unmount());
    await i18n.changeLanguage('ar');
    expect(html.getAttribute('dir')).toBe('ltr');
    // afterEach unmounts again: give it a root to unmount.
    root = createRoot(container);
  });
});

describe('documentLanguageScript (before the first paint)', () => {
  beforeEach(() => {
    html.removeAttribute('lang');
    html.removeAttribute('dir');
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it.each([
    ['the language i18next stored', '/', 'he', 'he rtl'],
    ['the stored language, left to right', '/', 'de', 'de ltr'],
    // As the detector does, the `lng` query parameter wins over the stored language.
    ['the lng query parameter first', '/media/images?lng=ar', 'en', 'ar rtl'],
    ['English for a language the portal does not ship', '/', 'ja', 'en ltr'],
  ])('reads %s', (_, url, stored, expected) => {
    window.history.replaceState(null, '', url);
    window.localStorage.setItem('i18nextLng', stored);
    new Function(documentLanguageScript)();
    expect(`${html.getAttribute('lang')} ${html.getAttribute('dir')}`).toBe(
      expected,
    );
  });
});
