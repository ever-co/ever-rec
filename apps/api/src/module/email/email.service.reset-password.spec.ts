/**
 * `email/reset-password-email` (the portal's forgot-password form), with the real service.
 * Firebase and Postmark are mocked. Each failure gets its own answer: an address with no account
 * gets the same answer as a real send and no mail, so the form does not tell anyone which
 * addresses have accounts; a Google account is told it has no password here; only Firebase's reset
 * limit is called a limit; anything else is a plain "could not send". The log names the error code,
 * never the address.
 */
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { StreamServiceService } from '../video-services/streamService.service';

jest.mock('../video-services/streamService.service', () => ({
  StreamServiceService: class {},
}));
jest.mock('src/services/firebase/firebase.client', () => ({
  FirebaseClient: class {},
}));
jest.mock('firebase/auth', () => ({
  confirmPasswordReset: jest.fn(),
  verifyPasswordResetCode: jest.fn(),
}));

const mockGetUserByEmail = jest.fn();
jest.mock('firebase-admin', () => ({
  auth: () => ({ getUserByEmail: mockGetUserByEmail }),
}));

const mockGeneratePasswordResetLink = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    generatePasswordResetLink: mockGeneratePasswordResetLink,
  }),
}));

const mockSendWithTemplate = jest.fn();
jest.mock('postmark', () => ({
  ServerClient: class {
    sendEmailWithTemplate = mockSendWithTemplate;
  },
}));

/**
 * firebase-admin's own error class, so each error below is the one the SDK builds from Identity
 * Toolkit's answer. The SDK maps no code for the reset limit: it arrives as `auth/internal-error`
 * with the server's code in the message.
 */
const { FirebaseAuthError } = jest.requireActual(
  path.join(
    path.dirname(require.resolve('firebase-admin')),
    'utils',
    'error.js',
  ),
);
const firebaseError = (serverCode: string) =>
  FirebaseAuthError.fromServerError(serverCode, undefined, {
    error: {
      code: 400,
      message: serverCode,
      errors: [{ message: serverCode, domain: 'global', reason: 'invalid' }],
    },
  });

const config: Record<string, string> = {
  POSTMARK_CLIENT_TOKEN: 'postmark-token',
  POSTMARK_SENDER_EMAIL: 'no-reply@rec.test',
  WEBSITE_URL: 'https://rec.test',
};

const EMAIL = 'someone@example.test';
const SENT_MESSAGE = 'Password reset instructions sent. Check your email.';
const LIMIT_MESSAGE = 'Reset password limit exceeded, please try again later.';
const GOOGLE_MESSAGE = 'You cannot change Google account password.';
const FAILED_MESSAGE = 'Could not send the e-mail, please try again later.';

const passwordUser = { providerData: [{ providerId: 'password' }] };
const googleUser = { providerData: [{ providerId: 'google.com' }] };
const firebaseLink =
  'https://rec-test.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=code-1&apiKey=key-1&lang=en';

describe('EmailService.sendResetPasswordEmail', () => {
  let service: EmailService;
  let logged: jest.SpyInstance[];

  beforeEach(() => {
    service = new EmailService(
      {} as FirebaseClient,
      { get: (key: string) => config[key] } as unknown as ConfigService,
      {} as StreamServiceService,
    );
    mockGetUserByEmail.mockReset().mockResolvedValue(passwordUser);
    mockGeneratePasswordResetLink.mockReset().mockResolvedValue(firebaseLink);
    mockSendWithTemplate.mockReset().mockResolvedValue({ ErrorCode: 0 });
    logged = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
    );
  });

  afterEach(() => {
    // Whatever went wrong, the log never names the address that was typed in.
    for (const spy of logged) {
      for (const args of spy.mock.calls) {
        expect(JSON.stringify(args)).not.toContain(EMAIL);
      }
    }
    jest.restoreAllMocks();
  });

  it('mails the reset link to a registered address', async () => {
    const result = await service.sendResetPasswordEmail(EMAIL);

    expect(result).toEqual({
      status: 'success',
      message: SENT_MESSAGE,
      error: null,
      data: null,
    });
    expect(mockSendWithTemplate).toHaveBeenCalledTimes(1);
    expect(mockSendWithTemplate).toHaveBeenCalledWith({
      From: 'no-reply@rec.test',
      To: EMAIL,
      TemplateAlias: 'password-reset',
      TemplateModel: {
        reset_url:
          'https://rec.test/auth/new-password?oobCode=code-1&apiKey=key-1&lang=en',
      },
    });
  });

  it('answers an address with no account exactly like a real send, and mails nothing', async () => {
    const realSend = await service.sendResetPasswordEmail(EMAIL);
    mockSendWithTemplate.mockClear();
    mockGeneratePasswordResetLink.mockClear();
    mockGetUserByEmail.mockRejectedValue(firebaseError('USER_NOT_FOUND'));

    const result = await service.sendResetPasswordEmail(EMAIL);

    expect(result).toEqual(realSend);
    expect(result.status).toBe('success');
    expect(result.message).toBe(SENT_MESSAGE);
    expect(mockGeneratePasswordResetLink).not.toHaveBeenCalled();
    expect(mockSendWithTemplate).not.toHaveBeenCalled();
  });

  it('answers like a real send when the account is gone by the time the link is made', async () => {
    mockGeneratePasswordResetLink.mockRejectedValue(
      firebaseError('EMAIL_NOT_FOUND'),
    );

    const result = await service.sendResetPasswordEmail(EMAIL);

    expect(result).toEqual({
      status: 'success',
      message: SENT_MESSAGE,
      error: null,
      data: null,
    });
    expect(mockSendWithTemplate).not.toHaveBeenCalled();
  });

  it('tells a Google account that its password is not changed here', async () => {
    mockGetUserByEmail.mockResolvedValue(googleUser);

    const result = await service.sendResetPasswordEmail(EMAIL);

    expect(result).toEqual({
      status: 'error',
      message: GOOGLE_MESSAGE,
      error: null,
      data: null,
    });
    expect(mockGeneratePasswordResetLink).not.toHaveBeenCalled();
    expect(mockSendWithTemplate).not.toHaveBeenCalled();
  });

  it('does not call a failed Postmark send a limit, and logs its code', async () => {
    mockSendWithTemplate.mockRejectedValue(
      Object.assign(
        new Error(
          'You tried to send to recipient(s) that have been marked as inactive.',
        ),
        { name: 'InactiveRecipientsError', code: 406, statusCode: 422 },
      ),
    );

    const result = await service.sendResetPasswordEmail(EMAIL);

    expect(result.status).toBe('error');
    expect(result.message).not.toBe(LIMIT_MESSAGE);
    expect(result.message).toBe(FAILED_MESSAGE);
    const warnings = logged[1].mock.calls.map((args) => String(args[0]));
    expect(warnings).toEqual([expect.stringContaining('406')]);
  });

  it('does not call a failed look-up a limit', async () => {
    mockGetUserByEmail.mockRejectedValue(firebaseError('INVALID_EMAIL'));

    const result = await service.sendResetPasswordEmail(EMAIL);

    expect(result.status).toBe('error');
    expect(result.message).toBe(FAILED_MESSAGE);
    expect(mockSendWithTemplate).not.toHaveBeenCalled();
  });

  it.each([
    'RESET_PASSWORD_EXCEED_LIMIT',
    'TOO_MANY_ATTEMPTS_TRY_LATER',
    'QUOTA_EXCEEDED',
  ])('answers the reset limit message for Firebase %s', async (serverCode) => {
    mockGeneratePasswordResetLink.mockRejectedValue(firebaseError(serverCode));

    const result = await service.sendResetPasswordEmail(EMAIL);

    expect(result).toEqual({
      status: 'error',
      message: LIMIT_MESSAGE,
      error: null,
      data: null,
    });
    expect(mockSendWithTemplate).not.toHaveBeenCalled();
  });
});
