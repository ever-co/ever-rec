import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EditorGateway } from './editor.gateway';

@Module({
  // TokenService verifies the sign-in token of each socket.
  imports: [AuthModule],
  providers: [EditorGateway],
  exports: [EditorGateway],
})
export class EditorWebsocketModule {}
