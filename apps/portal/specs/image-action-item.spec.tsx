import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Dropdown, Menu } from 'antd';

import ImageActionItem from '../components/pagesComponents/_singleImageScreen/imageActions/ImageActionItem';

// The image page actions (Download, Annotate, More) are ImageActionItems. Each one must be a
// native button: reachable with Tab, announced as a button by its visible title, and still able
// to open the antd dropdown that the More action sits in.

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const Icon: React.FC = () => <svg data-testid="icon" />;

let container: HTMLDivElement;
let root: Root;

const render = (element: React.ReactElement) =>
  act(async () => {
    root.render(element);
  });

const buttons = () =>
  container.querySelectorAll<HTMLButtonElement>('button[type="button"]');

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
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

describe('ImageActionItem', () => {
  it('is one focusable button named by its title that calls onClick', async () => {
    const onClick = jest.fn();
    await render(
      <ImageActionItem title="Download" icon={Icon} onClick={onClick} />,
    );

    expect(buttons()).toHaveLength(1);
    const button = buttons()[0];
    expect(button.textContent).toBe('Download');

    button.focus();
    expect(document.activeElement).toBe(button);

    await act(async () => {
      button.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hides the icon from assistive technology', async () => {
    await render(<ImageActionItem title="Download" icon={Icon} />);

    const icon = container.querySelector('[data-testid="icon"]');
    expect(icon).not.toBeNull();
    expect(icon?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('hands its ref to the button so a dropdown can anchor to it', async () => {
    const ref = React.createRef<HTMLButtonElement>();
    await render(<ImageActionItem ref={ref} title="More" icon={Icon} />);

    expect(ref.current).toBe(buttons()[0]);
  });

  it('opens the antd dropdown it sits in when the button is clicked', async () => {
    // The image page passes its menu as `overlay`, which antd 4.24 reports as deprecated. Any
    // other error (a ref React could not attach, invalid nesting) fails the test.
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const menu = <Menu items={[{ key: 'share', label: 'Share' }]} />;
    await render(
      <Dropdown trigger={['click']} overlay={menu} placement="bottomLeft">
        <ImageActionItem title="More" icon={Icon} />
      </Dropdown>,
    );

    expect(buttons()).toHaveLength(1);
    expect(document.body.querySelector('.ant-dropdown')).toBeNull();

    await act(async () => {
      buttons()[0].click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const dropdown = document.body.querySelector('.ant-dropdown');
    expect(dropdown).not.toBeNull();
    expect(dropdown?.textContent).toContain('Share');
    // The class names the dropdown injects reach the button too.
    expect(buttons()[0].classList).toContain('ant-dropdown-trigger');
    expect(buttons()[0].classList).toContain('ant-dropdown-open');

    const errors = consoleError.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter((message) => !message.includes('`overlay` is deprecated'));
    consoleError.mockRestore();
    expect(errors).toEqual([]);
  });
});
