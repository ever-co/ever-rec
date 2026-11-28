/**
 * `DELETE /api/v1/auth/user` answers an account that was not deleted with an HTTP error, so that no
 * client takes it for a deletion (a client that read only the HTTP status signed the person out and
 * said the account was deleted): 409 for the refusal while the account is the admin of a
 * workspace, with the message naming the workspaces, 500 for a deletion that failed.
 */
import { HttpException } from '@nestjs/common';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { AuthController } from './auth.controller';

describe('DELETE /auth/user', () => {
  const deleteUser = jest.fn();
  const controller = new AuthController(
    { deleteUser } as any,
    {} as any,
    {} as any,
  );
  const user = { id: 'uid-1' } as any;

  /** The HTTP status and body the route answers for what the deletion answered. */
  const answerFor = async (result: unknown) => {
    deleteUser.mockResolvedValueOnce(result);
    try {
      return { status: 200, body: await controller.deleteUser(user) };
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const http = error as HttpException;
      return { status: http.getStatus(), body: http.getResponse() };
    }
  };

  beforeEach(() => deleteUser.mockReset());

  it('answers 200 with the body for a deleted account', async () => {
    const deleted = {
      status: ResStatusEnum.success,
      message: 'Success!',
      error: null,
      data: null,
    };

    await expect(answerFor(deleted)).resolves.toEqual({
      status: 200,
      body: deleted,
    });
    expect(deleteUser).toHaveBeenCalledWith('uid-1');
  });

  it('answers 409 with the refusal while the account is the admin of a workspace', async () => {
    const refused = {
      status: ResStatusEnum.error,
      message: 'You are the admin of the workspace “Team”. …',
      error: {
        code: 'workspace_admin',
        workspaces: [{ id: 'ws-1', name: 'Team' }],
      },
      data: null,
    };

    await expect(answerFor(refused)).resolves.toEqual({
      status: 409,
      body: refused,
    });
  });

  it('answers 500 for a deletion that failed, without the cause', async () => {
    const failed = {
      status: ResStatusEnum.error,
      message: 'Error while trying to delete user or user files!',
      error: new Error('auth/internal-error'),
      data: null,
    };

    await expect(answerFor(failed)).resolves.toEqual({
      status: 500,
      body: { ...failed, error: null },
    });
  });
});
