import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';

@WebSocketGateway()
export class EditorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log('Client connected:', client.id);
  }

  emitMarkerUpdate(uid: string, imageId: string, markers: string): void {
    this.server.emit('markers-updated', {
      uid,
      imageId,
      markers,
    });
  }
  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);
  }
}
