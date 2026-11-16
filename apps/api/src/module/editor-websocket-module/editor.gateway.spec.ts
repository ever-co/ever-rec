/**
 * The editor websocket used to accept any connection, and `emitMarkerUpdate` sent every markers
 * save (comment text, commenter names and photos) to every connected socket. Now a socket must
 * present a valid sign-in token (handshake `auth.token`, or the `idtoken` header) and joins only
 * its own user room; marker updates go to the rooms of the given recipients, never to everyone.
 */
import { EditorGateway } from './editor.gateway';

describe('EditorGateway', () => {
  const processToken = jest.fn();
  const refreshToken = jest.fn();
  let gateway: EditorGateway;
  let roomEmit: jest.Mock;
  let server: { emit: jest.Mock; to: jest.Mock };

  const client = (
    handshake: {
      auth?: Record<string, unknown>;
      headers?: Record<string, unknown>;
    } = {},
  ) => ({
    id: 'socket-1',
    handshake: { auth: {}, headers: {}, ...handshake },
    join: jest.fn(),
    disconnect: jest.fn(),
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    processToken.mockReset();
    // Like the real TokenService: a valid token attaches the user to the request object.
    processToken.mockImplementation(async (token: string, request: any) => {
      if (token === 'good-token') {
        request.user = { id: 'uid-1' };
        return;
      }
      throw new Error('invalid token');
    });
    refreshToken.mockReset();
    // Like the real TokenService: a valid refresh token attaches the user to the request object.
    refreshToken.mockImplementation(async (token: string, request: any) => {
      if (token === 'good-refresh-token') {
        request.user = { id: 'uid-2' };
        return { idToken: 'new-id-token', refreshToken: token };
      }
      throw new Error('invalid refresh token');
    });
    roomEmit = jest.fn();
    server = { emit: jest.fn(), to: jest.fn(() => ({ emit: roomEmit })) };
    gateway = new EditorGateway({ processToken, refreshToken } as any);
    gateway.server = server as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleConnection', () => {
    it('disconnects a socket that sends no token', async () => {
      const socket = client();
      await gateway.handleConnection(socket as any);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
      expect(processToken).not.toHaveBeenCalled();
    });

    it('disconnects a socket whose token is not valid', async () => {
      const socket = client({ auth: { token: 'forged-token' } });
      await gateway.handleConnection(socket as any);

      expect(processToken).toHaveBeenCalledWith(
        'forged-token',
        expect.any(Object),
      );
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('disconnects a socket when the token resolves to no user', async () => {
      processToken.mockResolvedValue(undefined);
      const socket = client({ auth: { token: 'good-token' } });
      await gateway.handleConnection(socket as any);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('disconnects a socket whose token is not a string', async () => {
      const socket = client({ auth: { token: { id: 'uid-1' } } });
      await gateway.handleConnection(socket as any);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
      expect(processToken).not.toHaveBeenCalled();
    });

    it('joins the room of the signed-in user for a valid handshake auth token', async () => {
      const socket = client({ auth: { token: 'good-token' } });
      await gateway.handleConnection(socket as any);

      expect(processToken).toHaveBeenCalledWith(
        'good-token',
        expect.any(Object),
      );
      expect(socket.join).toHaveBeenCalledTimes(1);
      expect(socket.join).toHaveBeenCalledWith('user:uid-1');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('accepts the token from the idtoken header when the handshake auth has none', async () => {
      const socket = client({ headers: { idtoken: 'good-token' } });
      await gateway.handleConnection(socket as any);

      expect(socket.join).toHaveBeenCalledWith('user:uid-1');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    // The clients keep the ID token of the sign-in, which expires after an hour; the HTTP routes
    // (AuthGuard) then accept the refresh token, so the socket must as well.
    it('falls back to the refresh token when the ID token is refused, like AuthGuard', async () => {
      const socket = client({
        auth: { token: 'expired-token', refreshToken: 'good-refresh-token' },
      });
      await gateway.handleConnection(socket as any);

      expect(refreshToken).toHaveBeenCalledWith(
        'good-refresh-token',
        expect.any(Object),
      );
      expect(socket.join).toHaveBeenCalledTimes(1);
      expect(socket.join).toHaveBeenCalledWith('user:uid-2');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('accepts the refresh token from the refreshtoken header', async () => {
      const socket = client({
        headers: {
          idtoken: 'expired-token',
          refreshtoken: 'good-refresh-token',
        },
      });
      await gateway.handleConnection(socket as any);

      expect(socket.join).toHaveBeenCalledWith('user:uid-2');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('does not use the refresh token when the ID token is valid', async () => {
      const socket = client({
        auth: { token: 'good-token', refreshToken: 'good-refresh-token' },
      });
      await gateway.handleConnection(socket as any);

      expect(refreshToken).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:uid-1');
    });

    it('disconnects when both the ID token and the refresh token are refused', async () => {
      const socket = client({
        auth: { token: 'forged-token', refreshToken: 'forged-refresh-token' },
      });
      await gateway.handleConnection(socket as any);

      expect(refreshToken).toHaveBeenCalledWith(
        'forged-refresh-token',
        expect.any(Object),
      );
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('disconnects when the refresh token resolves to no user', async () => {
      refreshToken.mockResolvedValue({});
      const socket = client({
        auth: { token: 'forged-token', refreshToken: 'good-refresh-token' },
      });
      await gateway.handleConnection(socket as any);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('emitMarkerUpdate', () => {
    it('sends the update only to the rooms of the recipients, never to every socket', () => {
      gateway.emitMarkerUpdate(['uid-1', 'uid-2'], 'uid-1', 'img-1', '[]');

      expect(server.emit).not.toHaveBeenCalled();
      expect(server.to).toHaveBeenCalledTimes(1);
      expect(server.to).toHaveBeenCalledWith(['user:uid-1', 'user:uid-2']);
      expect(roomEmit).toHaveBeenCalledWith('markers-updated', {
        uid: 'uid-1',
        imageId: 'img-1',
        markers: '[]',
      });
    });

    it('names each recipient once and skips empty ids', () => {
      gateway.emitMarkerUpdate(
        ['uid-1', 'uid-1', '', undefined as any, 'uid-2'],
        'uid-1',
        'img-1',
        '[]',
      );

      expect(server.emit).not.toHaveBeenCalled();
      expect(server.to).toHaveBeenCalledWith(['user:uid-1', 'user:uid-2']);
    });

    it('sends nothing when there are no recipients', () => {
      gateway.emitMarkerUpdate([], 'uid-1', 'img-1', '[]');

      expect(server.emit).not.toHaveBeenCalled();
      expect(server.to).not.toHaveBeenCalled();
      expect(roomEmit).not.toHaveBeenCalled();
    });
  });
});
