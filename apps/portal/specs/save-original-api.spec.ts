/**
 * "Save original" must call the route the API really serves:
 * `POST /api/v1/workspace/:workspaceId/files/:workspaceId/save-original`.
 * It used to call `/workspace/:workspaceId/save-original`, which does not exist (404).
 */
import { saveOriginalWSImageAPI } from 'app/services/api/workspace';
import api from 'app/services/api/api';

jest.mock('app/services/api/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

describe('saveOriginalWSImageAPI', () => {
  beforeEach(() => {
    (api.post as jest.Mock).mockReset();
  });

  it('posts to the files route of the workspace with the file name in the body', async () => {
    (api.post as jest.Mock).mockResolvedValue('https://example.com/original');

    const result = await saveOriginalWSImageAPI('shot.png', 'ws123');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/workspace/ws123/files/ws123/save-original',
      { fullFileName: 'shot.png' },
    );
    expect(result).toBe('https://example.com/original');
  });

  it('does not use the old route without the files segment', async () => {
    await saveOriginalWSImageAPI('shot.png', 'ws123');

    const [url] = (api.post as jest.Mock).mock.calls[0];
    expect(url).not.toBe('/api/v1/workspace/ws123/save-original');
  });
});
