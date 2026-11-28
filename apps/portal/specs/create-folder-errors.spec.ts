/**
 * POST /image/folder and /video/folder answer HTTP 200 with status "error" when nothing is written:
 * a parent folder deleted in another tab, or a nest level that is too deep. Creating a personal
 * folder then shows the API's message and leaves the explorer as it is; a created folder still
 * refreshes it.
 */
import api from 'app/services/api/api';
import { errorMessage } from 'app/services/helpers/toastMessages';
import { createImagesFolder } from 'app/services/screenshots';
import { createVideosFolder } from 'app/services/videos';

jest.mock('app/services/api/api', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));
jest.mock('app/services/helpers/toastMessages', () => ({
  errorMessage: jest.fn(),
  infoMessage: jest.fn(),
  successMessage: jest.fn(),
  loadingMessage: jest.fn(),
  updateMessage: jest.fn(),
}));
// Not used here; its PNG decoder needs TextEncoder, which jsdom does not have.
jest.mock('jspdf', () => ({ __esModule: true, default: class {} }));

// What the explorer refresh reads: the files and folders of the page, and the favorite folders.
const explorerAnswer = async (url: string) => {
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
    (api.post as jest.Mock).mockReset();
    (api.get as jest.Mock).mockReset();
    (api.get as jest.Mock).mockImplementation(explorerAnswer);
    (errorMessage as jest.Mock).mockReset();
  });

  it.each([
    'Parent folder not found.',
    'Cannot create new folder. Nest level too deep.',
  ])(
    'an error answer (%s) shows its message and does not refresh the explorer',
    async (message) => {
      (api.post as jest.Mock).mockResolvedValue({
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
    (api.post as jest.Mock).mockResolvedValue({
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
