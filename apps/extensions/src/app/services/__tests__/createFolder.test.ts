/**
 * POST /image/folder and /video/folder answer HTTP 200 with status "error" when nothing is written:
 * a parent folder deleted in another tab, or a nest level that is too deep. Creating a personal
 * folder then shows the API's message and leaves the explorer as it is; a created folder still
 * refreshes it.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import api from '@/app/services/api/api';
import { errorMessage } from '@/app/services/helpers/toastMessages';
import { createImagesFolder } from '@/app/services/screenshots';
import { createVideosFolder } from '@/app/services/videos';

// The real client reads sign-in tokens from chrome.storage; only what it is sent matters here.
jest.mock('@/app/services/api/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/app/services/helpers/toastMessages', () => ({
  clearToasts: jest.fn(),
  errorMessage: jest.fn(),
  infoMessage: jest.fn(),
  successMessage: jest.fn(),
  warnMessage: jest.fn(),
  loadingMessage: jest.fn(),
  updateMessage: jest.fn(),
}));
// The real store loads the panel routes, which import every screen and its SVG icons.
jest.mock('@/app/store/panel', () => ({
  __esModule: true,
  default: { dispatch: jest.fn(), getState: jest.fn(() => ({})) },
}));

// What the explorer refresh reads: the files and folders of the page, and the favorite folders.
const explorerAnswer = async (url: string): Promise<unknown> => {
  if (url.includes('/files/all')) return [];
  if (url.includes('/folders/all')) return { status: 'success', data: [] };
  if (url.includes('/folder/')) {
    return { status: 'success', data: { id: 'parent-1' } };
  }
  return { status: 'success', data: null };
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe.each([
  ['createImagesFolder', createImagesFolder, 'image'],
  ['createVideosFolder', createVideosFolder, 'video'],
])('%s', (_name, createFolder, type) => {
  beforeEach(() => {
    jest.mocked(api.post).mockReset();
    jest.mocked(api.get).mockReset();
    jest.mocked(api.get).mockImplementation(explorerAnswer as never);
    jest.mocked(errorMessage).mockReset();
  });

  it.each([
    'Parent folder not found.',
    'Cannot create new folder. Nest level too deep.',
  ])(
    'an error answer (%s) shows its message and does not refresh the explorer',
    async (message) => {
      jest.mocked(api.post).mockResolvedValue({
        status: 'error',
        message,
        error: null,
        data: null,
      });

      await createFolder('parent-1', 'New folder', '#ffffff', false);
      await flushPromises();

      expect(api.post).toHaveBeenCalledWith(
        `/api/v1/${type}/folder`,
        expect.objectContaining({ name: 'New folder', parentId: 'parent-1' }),
      );
      expect(errorMessage).toHaveBeenCalledTimes(1);
      expect(errorMessage).toHaveBeenCalledWith(message);
      expect(api.get).not.toHaveBeenCalled();
    },
  );

  it('a created folder refreshes the explorer without a message', async () => {
    jest.mocked(api.post).mockResolvedValue({
      status: 'success',
      message: 'Success',
      error: null,
      data: { id: 'new-1', name: 'New folder', parentId: 'parent-1' },
    });

    await createFolder('parent-1', 'New folder', '#ffffff', false);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith(`/api/v1/${type}/folders/all`);
    expect(api.get).toHaveBeenCalledWith(
      `/api/v1/${type}/files/all?folderId=parent-1`,
    );
    expect(errorMessage).not.toHaveBeenCalled();
  });
});
