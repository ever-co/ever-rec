import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// The image share modal shows the public link next to a copy button. Clicking it must write the
// link to the clipboard and confirm; if the clipboard refuses, the user must be told and the
// modal must not claim the link was copied.

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-redux', () => ({
  useSelector: () => ({ sharedLink: undefined }),
}));
jest.mock('antd', () => ({
  Modal: ({ open, footer, children }: any) =>
    open ? (
      <div>
        {children}
        {footer}
      </div>
    ) : null,
}));
jest.mock('components/elements/AppSvg', () => ({
  __esModule: true,
  default: ({ path }: { path: string }) => <i data-path={path} />,
}));
jest.mock('components/controls/AppButton', () => ({
  __esModule: true,
  default: ({ onClick, children }: any) => (
    <button data-testid="copy" onClick={onClick}>
      {children}
    </button>
  ),
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  successMessage: jest.fn(),
  errorMessage: jest.fn(),
}));

import {
  errorMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import ShareItemModal from '../components/pagesComponents/_imagesScreen/pages/myImages/screenshotsContainer/ShareItemModal';

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const mockSuccess = successMessage as jest.Mock;
const mockError = errorMessage as jest.Mock;

let container: HTMLDivElement;
let root: Root;
let writeText: jest.Mock;
const copied = jest.fn();

const item = { sharedLink: 'abc123' } as any;

const render = (props: Record<string, unknown> = {}) =>
  act(async () => {
    root.render(
      <ShareItemModal
        visible
        item={item}
        copystate={false}
        copied={copied}
        onCancel={jest.fn()}
        {...props}
      />,
    );
  });

const click = () =>
  act(async () => {
    (
      container.querySelector('[data-testid="copy"]') as HTMLButtonElement
    ).click();
  });

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_WEBSITE_URL = 'https://rec.test';
  writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('image share modal copy button', () => {
  it('shows the public link and a copy button', async () => {
    await render();

    expect(container.textContent).toContain(
      'https://rec.test/image/shared/abc123',
    );
    expect(container.querySelector('[data-testid="copy"]')).not.toBeNull();
  });

  it('writes the link to the clipboard and confirms', async () => {
    await render();
    await click();

    expect(writeText).toHaveBeenCalledWith(
      'https://rec.test/image/shared/abc123',
    );
    expect(copied).toHaveBeenCalledTimes(1);
    expect(mockSuccess).toHaveBeenCalledWith('toasts.copied');
    expect(mockError).not.toHaveBeenCalled();
  });

  it('keeps the workspace marker on workspace links', async () => {
    await render({ isWorkspace: true });
    await click();

    expect(writeText).toHaveBeenCalledWith(
      'https://rec.test/image/shared/abc123?ws=1',
    );
  });

  it('reports an error and does not claim success when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    await render();
    await click();

    expect(mockError).toHaveBeenCalledWith('hooks.toasts.shareLinkCopyError');
    expect(copied).not.toHaveBeenCalled();
    expect(mockSuccess).not.toHaveBeenCalled();
  });
});
