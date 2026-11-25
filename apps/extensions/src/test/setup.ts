import '@testing-library/jest-dom/jest-globals';
import { afterEach } from '@jest/globals';
import { configure } from '@testing-library/dom';
import { act } from 'react-dom/test-utils';
import { cleanup } from './render';

// Content components build their image URLs with chrome.runtime.getURL.
(globalThis as unknown as { chrome: unknown }).chrome = {
  runtime: { getURL: (path: string) => path },
};

// Flush React 17 updates after every Testing Library event, as
// @testing-library/react does for React 18.
configure({
  eventWrapper: (callback) => {
    let result: unknown;
    act(() => {
      result = callback();
    });
    return result;
  },
  asyncWrapper: async (callback) => {
    let result: unknown;
    await act(async () => {
      result = await callback();
    });
    return result;
  },
});

afterEach(cleanup);
