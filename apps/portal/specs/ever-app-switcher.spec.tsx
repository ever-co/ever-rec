/**
 * The Ever app switcher in the sidebar (homelab `docs/handoffs/HANDOVER-2026-11-26-ever-app-switcher-in-apps.md`
 * §2): the mark opens "Apps" with eight rows and "+ Add", every row opens in the same tab (no `target`), no host is
 * shown, the current app is checked and not a link, Escape returns to the mark, and nothing renders without config.
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (React as any).act;

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import EverAppSwitcher from 'components/elements/everApps/EverAppSwitcher';
import { buildEverAppSwitcher } from 'misc/everApps';

const EVER_RUN =
  'platform=https://app.ever.co,works=https://app.ever.works,teams=https://app.ever.team,gauzy=https://app.gauzy.co,' +
  'demand=https://app.everdemand.co,rec=https://app.rec.so,traduora=https://app.traduora.co,tech=https://ever.tech';

const HOSTS = ['ever.co', 'ever.works', 'ever.team', 'gauzy.co', 'everdemand.co', 'rec.so', 'traduora.co', 'ever.tech'];

describe('EverAppSwitcher', () => {
  let container: HTMLDivElement;
  let root: Root;

  const trigger = () => container.querySelector('button') as HTMLButtonElement;
  const panel = () => container.querySelector('nav');
  const openPanel = () => {
    const nav = panel();
    if (!nav) {
      throw new Error('the switcher panel is not open');
    }
    return nav;
  };
  const activeElement = () => document.activeElement as HTMLElement;
  const key = async (target: Element, keyName: string) => {
    await act(async () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true }));
    });
  };

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderSwitcher = async (links: string | undefined) => {
    await act(async () => root.render(<EverAppSwitcher model={buildEverAppSwitcher(links)} />));
  };

  const open = async () => {
    await act(async () => trigger().click());
  };

  it('renders nothing, not even the mark, without a link config', async () => {
    await renderSwitcher(undefined);

    expect(container.innerHTML).toBe('');
  });

  it('is a labelled button that starts closed', async () => {
    await renderSwitcher(EVER_RUN);

    expect(trigger().getAttribute('aria-label')).toBe('everApps.switchLabel');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().querySelector('svg')).not.toBeNull();
    expect(panel()).toBeNull();
  });

  it('opens "Apps" with eight rows, Rec current, then "+ Add"', async () => {
    await renderSwitcher(EVER_RUN);
    await open();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.getAttribute('aria-label')).toBe('everApps.title');
    const rows = openPanel().querySelectorAll('li');
    expect(rows).toHaveLength(8);
    expect(Array.from(rows).map((row) => row.textContent)).toEqual([
      'Ever PlatformeverApps.lines.platform',
      'Ever WorkseverApps.lines.works',
      'Ever TeamseverApps.lines.teams',
      'Ever GauzyeverApps.lines.gauzy',
      'Ever ReceverApps.lines.rec',
      'Ever TraduoraeverApps.lines.traduora',
      'Ever DemandeverApps.lines.demand',
      'Ever TecheverApps.lines.tech',
    ]);

    const current = openPanel().querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain('Ever Rec');
    expect(current?.closest('a')).toBeNull();
    expect(current?.querySelector('[aria-label="check"], .anticon-check')).not.toBeNull();

    const links = Array.from(openPanel().querySelectorAll('a'));
    expect(links).toHaveLength(8);
    const add = links[links.length - 1];
    expect(add.getAttribute('href')).toBe('https://app.ever.co/apps?add=app');
    expect(add.getAttribute('aria-label')).toBe('everApps.addLabel');
    expect(add.getAttribute('title')).toBe('everApps.addLabel');
    expect(add.textContent).toBe('everApps.add');
  });

  it('opens every other app in the same tab: plain links, no target, no rel', async () => {
    await renderSwitcher(EVER_RUN);
    await open();

    const links = Array.from(openPanel().querySelectorAll('a'));
    for (const link of links) {
      expect(link.hasAttribute('target')).toBe(false);
      expect(link.hasAttribute('rel')).toBe(false);
    }
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://app.ever.co/',
      'https://app.ever.works/',
      'https://app.ever.team/',
      'https://app.gauzy.co/',
      'https://app.traduora.co/',
      'https://app.everdemand.co/',
      'https://ever.tech/',
      'https://app.ever.co/apps?add=app',
    ]);
  });

  it('shows no host or URL text, only logos, names and lines', async () => {
    await renderSwitcher(EVER_RUN);
    await open();

    const text = openPanel().textContent ?? '';
    for (const host of HOSTS) {
      expect(text).not.toContain(host);
    }
    expect(text).not.toMatch(/https?:/);
    for (const img of Array.from(openPanel().querySelectorAll('img'))) {
      expect(img.getAttribute('alt')).toBe('');
    }
  });

  it('leaves out "+ Add" when Ever Platform is not linked', async () => {
    await renderSwitcher('works=https://app.ever.works');
    await open();

    expect(openPanel().querySelectorAll('li')).toHaveLength(2);
    expect(openPanel().querySelector('a[aria-label="everApps.addLabel"]')).toBeNull();
  });

  it('focuses the first app on open, moves with the arrows past the current app, and Escape returns to the mark', async () => {
    await renderSwitcher(EVER_RUN);
    await open();

    expect(document.activeElement?.textContent).toContain('Ever Platform');
    for (let i = 0; i < 4; i += 1) {
      await key(activeElement(), 'ArrowDown');
    }
    expect(document.activeElement?.textContent).toContain('Ever Traduora');
    await key(activeElement(), 'End');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('everApps.addLabel');
    await key(activeElement(), 'ArrowDown');
    expect(document.activeElement?.textContent).toContain('Ever Platform');
    await key(activeElement(), 'ArrowUp');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('everApps.addLabel');

    await key(activeElement(), 'Escape');

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens with ArrowDown on the mark and closes on a second click', async () => {
    await renderSwitcher(EVER_RUN);
    trigger().focus();

    await key(trigger(), 'ArrowDown');
    expect(panel()).not.toBeNull();

    await open();
    expect(panel()).toBeNull();
  });

  it('closes on a pointer press outside, and on a pick', async () => {
    await renderSwitcher(EVER_RUN);
    await open();

    await act(async () => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(panel()).toBeNull();

    await open();
    const works = openPanel().querySelector('a[href="https://app.ever.works/"]') as HTMLAnchorElement;
    works.addEventListener('click', (event) => event.preventDefault());
    await act(async () => works.click());
    expect(panel()).toBeNull();
  });
});
