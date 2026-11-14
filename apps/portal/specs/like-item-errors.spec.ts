/**
 * The like routes answer 400 for a malformed id and 404 for an item that is gone. The like
 * services turn such an answer into `null` and one toast with the API's message, as they did when
 * the API answered 201 with an error body, so the page puts the like button back.
 */
import api from 'app/services/api/api';
import { errorMessage } from 'app/services/helpers/toastMessages';
import { likeImage } from 'app/services/screenshots';
import { likeVideo, likeVideoOwn } from 'app/services/videos';

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

const httpError = (status: number, message: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { statusCode: status, message } },
  });

describe('like services when the API refuses the like', () => {
  beforeEach(() => {
    (api.post as jest.Mock).mockReset();
    (errorMessage as jest.Mock).mockReset();
  });

  it.each([
    ['likeImage', () => likeImage('link1', false)],
    ['likeVideo', () => likeVideo('link1', false)],
    ['likeVideoOwn', () => likeVideoOwn('vid1')],
  ])('%s: a 404 gives null and the API message', async (_name, like) => {
    (api.post as jest.Mock).mockRejectedValue(httpError(404, 'Item not found'));

    await expect(like()).resolves.toBeNull();
    expect(errorMessage).toHaveBeenCalledTimes(1);
    expect(errorMessage).toHaveBeenCalledWith('Item not found');
  });

  it('a 400 gives null and the API message', async () => {
    (api.post as jest.Mock).mockRejectedValue(
      httpError(400, 'Invalid item path'),
    );

    await expect(likeImage('link1', false)).resolves.toBeNull();
    expect(errorMessage).toHaveBeenCalledWith('Invalid item path');
  });

  it('a 403 gives null without a second toast: the API client shows one', async () => {
    (api.post as jest.Mock).mockRejectedValue(httpError(403, 'Forbidden'));

    await expect(likeVideoOwn('vid1', 'ws1')).resolves.toBeNull();
    expect(errorMessage).not.toHaveBeenCalled();
  });

  it('still returns the likes on success', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      status: 'success',
      data: [{ uid: 'uid-a', timestamp: 1 }],
    });

    await expect(likeImage('link1', false)).resolves.toEqual([
      { uid: 'uid-a', timestamp: 1 },
    ]);
    expect(errorMessage).not.toHaveBeenCalled();
  });
});
