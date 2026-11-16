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

/** The sign-in token of a socket: handshake `auth.token`, else the `idtoken` header. */
const readToken = (client: Socket): string | null => {
  const fromAuth = client.handshake?.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth !== '') {
    return fromAuth;
  }
  const fromHeader = client.handshake?.headers?.idtoken;
  if (typeof fromHeader === 'string' && fromHeader !== '') {
    return fromHeader;
  }
  return null;
};

@WebSocketGateway()
export class EditorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly tokenService: TokenService) {}

  // Only signed-in sockets stay connected, and each one joins only the room of its own user.
  // Marker updates carry comment text and commenter details, so nothing is sent to all sockets.
  async handleConnection(client: Socket): Promise<void> {
    const token = readToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const request: { user?: { id?: string } } = {};
    try {
      await this.tokenService.processToken(token, request);
    } catch {
      client.disconnect(true);
      return;
    }

    const uid = request.user?.id;
    if (typeof uid !== 'string' || uid === '') {
      client.disconnect(true);
      return;
    }

    await client.join(userRoom(uid));
    console.log('Client connected:', client.id);
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
