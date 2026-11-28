import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// The phone drawer of the shared shell: a modal dialog opened from the page's top bar. Focus
// moves into it, Escape closes it, and focus goes back to the button that opened it.

const mockState = {
  auth: {
    user: { id: 'u1', displayName: 'Ada Lovelace', email: 'ada@example.com' },
  },
  panel: { workspaces: [], activeWorkspace: null },
};

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: {},
    asPath: '/media/images',
    pathname: '/media/images',
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: any) => unknown) => selector(mockState),
  useDispatch: () => jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en', changeLanguage: jest.fn() },
  }),
}));
jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: jest.fn() }),
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  infoMessage: jest.fn(),
}));
// The sidebar itself is covered by app-shell.spec.tsx; here it only has to hold a link.
jest.mock('components/containers/dashboardLayout/Sidebar/Sidebar', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const react = require('react');
  return {
    __esModule: true,
    default: ({
      inDrawer,
      onAddWorkspace,
    }: {
      inDrawer?: boolean;
      onAddWorkspace: () => void;
    }) =>
      react.createElement(
        'nav',
        { 'data-place': inDrawer ? 'drawer' : 'desktop' },
        react.createElement('a', { href: '/media/images' }, 'My images'),
        react.createElement(
          'button',
          { type: 'button', 'data-add-workspace': '', onClick: onAddWorkspace },
          'Add workspace',
        ),
      ),
  };
});

import DashboardLayout from 'components/containers/dashboardLayout/DashboardLayout';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import { ShellProvider } from 'components/shell/ShellContext';
import { TooltipProvider } from 'components/ui/tooltip';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

let container: HTMLDivElement;
let root: Root;

// Radix hands focus back on the next tick.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

const dialog = () => document.body.querySelector('[role="dialog"]');

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as any).ResizeObserver = class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  };
});

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <TooltipProvider>
        <ShellProvider>
          <DashboardLayout>
            <SCHeader filterValue={null} />
          </DashboardLayout>
        </ShellProvider>
      </TooltipProvider>,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('the phone drawer', () => {
  const trigger = () =>
    container.querySelector(
      'button[aria-label="shell.openNavigation"]',
    ) as HTMLButtonElement;

  const open = async () => {
    trigger().focus();
    await act(async () => {
      trigger().click();
    });
    await settle();
  };

  it('is not in the page until it is opened', () => {
    expect(dialog()).toBeNull();
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('opens as a named modal dialog and takes the focus', async () => {
    await open();

    const drawer = dialog() as HTMLElement;
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain('shell.openNavigation');
    expect(drawer.querySelector('nav[data-place="drawer"]')).not.toBeNull();
    expect(drawer.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape and gives the focus back to its button', async () => {
    await open();

    await act(async () => {
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await settle();

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('makes room for the "add workspace" dialog and leaves the focus to it', async () => {
    await open();
    const add = (dialog() as HTMLElement).querySelector(
      '[data-add-workspace]',
    ) as HTMLElement;

    await act(async () => {
      add.click();
    });
    await settle();

    // The drawer is gone: its focus trap cannot take the focus back from the new dialog.
    expect(document.body.querySelector('nav[data-place="drawer"]')).toBeNull();
    // The dialog that names the new workspace is open, beside the layout.
    expect(document.body.querySelector('.ant-modal')).not.toBeNull();
    expect(document.activeElement).not.toBe(trigger());
  });
});
