import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// The shared Ever shell: the workspace switcher in the sidebar header, the person's block at the
// sidebar foot, the one theme icon and the page's top bar.

const push = jest.fn();
const dispatch = jest.fn();
const setTheme = jest.fn();
const signOut = jest.fn();

let mockState: any;
let mockResolvedTheme: 'light' | 'dark' = 'light';
let mockAsPath = '/media/images';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push,
    query: { workspaceId: 'ws-1' },
    asPath: mockAsPath,
    pathname: mockAsPath,
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: any) => unknown) => selector(mockState),
  useDispatch: () => dispatch,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
    i18n: { language: 'en', resolvedLanguage: 'en', changeLanguage: jest.fn() },
  }),
}));
jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme, setTheme }),
}));
jest.mock('hooks/useSignOut', () => ({
  __esModule: true,
  default: () => signOut,
}));
jest.mock('hooks/useEverPlatformAvailable', () => ({
  __esModule: true,
  default: () => false,
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  infoMessage: jest.fn(),
}));

import WorkspaceSwitcher from 'components/shell/WorkspaceSwitcher';
import UserBlock from 'components/shell/UserBlock';
import ThemeToggle from 'components/shell/ThemeToggle';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import { TooltipProvider } from 'components/ui/tooltip';
import { infoMessage } from 'app/services/helpers/toastMessages';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const WORKSPACES = [
  { id: 'ws-1', name: 'Acme Robotics', members: [{ id: 'a' }, { id: 'b' }] },
  { id: 'ws-2', name: 'Field Notes', members: [{ id: 'a' }] },
];

const state = (activeWorkspace: any = null) => ({
  auth: {
    user: { id: 'u1', displayName: 'Ada Lovelace', email: 'ada@example.com' },
  },
  panel: { workspaces: WORKSPACES, activeWorkspace },
});

let container: HTMLDivElement;
let root: Root;

const render = (element: React.ReactElement) =>
  act(async () => {
    root.render(<TooltipProvider>{element}</TooltipProvider>);
  });

const key = (target: Element, name: string) =>
  act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: name,
        bubbles: true,
        cancelable: true,
      }),
    );
  });

const click = (target: Element) =>
  act(async () => {
    target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
  });

const menuItems = () =>
  Array.from(document.body.querySelectorAll('[role="menuitem"]'));
const menuItem = (text: string) =>
  menuItems().find((item) => item.textContent?.includes(text)) as HTMLElement;

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  // Radix measures and scrolls its menus; jsdom has none of these.
  (globalThis as any).ResizeObserver = class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  };
  Element.prototype.scrollIntoView = jest.fn();
  (Element.prototype as any).hasPointerCapture = jest.fn(() => false);
  (Element.prototype as any).releasePointerCapture = jest.fn();
});

beforeEach(() => {
  mockState = state();
  mockResolvedTheme = 'light';
  mockAsPath = '/media/images';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

describe('WorkspaceSwitcher', () => {
  it("shows the person's own library when no workspace is open", async () => {
    await render(<WorkspaceSwitcher onAddWorkspace={jest.fn()} />);

    const trigger = container.querySelector('button') as HTMLElement;
    expect(trigger.textContent).toContain('shell.myLibrary');
    expect(trigger.textContent).toContain('Ever Rec');
    expect(trigger.getAttribute('aria-label')).toBe(
      'shell.switchWorkspace: shell.myLibrary',
    );
  });

  it('shows the open workspace and how many members it has', async () => {
    mockState = state(WORKSPACES[0]);
    await render(<WorkspaceSwitcher onAddWorkspace={jest.fn()} />);

    const trigger = container.querySelector('button') as HTMLElement;
    expect(trigger.textContent).toContain('Acme Robotics');
    expect(trigger.textContent).toContain('shell.members:2');
  });

  it('lists the library, every workspace and the two workspace actions', async () => {
    await render(<WorkspaceSwitcher onAddWorkspace={jest.fn()} />);
    await key(container.querySelector('button') as HTMLElement, 'Enter');

    expect(menuItems().map((item) => item.textContent)).toEqual([
      expect.stringContaining('shell.myLibrary'),
      expect.stringContaining('Acme Robotics'),
      expect.stringContaining('Field Notes'),
      'common.addWorkspace',
      'common.manageWorkspace',
    ]);
  });

  it('opens a workspace: makes it the active one and goes to its page', async () => {
    await render(<WorkspaceSwitcher onAddWorkspace={jest.fn()} />);
    await key(container.querySelector('button') as HTMLElement, 'Enter');
    await click(menuItem('Field Notes'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_WORKSPACE',
      payload: WORKSPACES[1],
    });
    expect(push).toHaveBeenCalledWith('/media/workspace/ws-2');
  });

  it('goes back to the library and clears the active workspace', async () => {
    mockState = state(WORKSPACES[0]);
    await render(<WorkspaceSwitcher onAddWorkspace={jest.fn()} />);
    await key(container.querySelector('button') as HTMLElement, 'Enter');
    await click(menuItem('shell.myLibrary'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_WORKSPACE',
      payload: null,
    });
    expect(push).toHaveBeenCalledWith('/media/images');
  });

  it('says so when there is no other workspace', async () => {
    mockState = {
      ...state(WORKSPACES[0]),
      panel: { workspaces: [WORKSPACES[0]], activeWorkspace: WORKSPACES[0] },
    };
    await render(<WorkspaceSwitcher onAddWorkspace={jest.fn()} />);
    await key(container.querySelector('button') as HTMLElement, 'Enter');

    expect(document.body.textContent).toContain('shell.noOtherWorkspace');
  });

  it('adds a workspace and opens the manage page from the menu', async () => {
    const onAddWorkspace = jest.fn();
    await render(<WorkspaceSwitcher onAddWorkspace={onAddWorkspace} />);
    const trigger = container.querySelector('button') as HTMLElement;

    await key(trigger, 'Enter');
    await click(menuItem('common.addWorkspace'));
    expect(onAddWorkspace).toHaveBeenCalledTimes(1);

    await key(trigger, 'Enter');
    await click(menuItem('common.manageWorkspace'));
    expect(push).toHaveBeenCalledWith('/media/workspaces/manage');
  });
});

describe('UserBlock', () => {
  it('shows the name and the e-mail of the signed-in person', async () => {
    await render(<UserBlock />);

    const trigger = container.querySelector('button') as HTMLElement;
    expect(trigger.textContent).toContain('Ada Lovelace');
    expect(trigger.textContent).toContain('ada@example.com');
    // No picture: the initials stand in.
    expect(trigger.textContent).toContain('AL');
  });

  it('offers Account, Preferences, Help, the extension and Sign out, in that order', async () => {
    await render(<UserBlock />);
    await key(container.querySelector('button') as HTMLElement, 'Enter');

    expect(menuItems().map((item) => item.textContent)).toEqual([
      'shell.account',
      'page.preference.preferences',
      'header.help',
      'header.user.installChrome',
      'header.user.signout',
    ]);
  });

  it('goes to the profile and to Preferences', async () => {
    await render(<UserBlock />);
    const trigger = container.querySelector('button') as HTMLElement;

    await key(trigger, 'Enter');
    await click(menuItem('shell.account'));
    expect(push).toHaveBeenCalledWith('/settings/profile');

    await key(trigger, 'Enter');
    await click(menuItem('page.preference.preferences'));
    expect(push).toHaveBeenCalledWith('/settings/preferences');
  });

  it('signs out', async () => {
    await render(<UserBlock />);
    await key(container.querySelector('button') as HTMLElement, 'Enter');
    await click(menuItem('header.user.signout'));

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

describe('ThemeToggle', () => {
  it('switches to dark from light, and names what the click does', async () => {
    await render(<ThemeToggle />);
    const button = container.querySelector('button') as HTMLElement;

    expect(button.getAttribute('aria-label')).toBe('shell.switchToDark');
    await click(button);
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches to light from dark', async () => {
    mockResolvedTheme = 'dark';
    await render(<ThemeToggle />);
    const button = container.querySelector('button') as HTMLElement;

    expect(button.getAttribute('aria-label')).toBe('shell.switchToLight');
    await click(button);
    expect(setTheme).toHaveBeenCalledWith('light');
  });
});

describe('SCHeader (the top bar)', () => {
  it('searches: shows the value and reports a change', async () => {
    const onFilterChange = jest.fn();
    await render(
      <SCHeader filterValue="demo" onFilterChange={onFilterChange} />,
    );

    const input = container.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('demo');
    expect(container.querySelector('h1')).toBeNull();
  });

  it('shows the name of the page where there is nothing to search', async () => {
    mockAsPath = '/media/trashed';
    await render(<SCHeader filterValue={null} />);

    expect(container.querySelector('input[type="search"]')).toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe('navigation.bin');
  });

  it('keeps the workspace controls: invite for everyone, settings for its admin', async () => {
    const onInvite = jest.fn();
    await render(
      <SCHeader
        filterValue=""
        isWorkspace
        isWorkspaceAdmin
        onInviteMembersButtonClick={onInvite}
      />,
    );

    const invite = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'workspace.inviteTeammates',
    ) as HTMLElement;
    await click(invite);
    expect(onInvite).toHaveBeenCalledTimes(1);

    await click(
      container.querySelector(
        'button[aria-label="header.companySettings"]',
      ) as HTMLElement,
    );
    expect(push).toHaveBeenCalledWith('/media/workspace/ws-1/settings');
  });

  it('has no language menu and no avatar menu any more, and one theme button', async () => {
    await render(<SCHeader filterValue="" />);

    expect(container.textContent).not.toContain('common.language');
    expect(
      container.querySelectorAll('button[aria-label^="shell.switchTo"]'),
    ).toHaveLength(1);
  });

  it('still answers "coming soon" once for notifications and help', async () => {
    await render(<SCHeader filterValue="" />);
    const bell = container.querySelector(
      'button[aria-label="header.notifications"]',
    ) as HTMLElement;

    await click(bell);
    await click(bell);
    expect(infoMessage).toHaveBeenCalledTimes(1);
    expect(infoMessage).toHaveBeenCalledWith('header.notificationsSoon');
  });
});
