import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// The public workspace invite page. Deleting an account removes its record, so the API answers
// with an empty inviter for an invite that account sent: the page must still offer to join.

const mockRouter = {
  isReady: true,
  query: { workspaceInviteId: 'inv-1' } as Record<string, string>,
  push: jest.fn(),
};
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
jest.mock('app/services/workspace', () => ({
  getWorkspaceInviteData: jest.fn(),
  joinWorkspaceWithInvite: jest.fn(),
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  successMessage: jest.fn(),
}));
jest.mock(
  'components/pagesComponents/_singleImageScreen/topMenuBar/TopMenuBar',
  () => ({ __esModule: true, default: () => null }),
);
jest.mock('components/controls/AppButton', () => ({
  __esModule: true,
  default: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="join" onClick={onClick}>
      {children}
    </button>
  ),
}));
jest.mock('hooks/useAuthenticateUser', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('components/elements/AppSvg', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('components/containers/appSpinner/AppSpinner', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('misc/_helper', () => ({ sendExternalMessage: jest.fn() }));

import { getWorkspaceInviteData } from 'app/services/workspace';
import WorkspaceInvite from '../pages/workspace/invite/[workspaceInviteId]';

const mockGetInvite = getWorkspaceInviteData as jest.Mock;

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

let container: HTMLDivElement;
let root: Root;

const open = async () => {
  await act(async () => {
    root.render(<WorkspaceInvite />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  mockGetInvite.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('workspace invite page', () => {
  it('offers to join when the inviter account was deleted', async () => {
    mockGetInvite.mockResolvedValue({
      id: 'inv-1',
      workspaceInviter: '',
      workspaceName: 'Team',
      workspaceMembers: ['Two', 'three'],
    });

    await open();

    expect(mockGetInvite).toHaveBeenCalledWith('inv-1');
    expect(container.querySelector('[data-testid="join"]')).not.toBeNull();
    expect(container.textContent).toContain('Team');
    expect(container.textContent).not.toContain('workspace.invitedToJoin');
  });

  it('names the inviter when it is known', async () => {
    mockGetInvite.mockResolvedValue({
      id: 'inv-1',
      workspaceInviter: 'Two',
      workspaceName: 'Team',
      workspaceMembers: ['Two'],
    });

    await open();

    expect(container.querySelector('[data-testid="join"]')).not.toBeNull();
    expect(container.textContent).toContain('Two workspace.invitedToJoin');
  });
});
