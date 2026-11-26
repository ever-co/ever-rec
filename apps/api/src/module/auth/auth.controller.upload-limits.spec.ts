/**
 * `POST auth/upload-avatar` kept the whole upload in API memory with no cap: any signed-in user
 * could send a file of any size, or any number of 1 MB text fields, and a few such requests ran the
 * API out of memory for every user. `PUT auth/user-data` reads the same file field. Now both cap
 * the file at 10 MB (the cap of the other picture uploads) and the text fields at what the clients
 * send, and a request over a cap is refused (413 or 400) before the service sees it.
 *
 * The routes are the real controller behind the real `AuthGuard` and multer; only the token check
 * and the services are replaced.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SharedService } from '../../services/shared/shared.service';
import { AuthController } from './auth.controller';
import { AuthOrchestratorService } from './services/auth-orchestrator.service';
import { TokenService } from './services/tokens';

jest.mock('./services/tokens', () => ({ TokenService: class TokenService {} }));
jest.mock('./services/auth-orchestrator.service', () => ({
  AuthOrchestratorService: class AuthOrchestratorService {},
}));
jest.mock('../../services/shared/shared.service', () => ({
  SharedService: class SharedService {},
}));

// The web app, the extension and the desktop app send the picture the user picked, as it is.
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
// The most text fields any client sends with one upload (the desktop app sends 11 with a video).
const MAX_FIELDS = 20;
// The longest text field the upload routes take.
const MAX_FIELD_BYTES = 64 * 1024;

describe('AuthController upload limits', () => {
  let app: INestApplication;
  const uploadAvatar = jest.fn();
  const updateUserData = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: TokenService,
          useValue: {
            processToken: async (token: string, req: any) => {
              if (!token.startsWith('uid-')) throw new Error('bad token');
              req.user = { id: token };
            },
          },
        },
        { provide: SharedService, useValue: {} },
        {
          provide: AuthOrchestratorService,
          useValue: { uploadAvatar, updateUserData },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    uploadAvatar
      .mockReset()
      .mockResolvedValue({ status: 'success', data: { photoURL: 'u' } });
    updateUserData.mockReset().mockResolvedValue({ status: 'success' });
  });

  const headers = { Authorization: 'Bearer uid-1', 'x-refresh-token': 'rt' };
  const avatar = (size: number) => ({
    buffer: Buffer.alloc(size, 1),
    options: { filename: 'me.jpg', contentType: 'image/jpeg' },
  });
  const uploadAvatarOf = (size: number) => {
    const { buffer, options } = avatar(size);
    return request(app.getHttpServer())
      .post('/auth/upload-avatar')
      .set(headers)
      .attach('file', buffer, options);
  };

  describe('POST auth/upload-avatar', () => {
    // Multer's parser counts a file that reaches the cap as over it.
    it('stores an avatar just under the cap', async () => {
      await uploadAvatarOf(MAX_AVATAR_BYTES - 1).expect(201);
      expect(uploadAvatar).toHaveBeenCalledTimes(1);
      expect(uploadAvatar.mock.calls[0][0].avatar.size).toBe(
        MAX_AVATAR_BYTES - 1,
      );
    });

    it('refuses an avatar larger than the cap with 413', async () => {
      await uploadAvatarOf(MAX_AVATAR_BYTES + 1).expect(413);
      expect(uploadAvatar).not.toHaveBeenCalled();
    });

    it('refuses more text fields than any client sends with 400', async () => {
      const { buffer, options } = avatar(16);
      const req = Array.from({ length: MAX_FIELDS + 1 }, (_, index) => index)
        .reduce(
          (form, index) => form.field(`junk${index}`, 'x'),
          request(app.getHttpServer()).post('/auth/upload-avatar').set(headers),
        )
        .attach('file', buffer, options);

      const response = await req.expect(400);
      expect(response.body.message).toMatch(/too many fields/i);
      expect(uploadAvatar).not.toHaveBeenCalled();
    });

    it('takes as many text fields as the cap allows', async () => {
      const { buffer, options } = avatar(16);
      await Array.from({ length: MAX_FIELDS }, (_, index) => index)
        .reduce(
          (form, index) => form.field(`field${index}`, 'x'),
          request(app.getHttpServer()).post('/auth/upload-avatar').set(headers),
        )
        .attach('file', buffer, options)
        .expect(201);
      expect(uploadAvatar).toHaveBeenCalledTimes(1);
    });

    it('refuses a text field longer than the cap with 400', async () => {
      const { buffer, options } = avatar(16);
      const response = await request(app.getHttpServer())
        .post('/auth/upload-avatar')
        .set(headers)
        .field('junk', 'x'.repeat(MAX_FIELD_BYTES + 1))
        .attach('file', buffer, options)
        .expect(400);
      expect(response.body.message).toMatch(/field value too long/i);
      expect(uploadAvatar).not.toHaveBeenCalled();
    });

    it('refuses a second file with 400', async () => {
      const { buffer, options } = avatar(16);
      await request(app.getHttpServer())
        .post('/auth/upload-avatar')
        .set(headers)
        .attach('file', buffer, options)
        .attach('file', buffer, options)
        .expect(400);
      expect(uploadAvatar).not.toHaveBeenCalled();
    });

    it('still gives an anonymous request 401', async () => {
      const { buffer, options } = avatar(16);
      await request(app.getHttpServer())
        .post('/auth/upload-avatar')
        .attach('file', buffer, options)
        .expect(401);
      expect(uploadAvatar).not.toHaveBeenCalled();
    });
  });

  describe('PUT auth/user-data', () => {
    it('still takes the JSON the clients send', async () => {
      await request(app.getHttpServer())
        .put('/auth/user-data')
        .set(headers)
        .send({ displayName: 'Me' })
        .expect(200);
      expect(updateUserData).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'uid-1', displayName: 'Me' }),
      );
    });

    it('refuses a file larger than the avatar cap with 413', async () => {
      const { buffer, options } = avatar(MAX_AVATAR_BYTES + 1);
      await request(app.getHttpServer())
        .put('/auth/user-data')
        .set(headers)
        .field('displayName', 'Me')
        .attach('file', buffer, options)
        .expect(413);
      expect(updateUserData).not.toHaveBeenCalled();
    });

    it('refuses more text fields than any client sends with 400', async () => {
      await Array.from({ length: MAX_FIELDS + 1 }, (_, index) => index)
        .reduce(
          (form, index) => form.field(`junk${index}`, 'x'),
          request(app.getHttpServer()).put('/auth/user-data').set(headers),
        )
        .expect(400);
      expect(updateUserData).not.toHaveBeenCalled();
    });
  });
});
