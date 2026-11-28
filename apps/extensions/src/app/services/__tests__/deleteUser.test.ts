/**
 * DELETE /auth/user answers HTTP 200 with status "error" when the account was not deleted. Refused
 * because the account is the admin of a workspace, its message names the workspaces: `deleteUser` hands it
 * over to be shown, and the profile page keeps the person signed in.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import api from '@/app/services/api/api';
import { deleteUser } from '@/app/services/auth';

// The real client reads sign-in tokens from chrome.storage; only what it answers matters here.
jest.mock('@/app/services/api/api', () => ({
  __esModule: true,
  default: { delete: jest.fn() },
}));

const answer = (value: unknown) =>
  (
    api.delete as unknown as jest.Mock<() => Promise<unknown>>
  ).mockResolvedValue(value);

const REFUSAL =
  'You are the admin of the workspace “Team”. Before you delete your account, delete that ' +
  'workspace or ask for another member to be made its admin.';

describe('deleteUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('answers deleted when the API deleted the account', async () => {
    answer({ status: 'success', message: 'Success!', error: null, data: null });

    await expect(deleteUser()).resolves.toEqual({ deleted: true });
    expect(api.delete).toHaveBeenCalledWith('/api/v1/auth/user');
  });

  it('answers the refusal while the account is the admin of a workspace', async () => {
    answer({
      status: 'error',
      message: REFUSAL,
      error: {
        code: 'workspace_admin',
        workspaces: [{ id: 'ws-1', name: 'Team' }],
      },
      data: null,
    });

    await expect(deleteUser()).resolves.toEqual({
      deleted: false,
      refusal: REFUSAL,
    });
  });

  it('answers not deleted, without the message, for any other failure', async () => {
    answer({
      status: 'error',
      message: 'Error while trying to delete user or user files!',
      error: {},
      data: null,
    });

    await expect(deleteUser()).resolves.toEqual({ deleted: false });
  });
});
