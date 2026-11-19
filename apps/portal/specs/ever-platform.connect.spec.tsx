import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import en from '../i18n/locales/en.json';

const mockQuery: Record<string, string> = {};
jest.mock('next/router', () => ({
  useRouter: () => ({ isReady: true, pathname: '/settings/ever-platform', query: mockQuery, push: jest.fn() }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
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
jest.mock('app/services/api/workspace', () => ({ getUserWorkspacesAPI: jest.fn() }));
jest.mock('app/services/ever-connect', () => ({
  EVER_CONNECT_DOCS_URL: 'https://docs.example.test/ever-platform-connection',
  isEverConnectBuildEnabled: () => process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED === 'true',
  getConnectHealth: jest.fn(),
  getConnectStatus: jest.fn(),
  getIntegrations: jest.fn(),
  refreshIntegrations: jest.fn(),
  getPolicy: jest.fn(),
  getConsentUrl: jest.fn(),
  getWorkspaceLink: jest.fn(),
  getWorkspaceIntegrations: jest.fn(),
  getWorkspaceConsentUrl: jest.fn(),
  getAudit: jest.fn(),
  getWorkspaceAudit: jest.fn(),
}));

import * as stats from 'app/services/ever-platform';
import * as connect from 'app/services/ever-connect';
import * as workspaces from 'app/services/api/workspace';
import EverPlatformTabs from 'components/pagesComponents/everPlatform/EverPlatformTabs';
import EverConnectIntegrations from 'components/pagesComponents/everPlatform/connect/EverConnectIntegrations';

const act: (callback: () => void | Promise<void>) => Promise<void> = (React as any).act;
const statsApi = stats as jest.Mocked<typeof stats>;
const api = connect as jest.Mocked<typeof connect>;
const workspaceApi = workspaces as jest.Mocked<typeof workspaces>;
const notFound = () => Promise.reject(Object.assign(new Error('404'), { response: { status: 404 } }));

const INTEGRATION = {
  key: 'instance_url',
  name: 'Installation address',
  description: 'Link to this installation from the organization pages.',
  revokeEffect: 'The stored address is removed.',
  scope: [
    {
      field_path: 'instance.public_url',
      direction: 'to_ever',
      form: 'url',
      frequency: 'once',
      required: true,
      purpose: 'Link to this installation',
      retention: 'While enabled',
    },
  ],
  state: 'available',
  enabled: false,
  consentSource: null,
  revokeSource: null,
  pendingRemoteRevoke: false,
  deniedReason: null,
  connected: true,
};

let container: HTMLDivElement;
let root: Root;

const render = async (element: React.ReactElement) => {
  await act(async () => {
    root.render(element);
  });
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const tabLabels = () => [...container.querySelectorAll('.ant-tabs-tab')].map((tab) => tab.textContent);

const message = (key: string): unknown => key.split('.').reduce((node: any, part) => (node == null ? undefined : node[part]), en);

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
  for (const key of Object.keys(mockQuery)) delete mockQuery[key];
  process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = 'true';
  statsApi.getHealth.mockResolvedValue({ module: 'ever-stats', loaded: true });
  statsApi.getStatus.mockImplementation(notFound);
  api.getConnectHealth.mockResolvedValue({ module: 'ever-connect', loaded: true });
  api.getConnectStatus.mockImplementation(notFound);
  api.getIntegrations.mockResolvedValue([INTEGRATION] as any);
  api.refreshIntegrations.mockResolvedValue([INTEGRATION] as any);
  api.getPolicy.mockResolvedValue([{ key: 'instance_url', allowed: true, deniedByEnv: false, setAt: null }]);
  api.getWorkspaceLink.mockResolvedValue({
    connected: true,
    connectionStatus: 'active',
    managedBy: 'operator',
    link: { state: 'active', handle: 'acme', plan: 'community', tier: 'free', linkedAt: 1, pendingRemoteUnlink: false },
    ladder: { state: 'grace', refreshedAt: Date.UTC(2026, 10, 1), expiresAt: null },
    features: {},
  });
  api.getWorkspaceIntegrations.mockResolvedValue([INTEGRATION] as any);
  api.getAudit.mockResolvedValue({ rows: [] });
  api.getWorkspaceAudit.mockResolvedValue({ rows: [] });
  workspaceApi.getUserWorkspacesAPI.mockResolvedValue({
    status: 'success',
    data: [
      { id: 'ws-1', name: 'Acme', admin: 'uid-1' },
      { id: 'ws-2', name: 'Not mine', admin: 'uid-2' },
    ],
  } as any);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED;
});

describe('Ever Platform Connect tabs', () => {
  it('stay hidden when the portal was built without the switch', async () => {
    delete process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED;
    statsApi.getStatus.mockResolvedValue({} as any);
    await render(<EverPlatformTabs uid="uid-1" />);
    expect(api.getConnectHealth).not.toHaveBeenCalled();
    expect(tabLabels()).toEqual(['page.everPlatform.tabs.statistics']);
  });

  it('stay hidden when the API does not have the connection loaded (health 404)', async () => {
    api.getConnectHealth.mockImplementation(notFound);
    await render(<EverPlatformTabs uid="uid-1" />);
    expect(container.querySelector('[data-testid="ever-platform-unavailable"]')).not.toBeNull();
  });

  it('a workspace admin who is not the operator gets no Connection tab', async () => {
    await render(<EverPlatformTabs uid="uid-1" />);
    expect(tabLabels()).toEqual([
      'page.everPlatform.tabs.link',
      'page.everPlatform.tabs.integrations',
      'page.everPlatform.tabs.audit',
    ]);
    expect(api.getWorkspaceLink).toHaveBeenCalledWith('ws-1');
    expect(container.querySelector('[data-testid="ever-connect-handle"]')?.textContent).toBe('ever.co/acme');
    expect(container.querySelector('[data-testid="ever-connect-banner-grace"]')).not.toBeNull();
  });

  it('the operator gets the Connection tab', async () => {
    api.getConnectStatus.mockResolvedValue({ status: 'not_connected', links: [], entitlement: { state: 'paused' } } as any);
    await render(<EverPlatformTabs uid="uid-1" />);
    expect(tabLabels()).toContain('page.everPlatform.tabs.connection');
  });
});

describe('Integrations & data', () => {
  it('Enable… asks for a consent link of app.ever.co and opens it in a new tab with noopener', async () => {
    api.getConsentUrl.mockResolvedValue({
      state: 'ready',
      url: 'https://app.ever.co/connect/consent?i=01ABC&integration=instance_url&sig=x',
      expiresAt: '2026-11-19T10:00:00Z',
    });
    await render(<EverConnectIntegrations operator />);
    const enable = container.querySelector('[data-testid="ever-connect-enable-instance_url"]') as HTMLButtonElement;
    await act(async () => enable.click());
    await render(<EverConnectIntegrations operator />);
    const link = container.querySelector('[data-testid="ever-connect-consent-instance_url"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(new URL(link.href).origin + new URL(link.href).pathname).toBe('https://app.ever.co/connect/consent');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('a consent link to another host is not shown', async () => {
    api.getConsentUrl.mockResolvedValue({ state: 'ready', url: 'https://evil.example/consent', expiresAt: '' });
    await render(<EverConnectIntegrations operator />);
    await act(async () => (container.querySelector('[data-testid="ever-connect-enable-instance_url"]') as HTMLButtonElement).click());
    await render(<EverConnectIntegrations operator />);
    expect(container.querySelector('[data-testid="ever-connect-consent-instance_url"]')).toBeNull();
  });

  it('back from the consent screen (?ever_connect_return=1) the states are read from the platform once', async () => {
    mockQuery.ever_connect_return = '1';
    await render(<EverConnectIntegrations operator />);
    await render(<EverConnectIntegrations operator />);
    expect(api.refreshIntegrations).toHaveBeenCalledTimes(1);
  });

  it('shows the scope table read-only', async () => {
    await render(<EverConnectIntegrations operator={false} workspaceId="ws-1" />);
    await act(async () => (container.querySelector('[data-testid="ever-connect-scope-instance_url"]') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="ever-connect-scope-table-instance_url"]')?.textContent).toContain(
      'instance.public_url',
    );
    expect(container.querySelector('[data-testid="ever-connect-disable-instance_url"]')).toBeNull();
  });
});

describe('copy', () => {
  it('names Ever Platform and app.ever.co, nothing internal', () => {
    const text = JSON.stringify(message('page.everPlatform.connect'));
    expect(text).toContain('Ever Platform');
    expect(text).not.toMatch(/\b[DPE][0-9]-[0-9]+\b|network/i);
  });
});
