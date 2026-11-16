import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// Connecting Google Drive. The connection starts with a one-time nonce from the API (which also
// sets a cookie on this browser), Google sends it back in `state`, and the /oauth page returns it
// with the code. The page only follows a path on this site afterwards, and a `state` that is not
// JSON must not break it.

const mockRouter = {
  isReady: true,
  query: {} as Record<string, string>,
  push: jest.fn(),
};
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-redux', () => ({ useDispatch: () => jest.fn() }));
jest.mock('store/auth/actions/AuthAC', () => ({
  __esModule: true,
  default: { setDriveUser: (payload: unknown) => ({ type: 'x', payload }) },
}));
jest.mock('app/services/api/auth', () => ({
  completeOAuth: jest.fn(),
  getDriveOAuthState: jest.fn(),
}));
jest.mock('app/services/api/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('app/services/google/user', () => ({
  setDriveUser: jest.fn(async () => undefined),
}));
jest.mock('misc/_helper', () => ({ sendExternalMessage: jest.fn() }));

const mockRequestCode = jest.fn();
const mockGoogleLoginOptions: any[] = [];
jest.mock('@react-oauth/google', () => ({
  useGoogleLogin: (options: any) => {
    mockGoogleLoginOptions.push(options);
    return mockRequestCode;
  },
}));

import api from 'app/services/api/api';
import { completeOAuth, getDriveOAuthState } from 'app/services/api/auth';
import { setDriveUser } from 'app/services/google/user';
import useGoogleDriveAuth from 'hooks/useGoogleDriveAuth';
import Oauth from '../pages/oauth';

const mockComplete = completeOAuth as jest.Mock;
const mockGetState = getDriveOAuthState as jest.Mock;
const mockApiGet = api.get as jest.Mock;

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

let container: HTMLDivElement;
let root: Root;

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const render = async (element: React.ReactElement) => {
  await act(async () => {
    root.render(element);
  });
  await settle();
};

const nonce = 'N0nce_N0nce_N0nce_N0nce_N0nce_12';

const openCallback = async (state?: string) => {
  mockRouter.query =
    state === undefined ? { code: 'the-code' } : { code: 'the-code', state };
  await render(<Oauth />);
};

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGoogleLoginOptions.length = 0;
  mockRouter.isReady = true;
  mockRouter.query = {};
  mockComplete.mockResolvedValue({
    status: 'success',
    data: { email: 'a@example.com' },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('the /oauth page', () => {
  it('sends the nonce from the state with the code', async () => {
    await openCallback(JSON.stringify({ origin: '/settings/drive', nonce }));

    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(mockComplete).toHaveBeenCalledWith('the-code', nonce);
    expect(setDriveUser).toHaveBeenCalledWith({ email: 'a@example.com' });
  });

  it('goes back to a path on this site', async () => {
    await openCallback(JSON.stringify({ origin: '/settings/drive', nonce }));

    expect(mockRouter.push).toHaveBeenCalledWith('/settings/drive');
  });

  it.each([
    'https://evil.example',
    '//evil',
    '/\\evil.example',
    // URL parsing drops tabs and line breaks, so these are `//evil.example` to the browser.
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r\\evil.example',
    'javascript:alert(1)',
  ])('does not follow %j', async (origin) => {
    await openCallback(JSON.stringify({ origin, nonce }));

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockComplete).toHaveBeenCalledWith('the-code', nonce);
  });

  it('does not throw on a state that is not JSON, and lets the API refuse the code', async () => {
    await openCallback('{not json');

    expect(mockComplete).toHaveBeenCalledWith('the-code', undefined);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('goes nowhere when the API refuses the code', async () => {
    mockComplete.mockRejectedValue(new Error('403'));

    await openCallback(JSON.stringify({ origin: '/settings/drive', nonce }));

    expect(setDriveUser).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

describe('the Drive API calls', () => {
  const actual = jest.requireActual('app/services/api/auth');

  it('sends the code and the nonce URL-encoded, with the cookie', async () => {
    mockApiGet.mockResolvedValue({ status: 'success' });

    await actual.completeOAuth('4/a&b=c', 'n+1/2');

    expect(mockApiGet).toHaveBeenCalledWith(
      '/api/v1/drive/complete-oauth?code=4%2Fa%26b%3Dc&state=n%2B1%2F2',
      { withCredentials: true },
    );
  });

  it('asks for a nonce with credentials, so the API can set its cookie', async () => {
    mockApiGet.mockResolvedValue(nonce);

    await expect(actual.getDriveOAuthState()).resolves.toBe(nonce);
    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/drive/oauth-state', {
      withCredentials: true,
    });
  });
});

describe('starting a Drive connection', () => {
  let driveLogin: () => Promise<void>;
  const Probe = ({ pathname }: { pathname?: string }) => {
    driveLogin = useGoogleDriveAuth({ pathname }).driveLogin;
    return null;
  };

  it('fetches a nonce first and sends it in the state with the origin', async () => {
    mockGetState.mockResolvedValue(nonce);
    await render(<Probe pathname="/settings/drive" />);
    expect(mockRequestCode).not.toHaveBeenCalled();

    await act(async () => {
      await driveLogin();
    });
    await settle();

    expect(mockGetState).toHaveBeenCalledTimes(1);
    expect(mockRequestCode).toHaveBeenCalledTimes(1);
    const options = mockGoogleLoginOptions[mockGoogleLoginOptions.length - 1];
    expect(JSON.parse(options.state)).toEqual({
      origin: '/settings/drive',
      nonce,
    });
    expect(options.ux_mode).toBe('redirect');
  });

  it('sends a nonce when there is no origin to go back to', async () => {
    mockGetState.mockResolvedValue(nonce);
    await render(<Probe />);

    await act(async () => {
      await driveLogin();
    });
    await settle();

    expect(mockRequestCode).toHaveBeenCalledTimes(1);
    const options = mockGoogleLoginOptions[mockGoogleLoginOptions.length - 1];
    expect(JSON.parse(options.state)).toEqual({ nonce });
  });

  it('does not go to Google without a nonce', async () => {
    mockGetState.mockRejectedValue(new Error('offline'));
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await render(<Probe pathname="/settings/drive" />);

    await act(async () => {
      await driveLogin();
    });
    await settle();

    expect(mockRequestCode).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
