import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// Controls that every page uses and that must follow the light and the dark theme: the shared
// button's looks and the inline SVG icons.

jest.mock('react-svg', () => ({
  ReactSVG: ({ className }: { className?: string }) => (
    <div data-testid="svg" className={className} />
  ),
}));

import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import { cn } from 'app/utilities/cn';

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
const label = () => button().firstElementChild as HTMLElement;
const svg = () => container.querySelector('[data-testid="svg"]') as HTMLElement;

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

describe('AppButton looks', () => {
  it('is the primary action by default: ink ground, its own foreground', async () => {
    await render(<AppButton onClick={jest.fn()}>Save</AppButton>);

    expect(button().classList.contains('tw-bg-primary')).toBe(true);
    expect(label().classList.contains('tw-text-primary-foreground')).toBe(true);
  });

  it.each([
    ['tw-bg-danger', 'tw-bg-destructive', 'tw-text-destructive-foreground'],
    ['tw-bg-red', 'tw-bg-destructive', 'tw-text-destructive-foreground'],
    ['tw-bg-white', 'tw-bg-card', 'tw-text-foreground'],
    ['tw-bg-transparent', 'tw-bg-transparent', 'tw-text-foreground'],
    [
      'tw-bg-app-grey-darker',
      'tw-bg-secondary',
      'tw-text-secondary-foreground',
    ],
    ['tw-bg-primary-purple', 'tw-bg-primary', 'tw-text-primary-foreground'],
  ])('maps bgColor=%s onto a themed look', async (bgColor, ground, text) => {
    await render(
      <AppButton onClick={jest.fn()} bgColor={bgColor}>
        Go
      </AppButton>,
    );

    expect(button().classList.contains(ground)).toBe(true);
    expect(label().classList.contains(text)).toBe(true);
    // The old fixed colour class is not left on the element beside the themed one.
    if (bgColor !== ground) {
      expect(button().classList.contains(bgColor)).toBe(false);
    }
  });

  it('is an outline button when outlined, whatever bgColor says', async () => {
    await render(
      <AppButton onClick={jest.fn()} outlined bgColor="tw-bg-app-grey-darker">
        Cancel
      </AppButton>,
    );

    expect(button().classList.contains('tw-bg-transparent')).toBe(true);
    expect(button().classList.contains('tw-bg-secondary')).toBe(false);
    expect(label().classList.contains('tw-text-foreground')).toBe(true);
  });

  it("leaves a caller's own ground class alone", async () => {
    await render(
      <AppButton onClick={jest.fn()} bgColor="tw-bg-picker-blue">
        Blue
      </AppButton>,
    );

    expect(button().classList.contains('tw-bg-picker-blue')).toBe(true);
  });

  it("lets the caller's text colour win", async () => {
    await render(
      <AppButton onClick={jest.fn()} twTextColor="tw-text-brand-text">
        Link
      </AppButton>,
    );

    expect(label().classList.contains('tw-text-brand-text')).toBe(true);
    expect(label().classList.contains('tw-text-primary-foreground')).toBe(
      false,
    );
  });

  it('shows that it is disabled', async () => {
    await render(
      <AppButton onClick={jest.fn()} disabled>
        Save
      </AppButton>,
    );

    expect(button().classList.contains('tw-opacity-50')).toBe(true);
    expect(button().classList.contains('tw-cursor-not-allowed')).toBe(true);
  });
});

describe('AppSvg', () => {
  it('lets an icon-sized drawing take the text colour', async () => {
    await render(<AppSvg path="/common/x.svg" size="20px" />);

    expect(svg().classList.contains('app-svg-icon')).toBe(true);
  });

  it('measures by width and height too', async () => {
    await render(<AppSvg path="/common/x.svg" width="24px" height="18px" />);

    expect(svg().classList.contains('app-svg-icon')).toBe(true);
  });

  it('leaves a picture as it is drawn', async () => {
    await render(<AppSvg path="/images/empty.svg" size="240px" />);

    expect(svg().classList.contains('app-svg-icon')).toBe(false);
  });

  it('leaves an icon alone when the caller gave it a real fill', async () => {
    await render(<AppSvg path="/common/x.svg" size="20px" bgColor="#ff0000" />);

    expect(svg().classList.contains('app-svg-icon')).toBe(false);
  });

  it('ignores a Tailwind class passed as the fill (it never painted anything)', async () => {
    await render(
      <AppSvg path="/common/x.svg" size="20px" bgColor="tw-bg-white" />,
    );

    expect(svg().classList.contains('app-svg-icon')).toBe(true);
  });

  it('can be told either way', async () => {
    await render(<AppSvg path="/images/logo.svg" size="200px" themed />);
    expect(svg().classList.contains('app-svg-icon')).toBe(true);

    await render(<AppSvg path="/common/x.svg" size="20px" themed={false} />);
    expect(svg().classList.contains('app-svg-icon')).toBe(false);
  });
});

describe('cn', () => {
  it('resolves a conflict between prefixed Tailwind classes: the later one wins', () => {
    expect(cn('tw-px-2', 'tw-px-4')).toBe('tw-px-4');
    expect(cn('tw-bg-primary', 'tw-bg-card')).toBe('tw-bg-card');
    expect(cn('hover:tw-bg-accent', 'hover:tw-bg-primary/90')).toBe(
      'hover:tw-bg-primary/90',
    );
  });

  it('keeps classes that do not conflict', () => {
    expect(cn('tw-px-2', 'tw-py-4', false && 'tw-hidden')).toBe(
      'tw-px-2 tw-py-4',
    );
  });
});
