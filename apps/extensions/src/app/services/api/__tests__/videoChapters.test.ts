import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { IChapter } from '@/content/panel/hooks/useVideoChapters';
import api from '../api';
import { saveVideoChaptersAPI } from '../videoChapters';

// The real client reads sign-in tokens from chrome.storage; only what it is sent matters here.
jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const chapter = (overrides: Partial<IChapter>): IChapter => ({
  id: 'chapter',
  content: 'Chapter',
  timestamp: '00:00',
  timestampSeconds: 0,
  thumbnailURL: '',
  refName: 'chapter-ref',
  ...overrides,
});

// A chapter saved earlier: its thumbnail is a signed storage URL.
const saved = chapter({
  id: 'saved',
  content: 'Intro',
  thumbnailURL: 'https://storage.example.com/thumbnails/saved.jpg?token=signed',
  refName: 'saved-ref',
});

// A chapter added in the editor: its thumbnail is still a local blob URL.
const added = chapter({
  id: 'added',
  content: 'Outro',
  timestamp: '00:45',
  timestampSeconds: 45,
  thumbnailURL: 'blob:chrome-extension://extension-id/added-thumbnail',
  refName: 'added-ref',
});

const addedBlob = new Blob(['added thumbnail'], { type: 'image/png' });
const savedBlob = new Blob(['saved thumbnail'], { type: 'image/jpeg' });

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock<
  (url: string) => Promise<{ blob: () => Promise<Blob> }>
>;
let appendSpy: jest.SpiedFunction<FormData['append']>;

const appended = (name: string) =>
  appendSpy.mock.calls
    .filter(([entryName]) => entryName === name)
    .map(([, value]) => value);

describe('saveVideoChaptersAPI', () => {
  beforeEach(() => {
    jest.mocked(api.post).mockReset();
    jest.mocked(api.post).mockResolvedValue({ data: [] });
    fetchMock = jest.fn(async (url: string) => {
      if (url === added.thumbnailURL) {
        return { blob: async () => addedBlob };
      }
      if (url === saved.thumbnailURL) {
        return { blob: async () => savedBlob };
      }
      throw new TypeError(`Failed to fetch ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    appendSpy = jest.spyOn(FormData.prototype, 'append');
  });

  afterEach(() => {
    appendSpy.mockRestore();
    globalThis.fetch = originalFetch;
  });

  it('uploads a new chapter with its own thumbnail when a saved chapter comes first', async () => {
    await saveVideoChaptersAPI('video-1', [saved, added], 'workspace-1');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      added.thumbnailURL,
    ]);

    const blobs = appended('blobs');
    expect(blobs).toHaveLength(1);
    expect(blobs[0]).toBe(addedBlob);

    // Blob N must belong to the Nth chapter of chaptersBlobs.
    const [chaptersBlobs] = appended('chaptersBlobs');
    expect(
      JSON.parse(String(chaptersBlobs)).map(({ id }: IChapter) => id),
    ).toEqual(['added']);

    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/video/chapter/save-changes/video-1?workspaceId=workspace-1',
      expect.any(FormData),
    );
  });

  it('saves when a saved thumbnail cannot be downloaded or a chapter has no thumbnail yet', async () => {
    const unreachable = chapter({
      id: 'unreachable',
      thumbnailURL: 'https://storage.example.com/thumbnails/expired.jpg',
    });
    const noThumbnail = chapter({ id: 'no-thumbnail', thumbnailURL: '' });

    await expect(
      saveVideoChaptersAPI('video-1', [unreachable, noThumbnail, added]),
    ).resolves.toEqual({ data: [] });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      added.thumbnailURL,
    ]);
    expect(appended('blobs')).toEqual([addedBlob]);
  });
});
