import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import AppButton from '../components/controls/AppButton';

// AppButton is rendered as a div, so it has to expose the button role, take keyboard focus and
// react to Enter and Space itself. A disabled button must neither take focus nor fire.

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

let container: HTMLDivElement;
let root: Root;

const render = (element: React.ReactElement) =>
  act(async () => {
    root.render(element);
  });

const button = () => container.querySelector('[role="button"]') as HTMLElement;

const press = (target: Element, key: string) =>
  act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  });

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
});

describe('AppButton keyboard support', () => {
  it('is a focusable element with the button role', async () => {
    await render(<AppButton onClick={jest.fn()}>Save</AppButton>);

    expect(button()).not.toBeNull();
    expect(button().tabIndex).toBe(0);
    expect(button().getAttribute('aria-disabled')).toBeNull();
  });

  it('activates on Enter and on Space', async () => {
    const onClick = jest.fn();
    await render(<AppButton onClick={onClick}>Save</AppButton>);

    await press(button(), 'Enter');
    await press(button(), ' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('prevents the page from scrolling when Space is pressed', async () => {
    await render(<AppButton onClick={jest.fn()}>Save</AppButton>);
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });

    await act(async () => {
      button().dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores other keys', async () => {
    const onClick = jest.fn();
    await render(<AppButton onClick={onClick}>Save</AppButton>);

    await press(button(), 'a');
    await press(button(), 'Tab');
    await press(button(), 'Escape');

    expect(onClick).not.toHaveBeenCalled();
  });

  it('ignores keys pressed on a control nested inside it', async () => {
    const onClick = jest.fn();
    await render(
      <AppButton onClick={onClick}>
        <input data-testid="inner" />
      </AppButton>,
    );

    await press(container.querySelector('[data-testid="inner"]')!, ' ');

    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps mouse clicks working', async () => {
    const onClick = jest.fn();
    await render(<AppButton onClick={onClick}>Save</AppButton>);

    await act(async () => {
      button().click();
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is skipped by Tab, announced as disabled and does not fire when disabled', async () => {
    const onClick = jest.fn();
    await render(
      <AppButton onClick={onClick} disabled>
        Save
      </AppButton>,
    );

    await press(button(), 'Enter');
    await act(async () => {
      button().click();
    });

    expect(button().tabIndex).toBe(-1);
    expect(button().getAttribute('aria-disabled')).toBe('true');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('exposes an accessible name for icon-only buttons', async () => {
    await render(
      <AppButton onClick={jest.fn()} ariaLabel="Restore">
        <i />
      </AppButton>,
    );

    expect(button().getAttribute('aria-label')).toBe('Restore');
  });
});
