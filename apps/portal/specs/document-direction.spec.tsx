import React, { useContext } from 'react';
import { createRoot, hydrateRoot, Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import i18next, { i18n as I18n } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { ConfigProvider } from 'antd';
import DirectionProvider from 'components/shell/DirectionProvider';
import {
  activeLanguage,
  directionOf,
  documentLanguageScript,
  inlineEndSide,
  mirrorPlacement,
  RTL_LANGUAGES,
  useDirection,
} from 'i18n/direction';
import { languageDetection, languages } from 'i18n/constants';

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
    <span data-testid="probe">{`${direction}/${antd.direction ?? 'none'}`}</span>
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
  // Every case runs the script, then the real detector and i18next on the same browser state: the
  // two must agree, or the page would flip sides when the app starts.
  interface Browser {
    url?: string;
    stored?: string;
    cookie?: string;
    navigatorLanguages?: string[];
    blockedStorage?: boolean;
  }

  const setUp = ({
    url = '/',
    stored,
    cookie,
    navigatorLanguages = ['en-US'],
    blockedStorage = false,
  }: Browser) => {
    html.removeAttribute('lang');
    html.removeAttribute('dir');
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie = 'i18next=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.history.replaceState(null, '', url);
    if (stored) window.localStorage.setItem('i18nextLng', stored);
    if (cookie) document.cookie = `i18next=${cookie}; path=/`;
    Object.defineProperty(window.navigator, 'languages', {
      value: navigatorLanguages,
      configurable: true,
    });
    if (blockedStorage) {
      const blocked = () => {
        throw new DOMException('blocked', 'SecurityError');
      };
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    }
  };

  const fromScript = () => {
    new Function(documentLanguageScript)();
    return `${html.getAttribute('lang')} ${html.getAttribute('dir')}`;
  };

  const fromI18next = async () => {
    // A fresh detector: it remembers whether storage works for the life of the module.
    let Detector: typeof LanguageDetector = LanguageDetector;
    jest.isolateModules(() => {
      const fresh = require('i18next-browser-languagedetector');
      Detector = fresh.default ?? fresh;
    });
    const instance = i18next.createInstance();
    await instance.use(Detector).init({
      fallbackLng: 'en',
      detection: { ...languageDetection, caches: [] },
      resources: Object.fromEntries(
        languages.map(({ code }) => [code, { translation: { hello: code } }]),
      ),
    });
    const shown = activeLanguage(instance);
    return `${shown} ${directionOf(shown)}`;
  };

  afterEach(() => jest.restoreAllMocks());

  it.each<[string, Browser, string]>([
    ['the stored language', { stored: 'he' }, 'he rtl'],
    ['a stored left-to-right language', { stored: 'de' }, 'de ltr'],
    [
      'the lng query parameter first',
      { url: '/media/images?lng=ar', stored: 'en' },
      'ar rtl',
    ],
    ['the last lng parameter', { url: '/?lng=en&lng=he' }, 'he rtl'],
    [
      'lng in the hash when there is no query',
      { url: '/#/x?lng=ar' },
      'ar rtl',
    ],
    [
      'the cookie before localStorage',
      { cookie: 'he', stored: 'en' },
      'he rtl',
    ],
    ['a region, falling back to its language', { stored: 'ar-EG' }, 'ar rtl'],
    ['a region in odd case, canonicalised', { stored: 'AR-eg' }, 'ar rtl'],
    [
      'a code in capitals, which i18next does not ship',
      { stored: 'AR' },
      'en ltr',
    ],
    ['a language the portal does not ship', { stored: 'ja' }, 'en ltr'],
    [
      'the browser when nothing is stored',
      { navigatorLanguages: ['he-IL', 'en'] },
      'he rtl',
    ],
    [
      'past a value the detector rejects as XSS',
      { url: '/?lng=javascript:alert(1)', stored: 'ar' },
      'ar rtl',
    ],
    [
      'the browser when storage is blocked',
      { blockedStorage: true, navigatorLanguages: ['ar'] },
      'ar rtl',
    ],
  ])('reads %s, as i18next does', async (_, browser, expected) => {
    setUp(browser);
    expect(fromScript()).toBe(expected);
    setUp(browser);
    expect(await fromI18next()).toBe(expected);
  });
});

describe('hydration', () => {
  it('renders left to right on the server and in the first client render', async () => {
    const instance = i18next.createInstance();
    await instance.use(initReactI18next).init({
      lng: 'ar',
      fallbackLng: 'en',
      resources: { ar: { translation: { hello: 'ar' } } },
    });
    const tree = (
      <I18nextProvider i18n={instance}>
        <DirectionProvider>
          <Probe />
        </DirectionProvider>
      </I18nextProvider>
    );

    // The server has no reader's language: whatever i18next says, it renders `ltr`...
    const serverHtml = renderToString(tree);
    expect(serverHtml).toContain('ltr/ltr');

    // ...and so does the browser's first render: hydration matches, then the layout effect flips.
    html.removeAttribute('dir');
    const container = document.createElement('div');
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    const onRecoverableError = jest.fn();
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(page()).toBe('ar rtl rtl/rtl');

    await act(async () => root?.unmount());
    container.remove();
  });
});
