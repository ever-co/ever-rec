import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../i18n/locales/en.json';
import { languages } from '../i18n/constants';

// The invite page is the first screen an invitee sees. Its second heading names the workspace
// the invitee is asked to join, on Rec, in one translated sentence: no "No" where "on" is meant,
// no missing space before the name and no hard-coded English fragment.

const mockRouter = {
  isReady: true,
  query: { workspaceInviteId: 'invite-1' } as any,
  push: jest.fn(),
};
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('hooks/useAuthenticateUser', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('app/services/workspace', () => ({
  getWorkspaceInviteData: jest.fn(),
  joinWorkspaceWithInvite: jest.fn(),
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  successMessage: jest.fn(),
}));
jest.mock('misc/_helper', () => ({ sendExternalMessage: jest.fn() }));
jest.mock(
  'components/pagesComponents/_singleImageScreen/topMenuBar/TopMenuBar',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock('components/containers/appSpinner/AppSpinner', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('components/elements/AppSvg', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('components/controls/AppButton', () => ({
  __esModule: true,
  default: ({ onClick, children }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { getWorkspaceInviteData } from 'app/services/workspace';
import WorkspaceInvite from '../pages/workspace/invite/[workspaceInviteId]';

const mockInviteData = getWorkspaceInviteData as jest.Mock;

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

let container: HTMLDivElement;
let root: Root;

const render = async () => {
  await act(async () => {
    root.render(<WorkspaceInvite />);
  });
  await act(async () => {
    await Promise.resolve();
  });
};

beforeAll(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  // The English resources, with the interpolation options of i18n/config.ts.
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockInviteData.mockResolvedValue({
    workspaceInviter: 'Ann',
    workspaceName: 'Acme',
    workspaceMembers: [],
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('workspace invite page heading', () => {
  it('names the workspace on Rec in one English sentence', async () => {
    await render();

    expect(mockInviteData).toHaveBeenCalledWith('invite-1');
    const headings = container.querySelectorAll('h1');
    expect(headings).toHaveLength(2);
    expect(headings[0].textContent).toBe('Ann has invited you to join');

    const heading = headings[1];
    expect(heading.textContent).toBe('workspace Acme on Rec.');
    // develop rendered "workspaceAcme NoRec." (common.no, then a hard-coded "Rec.").
    expect(heading.textContent).not.toMatch(/No\s*Rec/);
    expect(
      heading.querySelector('span.tw-text-primary-purple')?.textContent,
    ).toBe('Acme');
  });

  it('shows a workspace name with markup characters as typed', async () => {
    const name = 'R&D <team> <1>x</1> <strong>y</strong>';
    mockInviteData.mockResolvedValue({
      workspaceInviter: 'Ann',
      workspaceName: name,
      workspaceMembers: [],
    });
    await render();

    const heading = container.querySelectorAll('h1')[1];
    expect(heading.textContent).toBe(`workspace ${name} on Rec.`);
    expect(
      heading.querySelector('span.tw-text-primary-purple')?.textContent,
    ).toBe(name);
    expect(heading.querySelector('strong')).toBeNull();
    expect(heading.querySelectorAll('span')).toHaveLength(1);
  });
});

describe('workspace.joinWorkspaceOnRec translations', () => {
  it.each(languages.map(({ code }) => code))(
    '%s defines the heading with the workspace name in the <1> tag',
    (code) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires -- one locale file per case
      const locale = require(`../i18n/locales/${code}.json`);
      const heading = locale.workspace?.joinWorkspaceOnRec;

      expect(typeof heading).toBe('string');
      expect(heading).toContain('<1>{{workspaceName}}</1>');
      expect(heading).toMatch(/Rec/);
    },
  );
});
