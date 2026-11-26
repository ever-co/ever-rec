import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// A signed-in user without a terms record (a sign-up whose write failed, as on 2026-11-26 when production had no
// Firestore) must get a dialog that cannot be dismissed. "I agree" posts exactly the documents the status named, at
// the versions and digests it named; when the server answers satisfied, the dialog goes away.

const mockUser: { current: any } = { current: { id: 'uid-1' } };
jest.mock('react-redux', () => ({
  useSelector: (pick: any) => pick({ auth: { user: mockUser.current } }),
  useDispatch: () => jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('antd', () => ({
  Modal: ({ open, footer, children, closable, maskClosable, keyboard }: any) =>
    open ? (
      <div
        data-testid="modal"
        data-dismissible={String(!!(closable || maskClosable || keyboard))}
      >
        {children}
        {footer}
      </div>
    ) : null,
  Button: ({ onClick, children, ...rest }: any) => (
    <button data-testid={rest['data-testid']} onClick={onClick}>
      {children}
    </button>
  ),
}));
jest.mock('app/services/auth', () => ({ signOut: jest.fn() }));
jest.mock('store/auth/actions/AuthAC', () => ({
  __esModule: true,
  default: { setUser: jest.fn() },
}));
jest.mock('app/services/api/auth', () => ({
  getTermsStatusAPI: jest.fn(),
  acceptTermsAPI: jest.fn(),
}));

import { acceptTermsAPI, getTermsStatusAPI } from 'app/services/api/auth';
import TermsGate from '../components/shared/TermsGate';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const getStatus = getTermsStatusAPI as jest.Mock;
const accept = acceptTermsAPI as jest.Mock;

const pendingTos = {
  documentId: 'tos:ever-rec',
  reason: 'never-accepted',
  blocking: true,
  acceptedVersion: null,
  acceptedAt: null,
  requiredVersion: '1.0.2',
  requiredSha256: 'a'.repeat(64),
  title: 'Terms of Service',
  url: 'https://rec.so/tos',
};
const satisfied = {
  satisfied: true,
  blocking: [],
  notices: [],
  current: ['tos:ever-rec'],
};

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.current = { id: 'uid-1' };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('TermsGate', () => {
  it('shows a dialog that cannot be dismissed when a document is outstanding', async () => {
    getStatus.mockResolvedValue({
      satisfied: false,
      blocking: [pendingTos],
      notices: [],
      current: [],
    });

    await act(async () => root.render(<TermsGate />));

    expect(getStatus).toHaveBeenCalledWith('en');
    const modal = container.querySelector('[data-testid="modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.getAttribute('data-dismissible')).toBe('false');
    expect(
      container.querySelector('a[href="https://rec.so/tos"]')?.textContent,
    ).toBe('Terms of Service');
  });

  it('posts the named documents and closes once the server answers satisfied', async () => {
    getStatus.mockResolvedValue({
      satisfied: false,
      blocking: [pendingTos],
      notices: [],
      current: [],
    });
    accept.mockResolvedValue(satisfied);
    await act(async () => root.render(<TermsGate />));

    await act(async () => {
      (
        container.querySelector(
          '[data-testid="terms-accept"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(accept).toHaveBeenCalledWith([
      {
        documentId: 'tos:ever-rec',
        version: '1.0.2',
        sha256: 'a'.repeat(64),
        locale: 'en',
      },
    ]);
    expect(container.querySelector('[data-testid="modal"]')).toBeNull();
  });

  it('keeps the dialog open and says so when saving fails', async () => {
    getStatus.mockResolvedValue({
      satisfied: false,
      blocking: [pendingTos],
      notices: [],
      current: [],
    });
    accept.mockRejectedValue(new Error('500'));
    await act(async () => root.render(<TermsGate />));

    await act(async () => {
      (
        container.querySelector(
          '[data-testid="terms-accept"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(container.querySelector('[data-testid="modal"]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'page.termsReaccept.failed',
    );
  });

  it('reloads the required documents after a refused save, so a retry sends the current texts', async () => {
    getStatus.mockResolvedValueOnce({
      satisfied: false,
      blocking: [pendingTos],
      notices: [],
      current: [],
    });
    const newer = {
      ...pendingTos,
      requiredVersion: '1.2.0',
      requiredSha256: 'b'.repeat(64),
    };
    getStatus.mockResolvedValueOnce({
      satisfied: false,
      blocking: [newer],
      notices: [],
      current: [],
    });
    accept
      .mockRejectedValueOnce(new Error('400'))
      .mockResolvedValueOnce(satisfied);
    await act(async () => root.render(<TermsGate />));

    await act(async () => {
      (
        container.querySelector(
          '[data-testid="terms-accept"]',
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      (
        container.querySelector(
          '[data-testid="terms-accept"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(accept).toHaveBeenLastCalledWith([
      {
        documentId: 'tos:ever-rec',
        version: '1.2.0',
        sha256: 'b'.repeat(64),
        locale: 'en',
      },
    ]);
    expect(container.querySelector('[data-testid="modal"]')).toBeNull();
  });

  it('links a document with a relative url to its text on rec.so', async () => {
    getStatus.mockResolvedValue({
      satisfied: false,
      blocking: [{ ...pendingTos, url: '/legal/tos' }],
      notices: [],
      current: [],
    });

    await act(async () => root.render(<TermsGate />));

    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      'https://rec.so/tos',
    );
  });

  it('shows nothing when the user is up to date, signed out, or the status cannot be read', async () => {
    getStatus.mockResolvedValue(satisfied);
    await act(async () => root.render(<TermsGate />));
    expect(container.innerHTML).toBe('');

    getStatus.mockRejectedValue(new Error('network'));
    mockUser.current = { id: 'uid-2' };
    await act(async () => root.render(<TermsGate />));
    expect(container.innerHTML).toBe('');

    getStatus.mockClear();
    mockUser.current = null;
    await act(async () => root.render(<TermsGate />));
    expect(getStatus).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });
});
