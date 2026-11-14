import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// The embed page runs inside other sites, for viewers who are not signed in. It may only
// use the public shared-video fetch and the anonymous view counter, and it must never
// restore sign-in (which messages the browser extension to sign out).

const mockRouter = { isReady: true, query: { id: 'abc' } as any };
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('misc/fallbackVideoURL', () => ({
  fallbackVideoURL: jest.fn(async (url: string) => url),
}));
jest.mock('hooks/useRenderVideo', () => ({
  __esModule: true,
  default: ({ urlLink }: { urlLink: string }) => ({
    renderVideo: <div data-testid="player" data-url={urlLink} />,
  }),
}));
jest.mock('hooks/useAuthenticateUser', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('app/services/videos', () => ({
  getVideoForPublicPage: jest.fn(),
}));
jest.mock('app/services/imageandvideo', () => ({
  addUniqueView: jest.fn(async () => ({ uniqueViewsDb: [], views: 1 })),
}));

import useAuthenticateUser from 'hooks/useAuthenticateUser';
import { getVideoForPublicPage } from 'app/services/videos';
import { addUniqueView } from 'app/services/imageandvideo';
import EmbeddedSharedVideo from '../pages/video/shared/embed/[id]';

const mockFetch = getVideoForPublicPage as jest.Mock;
const mockAddView = addUniqueView as jest.Mock;
const mockAuthHook = useAuthenticateUser as unknown as jest.Mock;

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const videoWith = (streamData?: { playbackStatus: string }) => ({
  video: {
    url: 'https://cdn.test/video.mp4',
    dbData: { id: 'v1', streamData },
  },
});

let container: HTMLDivElement;
let root: Root;

const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

const render = async () => {
  await act(async () => {
    root.render(<EmbeddedSharedVideo />);
  });
  await settle();
};

const player = () =>
  container.querySelector('[data-testid="player"]') as HTMLElement | null;

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockRouter.isReady = true;
  mockRouter.query = { id: 'abc' };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.useRealTimers();
});

describe('embedded shared video page', () => {
  it('plays a video without stream data and counts one anonymous view', async () => {
    mockFetch.mockResolvedValue(videoWith());
    await render();

    expect(player()?.dataset.url).toBe('https://cdn.test/video.mp4');
    expect(mockAddView).toHaveBeenCalledTimes(1);
    // Only the share link is sent: no viewer, address or item data (the API knows them).
    expect(mockAddView.mock.calls[0]).toEqual(['abc', 'video', false]);
  });

  it('never restores sign-in, which would sign the extension out', async () => {
    mockFetch.mockResolvedValue(videoWith());
    await render();

    expect(mockAuthHook).not.toHaveBeenCalled();
  });

  it('shows the no-access message when the video cannot be loaded', async () => {
    mockFetch.mockResolvedValue({ video: null });
    await render();

    expect(container.textContent).toContain('page.video.noAccess');
    expect(player()).toBeNull();
  });

  it('shows the processing text while playback is preparing and polls nothing', async () => {
    mockFetch.mockResolvedValue(videoWith({ playbackStatus: 'preparing' }));
    await render();

    expect(container.textContent).toContain('page.image.processing');
    expect(player()).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    await settle();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when playback is already READY', async () => {
    mockFetch.mockResolvedValue(videoWith({ playbackStatus: 'ready' }));
    await render();

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
