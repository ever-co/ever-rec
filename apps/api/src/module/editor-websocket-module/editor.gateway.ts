import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/services/tokens/token.service';

/** The room each signed-in socket joins: updates for a user are sent to it only. */
export const userRoom = (uid: string): string => `user:${uid}`;

/** The first non-empty string among the handshake values, else `null`. */
const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value !== '') {
      return value;
    }
  }
  return null;
};

/** The sign-in token of a socket: handshake `auth.token`, else the `idtoken` header. */
const readToken = (client: Socket): string | null =>
  firstString(
    client.handshake?.auth?.token,
    client.handshake?.headers?.idtoken,
  );

/**
 * The refresh token of a socket: handshake `auth.refreshToken`, else the `refreshtoken` or
 * `x-refresh-token` header. The same tokens `AuthGuard` accepts on the HTTP routes.
 */
const readRefreshToken = (client: Socket): string | null =>
  firstString(
    client.handshake?.auth?.refreshToken,
    client.handshake?.headers?.refreshtoken,
    client.handshake?.headers?.['x-refresh-token'],
  );

/** The id of the user a token check attached to `request`, else `null`. */
const userIdOf = (request: { user?: { id?: unknown } }): string | null =>
  firstString(request.user?.id);

@WebSocketGateway()
export class EditorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly tokenService: TokenService) {}

  // Only signed-in sockets stay connected, and each one joins only the room of its own user.
  // Marker updates carry comment text and commenter details, so nothing is sent to all sockets.
  async handleConnection(client: Socket): Promise<void> {
    const uid = await this.signedInUserId(client);
    if (!uid) {
      client.disconnect(true);
      return;
    }

    await client.join(userRoom(uid));
    console.log('Client connected:', client.id);
  }

  /**
   * The user of the socket, checked like `AuthGuard` checks an HTTP request: the ID token first,
   * then the refresh token. The clients keep the ID token they got at sign-in (it expires after an
   * hour) and the HTTP routes accept it with the refresh token, so the socket must too.
   */
  private async signedInUserId(client: Socket): Promise<string | null> {
    const token = readToken(client);
    if (token) {
      const request: { user?: { id?: unknown } } = {};
      try {
        await this.tokenService.processToken(token, request);
        const uid = userIdOf(request);
        if (uid) {
          return uid;
        }
      } catch {
        // Fall through to the refresh token.
      }
    }

    const refreshToken = readRefreshToken(client);
    if (refreshToken) {
      const request: { user?: { id?: unknown } } = {};
      try {
        await this.tokenService.refreshToken(refreshToken, request);
        return userIdOf(request);
      } catch {
        return null;
      }
    }

    return null;
  }

  // Sends the update to the sockets of `recipientUids` only. `uid` is the user who saved it.
  emitMarkerUpdate(
    recipientUids: string[],
    uid: string,
    imageId: string,
    markers: string,
  ): void {
    const rooms = [
      ...new Set(
        (recipientUids ?? []).filter(
          (id): id is string => typeof id === 'string' && id !== '',
        ),
      ),
    ].map(userRoom);
    if (rooms.length === 0) {
      return;
    }

    this.server.to(rooms).emit('markers-updated', {
      uid,
      imageId,
      markers,
    });
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }
}
