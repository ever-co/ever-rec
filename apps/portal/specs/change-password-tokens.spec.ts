/**
 * A password change revokes every session of the account, the one of this tab too. The API answers
 * with the tokens of a session opened after that, and the portal must keep them, as a sign-in does,
 * and hand them to the extension. With the old tokens the next call was answered 401 and the
 * person was signed out.
 */
jest.mock('misc/_helper', () => ({
  sendExternalMessage: jest.fn(),
  storeUserTokens: jest.fn(),
  handleResponse: jest.fn(),
  parseUserData: jest.fn(() => ({})),
  getUserTokens: jest.fn(),
}));
jest.mock('app/services/api/auth', () => ({
  changeUserPasswordAPI: jest.fn(),
}));

import * as helper from 'misc/_helper';
import * as authApi from 'app/services/api/auth';
import { changeUserPassword } from 'app/services/auth';

const mockHelper = helper as jest.Mocked<typeof helper>;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('changeUserPassword', () => {
  const tokens = {
    idToken: 'firebase-id-token-after-the-change',
    refreshToken: 'reference-token-after-the-change',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the tokens of a successful change and hands them to the extension', async () => {
    const answer = {
      status: 'success',
      message: 'Success!',
      error: null,
      data: {
        message: 'Password changed successfully!',
        ...tokens,
        expiresAt: '2026-11-17T12:00:00.000Z',
      },
    };
    mockAuthApi.changeUserPasswordAPI.mockResolvedValue(answer as any);

    const result = await changeUserPassword(
      'person@example.test',
      'Secret-1234',
      'Changed-5678',
    );

    expect(result).toBe(answer);
    expect(mockAuthApi.changeUserPasswordAPI).toHaveBeenCalledWith(
      'person@example.test',
      'Secret-1234',
      'Changed-5678',
    );
    expect(mockHelper.storeUserTokens).toHaveBeenCalledWith(tokens);
    expect(mockHelper.sendExternalMessage).toHaveBeenCalledWith(
      'signIn',
      tokens,
    );
  });

  it('keeps the stored tokens when the change fails', async () => {
    mockAuthApi.changeUserPasswordAPI.mockResolvedValue({
      status: 'error',
      message: 'Invalid email or password. Please try again...',
      error: {},
      data: null,
    } as any);

    await changeUserPassword('person@example.test', 'wrong', 'Changed-5678');

    expect(mockHelper.storeUserTokens).not.toHaveBeenCalled();
    expect(mockHelper.sendExternalMessage).not.toHaveBeenCalled();
  });

  it('keeps the stored tokens when the answer carries none', async () => {
    mockAuthApi.changeUserPasswordAPI.mockResolvedValue({
      status: 'success',
      message: 'Success!',
      error: null,
      data: { message: 'Password changed successfully!' },
    } as any);

    await changeUserPassword(
      'person@example.test',
      'Secret-1234',
      'Changed-5678',
    );

    expect(mockHelper.storeUserTokens).not.toHaveBeenCalled();
    expect(mockHelper.sendExternalMessage).not.toHaveBeenCalled();
  });
});
