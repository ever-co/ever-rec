import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// Settings > Preferences: the theme as three tiles (Light / Dark / System) and the language,
// which used to be a menu in the header.

const setTheme = jest.fn();
const changeLanguage = jest.fn();
let mockTheme: string | undefined = 'system';
let mockLanguage = 'en';

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: mockLanguage,
      resolvedLanguage: mockLanguage,
      changeLanguage,
    },
  }),
}));
jest.mock('../pages/settings/index', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="settings-layout">{children}</div>
  ),
}));
jest.mock('components/shared/SCHeader/SCHeader', () => ({
  __esModule: true,
  default: () => null,
}));

import Preferences from '../pages/settings/preferences';
import { languages } from '../i18n/constants';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

let container: HTMLDivElement;
let root: Root;

const render = () =>
  act(async () => {
    root.render(<Preferences />);
  });

const click = (target: Element) =>
  act(async () => {
    target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
  });

const key = (target: Element, name: string) =>
  act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: name,
        bubbles: true,
        cancelable: true,
      }),
    );
  });

const tiles = () =>
  Array.from(container.querySelectorAll('[role="radio"]')) as HTMLElement[];
const tile = (label: string) =>
  tiles().find((element) => element.textContent === label) as HTMLElement;

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as any).ResizeObserver = class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  };
  Element.prototype.scrollIntoView = jest.fn();
  (Element.prototype as any).hasPointerCapture = jest.fn(() => false);
  (Element.prototype as any).releasePointerCapture = jest.fn();
});

beforeEach(() => {
  mockTheme = 'system';
  mockLanguage = 'en';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

describe('Preferences: theme', () => {
  it('offers Light, Dark and System, in that order, as one radio group', async () => {
    await render();

    expect(
      container
        .querySelector('[role="radiogroup"]')
        ?.getAttribute('aria-label'),
    ).toBe('page.appearance.theme');
    expect(tiles().map((element) => element.textContent)).toEqual([
      'page.appearance.light',
      'page.appearance.dark',
      'page.appearance.system',
    ]);
  });

  it.each([
    ['system', 'page.appearance.system'],
    ['light', 'page.appearance.light'],
    ['dark', 'page.appearance.dark'],
  ])(
    'marks the stored choice (%s) as the checked one',
    async (theme, label) => {
      mockTheme = theme;
      await render();

      expect(
        tiles()
          .filter((element) => element.getAttribute('aria-checked') === 'true')
          .map((element) => element.textContent),
      ).toEqual([label]);
    },
  );

  it('treats "no stored choice" as System', async () => {
    mockTheme = undefined;
    await render();

    expect(tile('page.appearance.system').getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it.each([
    ['page.appearance.light', 'light'],
    ['page.appearance.dark', 'dark'],
    ['page.appearance.system', 'system'],
  ])('a click on %s stores %s', async (label, theme) => {
    await render();
    await click(tile(label));

    expect(setTheme).toHaveBeenCalledWith(theme);
  });
});

describe('Preferences: language', () => {
  const trigger = () =>
    container.querySelector(
      'button[aria-label^="common.language"]',
    ) as HTMLElement;
  const options = () =>
    Array.from(
      document.body.querySelectorAll('[role="menuitemradio"]'),
    ) as HTMLElement[];

  it('shows the current language under its own name', async () => {
    mockLanguage = 'de';
    await render();

    expect(trigger().textContent).toBe('Deutsch');
  });

  it('lists every language of the app, each under its own name', async () => {
    await render();
    await key(trigger(), 'Enter');

    expect(options()).toHaveLength(languages.length);
    for (const language of languages) {
      expect(
        options().some((option) =>
          option.textContent?.startsWith(language.nativeName),
        ),
      ).toBe(true);
    }
    expect(
      options()
        .filter((option) => option.getAttribute('aria-checked') === 'true')
        .map((option) => option.getAttribute('lang')),
    ).toEqual(['en']);
  });

  it('changes the language of the app', async () => {
    await render();
    await key(trigger(), 'Enter');
    await click(
      options().find(
        (option) => option.getAttribute('lang') === 'fr',
      ) as HTMLElement,
    );

    expect(changeLanguage).toHaveBeenCalledWith('fr');
  });
});

describe('Preferences: the saving preferences of the extension', () => {
  it('still leads to the stand-alone page', async () => {
    await render();

    expect(container.querySelector('a[href="/preferences"]')).not.toBeNull();
  });
});
