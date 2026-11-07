import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import en from '../i18n/locales/en.json';

const mockRouter: any = {
  isReady: true,
  pathname: '/auth/login',
  query: {},
  push: jest.fn(),
  replace: jest.fn(),
};
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

jest.mock('app/services/api/everId', () => ({
  everIdStartUrl: (returnPath: string) => `http://api.test/api/v1/auth/ever-id/start?return=${encodeURIComponent(returnPath)}`,
  getEverIdConfigAPI: jest.fn(),
  getEverIdSignUpDetailsAPI: jest.fn(),
  confirmEverIdSignUpAPI: jest.fn(),
  exchangeEverIdCodeAPI: jest.fn(),
}));
jest.mock('app/services/auth', () => ({
  everIdAuthorization: jest.fn(),
  getRequiredTerms: jest.fn(),
}));

import * as everIdApi from 'app/services/api/everId';
import * as auth from 'app/services/auth';
import EverIdButton from 'components/pagesComponents/_signScreen/EverIdButton';
import EverIdPage from 'pages/auth/ever-id';
import { resetEverIdConfigCache } from 'hooks/useEverIdConfig';
import {
  EVER_ID_ERROR_CODES,
  everIdErrorMessageKey,
  everIdReturnPath,
  safeReturnPath,
} from 'app/services/everId';

/** The codes the API redirects back with (`ever_id_error`). */
const SERVER_REDIRECT_CODES = [
  'invalid_state',
  'token_invalid',
  'email_unverified',
  'reauth_required',
  'account_exists',
  'signup_disabled',
  'provider_error',
];

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (React as any).act;

const mockEverIdApi = everIdApi as jest.Mocked<typeof everIdApi>;
const mockAuth = auth as jest.Mocked<typeof auth>;

const message = (key: string): unknown =>
  key.split('.').reduce((node: any, part) => (node == null ? undefined : node[part]), en);

let container: HTMLDivElement;
let root: Root;

const render = async (element: React.ReactElement) => {
  await act(async () => {
    root.render(element);
  });
  // Let pending promises (config, API calls) settle.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

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
  resetEverIdConfigCache();
  mockRouter.isReady = true;
  mockRouter.pathname = '/auth/login';
  mockRouter.query = {};
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('Continue with Ever ID button', () => {
  it('is hidden when the server does not offer Ever ID sign-in', async () => {
    mockEverIdApi.getEverIdConfigAPI.mockResolvedValue({ enabled: false, buttonLabel: 'Ever ID' });
    await render(<EverIdButton />);
    expect(container.querySelector('[data-testid="ever-id-button"]')).toBeNull();
  });

  it('is hidden when the server does not know the route', async () => {
    mockEverIdApi.getEverIdConfigAPI.mockRejectedValue(new Error('404'));
    await render(<EverIdButton />);
    expect(container.querySelector('[data-testid="ever-id-button"]')).toBeNull();
  });

  it('is shown when the server offers it, with the agreed label', async () => {
    mockEverIdApi.getEverIdConfigAPI.mockResolvedValue({ enabled: true, issuer: 'https://idp.example.test' });
    await render(<EverIdButton />);
    const button = container.querySelector('[data-testid="ever-id-button"]');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('page.auth.everId.continue');
    expect(message('page.auth.everId.continue')).toBe('Continue with Ever ID');
  });

  it('shows the message for the error a sign-in came back with', async () => {
    mockEverIdApi.getEverIdConfigAPI.mockResolvedValue({ enabled: true });
    mockRouter.query = { ever_id_error: 'account_exists' };
    await render(<EverIdButton />);
    const alert = container.querySelector('[data-testid="ever-id-error"]');
    expect(alert?.textContent).toBe('page.auth.everId.errors.account_exists');
    expect(message('page.auth.everId.errors.account_exists')).toBe(
      'An Ever Rec account with this e-mail already exists. Sign in the usual way, then connect Ever ID in Settings.',
    );
  });
});

describe('Ever ID messages', () => {
  it('has an English message for every error code, including every code the server redirects with', () => {
    for (const code of SERVER_REDIRECT_CODES) {
      expect(EVER_ID_ERROR_CODES).toContain(code);
    }
    for (const code of [...EVER_ID_ERROR_CODES, 'generic']) {
      expect({ code, text: typeof message(`page.auth.everId.errors.${code}`) }).toEqual({ code, text: 'string' });
    }
    expect(everIdErrorMessageKey('something-else')).toBe('page.auth.everId.errors.generic');
  });
});

describe('return paths', () => {
  it('accepts relative portal paths only', () => {
    expect(safeReturnPath('/media/images')).toBe('/media/images');
    expect(safeReturnPath('/auth/login?ext=true&videos=true')).toBe('/auth/login?ext=true&videos=true');
    for (const value of ['https://evil.example.test', '//evil.example.test', '/\\evil', 'media', '/a@b', undefined]) {
      expect(safeReturnPath(value)).toBeNull();
    }
  });

  it('keeps the login page query (for the extension) but not the Ever ID parameters', () => {
    expect(everIdReturnPath('/auth/login', { ext: 'true', ever_id: '1', ever_id_error: 'x' })).toBe('/auth/login?ext=true');
  });
});

describe('/auth/ever-id page', () => {
  it('exchanges the one-time code and goes to the return page', async () => {
    mockAuth.everIdAuthorization.mockResolvedValue({ status: 'success', data: {} } as any);
    mockRouter.query = { code: 'c'.repeat(43), return: '/media/videos' };
    await render(<EverIdPage />);
    expect(mockAuth.everIdAuthorization).toHaveBeenCalledWith('c'.repeat(43));
    expect(mockRouter.push).toHaveBeenCalledWith('/media/videos');
  });

  it('shows the confirmation screen for a new person and creates the account only on Create', async () => {
    mockRouter.query = { confirm: 'p'.repeat(43), return: '/media/images' };
    mockEverIdApi.getEverIdSignUpDetailsAPI.mockResolvedValue({ name: 'New Person', email: 'new@example.test' });
    mockAuth.getRequiredTerms.mockResolvedValue([{ documentId: 'tos', version: '1', sha256: 'a'.repeat(64), locale: 'en' }]);
    await render(<EverIdPage />);

    const screen = container.querySelector('[data-testid="ever-id-confirm"]');
    expect(screen).not.toBeNull();
    expect(screen?.textContent).toContain('page.auth.everId.createAccountTitle');
    expect(message('page.auth.everId.createAccountTitle')).toBe('Create your Ever Rec account');
    const inputs = Array.from(container.querySelectorAll('input[readonly]')) as HTMLInputElement[];
    expect(inputs.map((input) => input.value)).toEqual(['New Person', 'new@example.test']);
    expect(mockEverIdApi.confirmEverIdSignUpAPI).not.toHaveBeenCalled();
  });

  it('shows the mapped message for an error', async () => {
    mockRouter.query = { ever_id_error: 'signup_disabled' };
    await render(<EverIdPage />);
    expect(container.querySelector('[data-testid="ever-id-page-error"]')?.textContent).toContain(
      'page.auth.everId.errors.signup_disabled',
    );
    expect(mockAuth.everIdAuthorization).not.toHaveBeenCalled();
  });
});
