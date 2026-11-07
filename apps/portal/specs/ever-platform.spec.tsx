import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import en from '../i18n/locales/en.json';

jest.mock('next/router', () => ({ useRouter: () => ({ isReady: true, pathname: '/settings/ever-platform', query: {}, push: jest.fn() }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('app/services/helpers/getCookies', () => ({ getCookies: jest.fn(() => ({ idToken: 'id-token', refreshToken: 'refresh' })) }));
jest.mock('app/services/ever-platform', () => ({
  EVER_STATS_DOCS_URL: 'https://docs.example.test/anonymous-usage-statistics',
  getHealth: jest.fn(),
  getStatus: jest.fn(),
  preview: jest.fn(),
  getReports: jest.fn(),
  sendNow: jest.fn(),
  setEnabled: jest.fn(),
  resetIdentity: jest.fn(),
  recount: jest.fn(),
}));

import * as service from 'app/services/ever-platform';
import * as cookies from 'app/services/helpers/getCookies';
import { loadEverPlatformAvailable, resetEverPlatformAvailable } from 'hooks/useEverPlatformAvailable';
import { useMenuItems } from 'misc/menuItems';
import EverPlatformStatistics from 'components/pagesComponents/everPlatform/EverPlatformStatistics';

const act: (callback: () => void | Promise<void>) => Promise<void> = (React as any).act;
const api = service as jest.Mocked<typeof service>;
const mockCookies = cookies as jest.Mocked<typeof cookies>;

const notFound = () => Promise.reject(Object.assign(new Error('404'), { response: { status: 404 } }));

const STATUS = {
  enabled: true,
  reason: 'env',
  toggleEnabled: true,
  destinationUsable: true,
  nextSendAt: Date.UTC(2026, 10, 13, 4, 5),
  lastSentAt: null,
  lastStatus: null,
  instanceId: '7c3f0a1e-2b6d-4e0a-9c11-8a2d3e4f5a6b',
  keyId: 'AbCdEfGhIjK',
  keyState: 'ok',
  country: 'ZZ',
  installSource: 'self-hosted',
  version: '0.1.0',
  channel: 'stable',
} as const;

let container: HTMLDivElement;
let root: Root;

const render = async (element: React.ReactElement) => {
  await act(async () => {
    root.render(element);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const message = (key: string): unknown => key.split('.').reduce((node: any, part) => (node == null ? undefined : node[part]), en);

function MenuProbe() {
  const { settingsMenuItems } = useMenuItems();
  return <ul>{settingsMenuItems.map((item) => <li key={item.type} data-type={item.type} />)}</ul>;
}

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia =
    window.matchMedia ||
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as any);
});

beforeEach(() => {
  jest.clearAllMocks();
  resetEverPlatformAvailable();
  mockCookies.getCookies.mockReturnValue({ idToken: 'id-token', refreshToken: 'refresh' } as any);
  api.getHealth.mockResolvedValue({ module: 'ever-stats', loaded: true });
  api.getStatus.mockResolvedValue({ ...STATUS } as any);
  api.preview.mockResolvedValue({ valid: true, error: null, payload: { schema: 'ever.stats.v1', product: 'rec' } });
  api.getReports.mockResolvedValue({ reports: [] });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('Ever Platform settings entry', () => {
  it('is hidden when the API does not have the statistics loaded (health 404)', async () => {
    api.getHealth.mockImplementation(notFound);
    expect(await loadEverPlatformAvailable()).toBe(false);
    await render(<MenuProbe />);
    expect(container.querySelector('[data-type="ever-platform"]')).toBeNull();
  });

  it('is hidden for a signed-in person who is not the operator (status 404)', async () => {
    api.getStatus.mockImplementation(notFound);
    await render(<MenuProbe />);
    expect(container.querySelector('[data-type="profile"]')).not.toBeNull();
    expect(container.querySelector('[data-type="ever-platform"]')).toBeNull();
  });

  it('asks nothing when nobody is signed in', async () => {
    mockCookies.getCookies.mockReturnValue({ idToken: undefined, refreshToken: undefined } as any);
    expect(await loadEverPlatformAvailable()).toBe(false);
    expect(api.getHealth).not.toHaveBeenCalled();
  });

  it('is shown to the operator', async () => {
    await render(<MenuProbe />);
    expect(container.querySelector('[data-type="ever-platform"]')).not.toBeNull();
    expect(message('navigation.everPlatform')).toBe('Ever Platform');
  });

  it('asks again for the next person who signs in without a reload (the answer is kept per session)', async () => {
    const member = { idToken: 'member-id-token', refreshToken: 'member-session' };
    const operator = { idToken: 'operator-id-token', refreshToken: 'operator-session' };
    api.getStatus.mockImplementationOnce(notFound);
    mockCookies.getCookies.mockReturnValue(member as any);
    expect(await loadEverPlatformAvailable()).toBe(false);
    expect(await loadEverPlatformAvailable()).toBe(false);
    expect(api.getStatus).toHaveBeenCalledTimes(1);

    // The member signs out and the operator signs in, through client-side navigation.
    mockCookies.getCookies.mockReturnValue({ idToken: undefined, refreshToken: undefined } as any);
    expect(await loadEverPlatformAvailable()).toBe(false);
    mockCookies.getCookies.mockReturnValue(operator as any);
    expect(await loadEverPlatformAvailable()).toBe(true);
    expect(api.getStatus).toHaveBeenCalledTimes(2);
  });

  it('a menu that stays on screen follows the account that is signed in', async () => {
    const member = { idToken: 'member-id-token', refreshToken: 'member-session' };
    const operator = { idToken: 'operator-id-token', refreshToken: 'operator-session' };
    api.getStatus.mockImplementationOnce(notFound);
    mockCookies.getCookies.mockReturnValue(member as any);
    await render(<MenuProbe />);
    expect(container.querySelector('[data-type="ever-platform"]')).toBeNull();

    mockCookies.getCookies.mockReturnValue(operator as any);
    await render(<MenuProbe />);
    expect(container.querySelector('[data-type="ever-platform"]')).not.toBeNull();

    api.getStatus.mockImplementationOnce(notFound);
    mockCookies.getCookies.mockReturnValue({ idToken: 'next-id-token', refreshToken: 'next-session' } as any);
    await render(<MenuProbe />);
    expect(container.querySelector('[data-type="ever-platform"]')).toBeNull();
  });
});

describe('Statistics page', () => {
  it('shows the state, what is sent, and a working switch', async () => {
    await render(<EverPlatformStatistics />);
    expect(container.querySelector('[data-testid="ever-platform-statistics"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="ever-platform-preview"]')?.textContent).toContain('ever.stats.v1');
    const toggle = container.querySelector('[data-testid="ever-platform-toggle"]') as HTMLButtonElement;
    expect(toggle.disabled).toBe(false);
    expect((container.querySelector('[data-testid="ever-platform-send"]') as HTMLButtonElement).disabled).toBe(false);
    expect(message('page.everPlatform.statistics.description')).toBe(
      'This installation sends counts and feature flags only, never names, e-mails or files. You can turn it off here or with EVER_STATS_ENABLED=false.',
    );
  });

  it('shows the switch read-only, "Managed by Ever Cloud", on Ever Cloud', async () => {
    api.getStatus.mockResolvedValue({ ...STATUS, reason: 'cloud-managed', installSource: 'cloud' } as any);
    await render(<EverPlatformStatistics />);
    expect((container.querySelector('[data-testid="ever-platform-toggle"]') as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector('[data-testid="ever-platform-cloud-managed"]')?.textContent).toBe(
      'page.everPlatform.statistics.cloudManaged',
    );
    expect(message('page.everPlatform.statistics.cloudManaged')).toBe('Managed by Ever Cloud');
  });

  it('disables Send now while the statistics are switched off', async () => {
    api.getStatus.mockResolvedValue({ ...STATUS, enabled: false, toggleEnabled: false, reason: 'ui' } as any);
    await render(<EverPlatformStatistics />);
    expect((container.querySelector('[data-testid="ever-platform-send"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows nothing of the installation to someone who is not the operator', async () => {
    api.getStatus.mockImplementation(notFound);
    await render(<EverPlatformStatistics />);
    expect(container.querySelector('[data-testid="ever-platform-unavailable"]')).not.toBeNull();
    expect(container.textContent).not.toContain(STATUS.instanceId);
  });

  it('has an English message for every error code the API answers', () => {
    for (const code of [
      'generic',
      'stats_disabled',
      'rate_limited',
      'cloud_managed',
      'no_destination',
      'busy',
      'refused_until_upgrade',
    ]) {
      expect(typeof message(`page.everPlatform.errors.${code}`)).toBe('string');
    }
  });
});
