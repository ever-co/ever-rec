import React from 'react';
import { createRoot, Root } from 'react-dom/client';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: any) => (typeof options === 'object' && options?.name ? `${key}:${options.name}:${options.handle}` : key) }),
}));
jest.mock('app/services/helpers/getCookies', () => ({ getCookies: jest.fn(() => ({ idToken: 'id-token', refreshToken: 'refresh' })) }));
jest.mock('app/services/api/everId', () => ({
  everIdStartUrl: (path: string, binding: string) => `https://api.example.test/api/v1/auth/ever-id/start?return=${path}&binding=${binding}`,
}));
jest.mock('app/services/everIdBinding', () => ({ createEverIdBinding: () => 'binding-hash' }));
jest.mock('app/services/ever-connect', () => ({
  postProvisionIntent: jest.fn(),
  confirmProvision: jest.fn(),
  rejectProvision: jest.fn(),
}));

import * as connect from 'app/services/ever-connect';
import * as cookies from 'app/services/helpers/getCookies';
import ProvisionConfirm, { PROVISION_INTENT_KEY } from 'components/pagesComponents/everConnect/ProvisionConfirm';

const act: (callback: () => void | Promise<void>) => Promise<void> = (React as any).act;
const api = connect as jest.Mocked<typeof connect>;
const mockCookies = cookies as jest.Mocked<typeof cookies>;

const INTENT = {
  provisionTxn: 'v1:sealed',
  jti: '01JABCDEFGHJKMNPQRSTVWXYZ0',
  handle: 'acme',
  displayName: 'Acme Inc',
  expiresAt: Date.now() + 600_000,
};

let container: HTMLDivElement;
let root: Root;
let assign: jest.Mock;

const render = async () => {
  await act(async () => {
    root.render(<ProvisionConfirm />);
  });
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const click = async (testId: string) => {
  await act(async () => (container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement).click());
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia =
    window.matchMedia ||
    ((query: string) => ({ matches: false, media: query, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined }) as any);
});

beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  window.history.replaceState(null, '', '/ever-connect/provision#intent=intent.jws.value');
  assign = jest.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, hash: '#intent=intent.jws.value', pathname: '/ever-connect/provision', assign },
  });
  mockCookies.getCookies.mockReturnValue({ idToken: 'id-token', refreshToken: 'refresh' } as any);
  api.postProvisionIntent.mockResolvedValue(INTENT);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('Ever Rec cloud provisioning landing page', () => {
  it('reads the intent from the fragment only and asks the question', async () => {
    await render();
    expect(api.postProvisionIntent).toHaveBeenCalledWith('intent.jws.value');
    expect(container.querySelector('[data-testid="ever-connect-provision-question"]')?.textContent).toBe(
      'page.everConnect.provision.question:Acme Inc:acme',
    );
    expect(window.sessionStorage.getItem(PROVISION_INTENT_KEY)).toBe('intent.jws.value');
  });

  it('never reads an intent from the query string', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, hash: '', search: '?intent=leaked', pathname: '/ever-connect/provision', assign },
    });
    await render();
    expect(api.postProvisionIntent).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="ever-connect-provision-missing"]')).not.toBeNull();
  });

  it('Create confirms and goes back to app.ever.co', async () => {
    api.confirmProvision.mockResolvedValue({ status: 'created', workspaceId: 'ws-9', returnTo: 'https://app.ever.co/start/jobs/1' });
    await render();
    await click('ever-connect-provision-create');
    expect(api.confirmProvision).toHaveBeenCalledWith('v1:sealed');
    expect(assign).toHaveBeenCalledWith('https://app.ever.co/start/jobs/1');
    expect(window.sessionStorage.getItem(PROVISION_INTENT_KEY)).toBeNull();
  });

  it('Decline posts the refusal', async () => {
    api.rejectProvision.mockResolvedValue({ status: 'refused', returnTo: null });
    await render();
    await click('ever-connect-provision-decline');
    expect(api.rejectProvision).toHaveBeenCalledWith(INTENT.jti, 'v1:sealed');
    expect(container.querySelector('[data-testid="ever-connect-provision-declined"]')).not.toBeNull();
  });

  it('a different Ever ID shows the sign-in message', async () => {
    api.confirmProvision.mockRejectedValue({ response: { status: 403, data: { code: 'intent_subject_mismatch' } } });
    await render();
    await click('ever-connect-provision-create');
    expect(container.querySelector('[data-testid="ever-connect-provision-message"]')?.textContent).toBe(
      'page.everConnect.provision.mismatch',
    );
  });

  it('signed out, it offers Ever ID sign-in back to this page (the intent waits in this tab)', async () => {
    mockCookies.getCookies.mockReturnValue({ idToken: undefined, refreshToken: undefined } as any);
    await render();
    expect(container.querySelector('[data-testid="ever-connect-provision-create"]')).toBeNull();
    await click('ever-connect-provision-ever-id');
    expect(assign).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/auth/ever-id/start?return=/ever-connect/provision&binding=binding-hash',
    );
    expect(assign.mock.calls[0][0]).not.toContain('intent');
  });
});
