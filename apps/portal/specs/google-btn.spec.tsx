/**
 * The Google sign-in button needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. A build without one rendered Google's button with
 * `client_id=` empty (app.rec.so, 2026-11-26), which can only fail when clicked, so the button is left out.
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (React as any).act;

jest.mock('next/router', () => ({ useRouter: () => ({ prefetch: jest.fn() }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button data-testid="google-login">Google</button>,
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import GoogleBtn, { isGoogleSignInConfigured } from 'components/pagesComponents/_signScreen/GoogleBtn';

describe('GoogleBtn', () => {
  const original = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  let container: HTMLDivElement;
  let root: Root;

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
    if (original === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    else process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = original;
  });

  it('renders nothing when the build has no Google client ID', async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    await act(async () => root.render(<GoogleBtn onSuccess={jest.fn()} />));

    expect(isGoogleSignInConfigured()).toBe(false);
    expect(container.querySelector('[data-testid="google-login"]')).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('treats an empty client ID as not configured', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = '';

    await act(async () => root.render(<GoogleBtn onSuccess={jest.fn()} />));

    expect(container.querySelector('[data-testid="google-login"]')).toBeNull();
  });

  it('renders the Google button when a client ID is set', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';

    await act(async () => root.render(<GoogleBtn onSuccess={jest.fn()} />));

    expect(isGoogleSignInConfigured()).toBe(true);
    expect(container.querySelector('[data-testid="google-login"]')).not.toBeNull();
  });
});
