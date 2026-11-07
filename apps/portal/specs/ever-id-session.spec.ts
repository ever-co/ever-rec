jest.mock('misc/_helper', () => ({
  sendExternalMessage: jest.fn(),
  storeUserTokens: jest.fn(),
  handleResponse: jest.fn(),
  parseUserData: jest.fn(() => ({})),
  getUserTokens: jest.fn(),
}));
jest.mock('app/services/api/email', () => ({
  sendWelcomeEmailAPI: jest.fn(),
  sendEmailResetPasswordAPI: jest.fn(),
  newPasswordAPI: jest.fn(),
  verifyPasswordResetCodeAPI: jest.fn(),
}));
jest.mock('app/services/api/everId', () => ({ exchangeEverIdCodeAPI: jest.fn() }));

import * as helper from 'misc/_helper';
import * as email from 'app/services/api/email';
import * as everIdApi from 'app/services/api/everId';
import { everIdAuthorization } from 'app/services/auth';

const mockHelper = helper as jest.Mocked<typeof helper>;
const mockEmail = email as jest.Mocked<typeof email>;
const mockEverIdApi = everIdApi as jest.Mocked<typeof everIdApi>;

describe('everIdAuthorization', () => {
  const session = {
    id: 'uid-1',
    idToken: 'firebase-id-token',
    refreshToken: 'reference-token',
    email: 'person@example.test',
    isNewUser: true,
  };

  beforeEach(() => jest.clearAllMocks());

  it('stores the session like a Google sign-in and hands it to the extension', async () => {
    mockEverIdApi.exchangeEverIdCodeAPI.mockResolvedValue({ status: 'success', message: 'Success!', error: null, data: session } as any);

    const result = await everIdAuthorization('code-1');

    expect(result.status).toBe('success');
    expect(mockEverIdApi.exchangeEverIdCodeAPI).toHaveBeenCalledWith('code-1');
    expect(mockHelper.sendExternalMessage).toHaveBeenCalledWith('signIn', session);
    expect(mockHelper.storeUserTokens).toHaveBeenCalledWith(session);
    expect(mockEmail.sendWelcomeEmailAPI).toHaveBeenCalledWith('person@example.test');
  });

  it('sends no welcome e-mail for an existing account', async () => {
    mockEverIdApi.exchangeEverIdCodeAPI.mockResolvedValue({ status: 'success', data: { ...session, isNewUser: false } } as any);
    await everIdAuthorization('code-2');
    expect(mockHelper.sendExternalMessage).toHaveBeenCalledWith('signIn', expect.objectContaining({ id: 'uid-1' }));
    expect(mockEmail.sendWelcomeEmailAPI).not.toHaveBeenCalled();
  });

  it('stores nothing when the exchange fails', async () => {
    mockEverIdApi.exchangeEverIdCodeAPI.mockResolvedValue({ status: 'error', data: null } as any);
    await everIdAuthorization('code-3');
    expect(mockHelper.sendExternalMessage).not.toHaveBeenCalled();
    expect(mockHelper.storeUserTokens).not.toHaveBeenCalled();
  });
});
