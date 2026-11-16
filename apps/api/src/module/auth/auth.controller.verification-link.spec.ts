/**
 * `generate-email-verification-link` and `resend-verification-email` used to be open to anyone
 * and answered with the Firebase action link (whose one-time code marks the address verified).
 * Now both need a session whose email is the requested one, send the mail, and never return a
 * link, with the same answer for verified and unverified addresses.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthOrchestratorService } from './services/auth-orchestrator.service';
import { EmailService } from './services/email.service';
import { TokenService } from './services/tokens';
import { SharedService } from '../../services/shared/shared.service';

jest.mock('./services/tokens', () => ({ TokenService: class TokenService {} }));
jest.mock('./services/auth-orchestrator.service', () => ({
  AuthOrchestratorService: class AuthOrchestratorService {},
}));
jest.mock('../../services/shared/shared.service', () => ({
  SharedService: class SharedService {},
}));
jest.mock('../firebase/services/firebase-auth.service', () => ({
  FirebaseAuthService: class FirebaseAuthService {},
}));
jest.mock('./services/user.service', () => ({
  UserService: class UserService {},
}));
jest.mock('./services/password-reset/password-reset.strategy', () => ({
  PASSWORD_RESET_EMAIL_STRATEGY: 'PASSWORD_RESET_EMAIL_STRATEGY',
}));

const OWN_EMAIL = 'me@example.com';
const OTHER_EMAIL = 'victim@example.com';
const LINK =
  'https://example.test/__/auth/action?mode=verifyEmail&oobCode=secret';

const ROUTES = [
  '/auth/generate-email-verification-link',
  '/auth/resend-verification-email',
];

describe('verification mail routes', () => {
  let app: INestApplication;
  const sendVerificationEmail = jest.fn();
  const getUserByEmail = jest.fn();
  const processToken = jest.fn();
  const refreshToken = jest.fn();

  beforeAll(async () => {
    const emailService = new EmailService(
      {} as any,
      { sendVerificationEmail } as any,
      { getUserByEmail } as any,
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: TokenService, useValue: { processToken, refreshToken } },
        { provide: SharedService, useValue: {} },
        {
          provide: AuthOrchestratorService,
          useValue: {
            generateEmailVerificationLink: (email: string, idToken: string) =>
              emailService.generateEmailVerificationLink(email, idToken),
            resendVerificationEmail: (email: string, idToken: string) =>
              emailService.resendVerificationEmail(email, idToken),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    processToken.mockImplementation(async (token: string, req: any) => {
      if (token !== 'good-token') throw new Error('invalid token');
      req.user = { id: 'uid-me', email: OWN_EMAIL };
    });
    refreshToken.mockRejectedValue(new Error('no refresh'));
    getUserByEmail.mockResolvedValue({ emailVerified: false });
    sendVerificationEmail.mockResolvedValue({ success: true, data: {} });
  });

  describe.each(ROUTES)('POST %s', (route) => {
    it('rejects a request without a session', async () => {
      const res = await request(app.getHttpServer())
        .post(route)
        .send({ email: OTHER_EMAIL });

      expect(res.status).toBe(401);
      expect(res.body.data?.link).toBeUndefined();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('rejects a session for another email', async () => {
      const res = await request(app.getHttpServer())
        .post(route)
        .set('idtoken', 'good-token')
        .send({ email: OTHER_EMAIL });

      expect(res.status).toBe(400);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('sends the mail for the caller own email and returns no link', async () => {
      // A link in the service result must never reach the response.
      sendVerificationEmail.mockResolvedValue({
        success: true,
        data: { link: LINK },
      });

      const res = await request(app.getHttpServer())
        .post(route)
        .set('idtoken', 'good-token')
        .send({ email: OWN_EMAIL });

      expect(res.status).toBe(201);
      expect(JSON.stringify(res.body)).not.toContain('link');
      expect(JSON.stringify(res.body)).not.toContain('oobCode');
      expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(sendVerificationEmail).toHaveBeenCalledWith('good-token');
    });

    it('accepts the bearer token form', async () => {
      const res = await request(app.getHttpServer())
        .post(route)
        .set('Authorization', 'Bearer good-token')
        .send({ email: OWN_EMAIL });

      expect(res.status).toBe(201);
      expect(sendVerificationEmail).toHaveBeenCalledWith('good-token');
    });

    it('answers the same for an already verified address, without sending', async () => {
      const unverified = await request(app.getHttpServer())
        .post(route)
        .set('idtoken', 'good-token')
        .send({ email: OWN_EMAIL });

      getUserByEmail.mockResolvedValue({ emailVerified: true });
      sendVerificationEmail.mockClear();

      const verified = await request(app.getHttpServer())
        .post(route)
        .set('idtoken', 'good-token')
        .send({ email: OWN_EMAIL });

      expect(verified.status).toBe(unverified.status);
      expect(verified.body).toEqual(unverified.body);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
