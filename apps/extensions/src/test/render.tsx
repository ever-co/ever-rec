import { ReactElement } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

const containers = new Set<HTMLElement>();

/**
 * Mounts a tree into document.body, the way @testing-library/react's render
 * does. That package needs React 18 (react-dom/client) from v13 on, and the
 * extension is on React 17.
 */
export function render(ui: ReactElement): HTMLElement {
  const container = document.body.appendChild(document.createElement('div'));
  containers.add(container);
  act(() => {
    ReactDOM.render(ui, container);
  });
  return container;
}

export function cleanup(): void {
  containers.forEach((container) => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
  });
  containers.clear();
}
