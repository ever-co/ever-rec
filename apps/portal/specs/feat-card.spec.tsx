import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import FeatCard from '../components/pagesComponents/_signScreen/FeatCard';

// A feature card has one action. It must be one interactive element: a link that is the only
// tab stop, not a focusable button nested inside a link.

jest.mock('next/legacy/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
jest.mock('components/elements/AppSvg', () => ({
  __esModule: true,
  default: () => <span />,
}));

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]';

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <FeatCard
        imgPath="/images/box.svg"
        title="Title"
        date="Dec 7, 2022"
        description="Description"
        rightImgPath="/images/trim.svg"
        buttonText="Read more"
      />,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('FeatCard', () => {
  it('has exactly one focusable element', () => {
    const focusable = container.querySelectorAll(FOCUSABLE);

    expect(focusable).toHaveLength(1);
    expect(focusable[0].tagName).toBe('A');
    expect(focusable[0].textContent).toBe('Read more');
  });

  it('does not nest a button inside the link', () => {
    expect(container.querySelector('a [role="button"]')).toBeNull();
    expect(container.querySelector('a [tabindex]')).toBeNull();
    expect(container.querySelector('a button')).toBeNull();
  });

  it('links to the same URL in a new tab without exposing the opener', () => {
    const link = container.querySelector('a') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('https://rec.so');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('lets the browser follow the link when it is clicked', async () => {
    const link = container.querySelector('a') as HTMLAnchorElement;
    let preventedBeforeBrowser: boolean | undefined;
    // Runs last (document, bubbling): records whether anything cancelled the navigation, then
    // cancels it so jsdom does not try to navigate.
    const listener = (e: Event) => {
      preventedBeforeBrowser = e.defaultPrevented;
      e.preventDefault();
    };
    document.addEventListener('click', listener);

    await act(async () => {
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });
    document.removeEventListener('click', listener);

    expect(preventedBeforeBrowser).toBe(false);
  });
});
