/**
 * DELETE /auth/user answers an account that was not deleted with an HTTP error: 409 when it was
 * refused because the account is the admin of a workspace (the message names the workspaces), 500
 * when the deletion failed. `deleteUser` then rejects, so the profile page (settings/profile) keeps
 * the person signed in, and `deletionRefusal` gives the message to show for the refusal only.
 */
import api from 'app/services/api/api';
import { deleteUser, deletionRefusal } from 'app/services/auth';

// The real client reads sign-in tokens from cookies; only what it answers matters here.
jest.mock('app/services/api/api', () => ({
  __esModule: true,
  default: { delete: jest.fn() },
}));

const REFUSAL =
  'You are the admin of the workspace “Team”. Before you delete your account, delete that ' +
  'workspace or ask for another member to be made its admin.';

/** An HTTP error as the API client rejects with it (axios). */
const httpError = (status: number, data: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  });

describe('deleting the account', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves once the API deleted the account', async () => {
    (api.delete as jest.Mock).mockResolvedValue({
      status: 'success',
      data: null,
    });

    await expect(deleteUser()).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/api/v1/auth/user');
  });

  it('rejects the refusal, whose message names the workspaces', async () => {
    const refused = httpError(409, {
      status: 'error',
      message: REFUSAL,
      error: {
        code: 'workspace_admin',
        workspaces: [{ id: 'ws-1', name: 'Team' }],
      },
      data: null,
    });
    (api.delete as jest.Mock).mockRejectedValue(refused);

    const error = await deleteUser().catch((reason) => reason);

    expect(error).toBe(refused);
    expect(deletionRefusal(error)).toBe(REFUSAL);
  });

  it('gives no refusal message for any other failure', () => {
    expect(
      deletionRefusal(
        httpError(500, {
          status: 'error',
          message: 'Error while trying to delete user or user files!',
          error: null,
        }),
      ),
    ).toBeUndefined();
    // A 409 that is not this refusal, and an error without a response (offline).
    expect(
      deletionRefusal(httpError(409, { message: 'x', error: { code: 'y' } })),
    ).toBeUndefined();
    expect(deletionRefusal(new Error('Network Error'))).toBeUndefined();
  });
});
