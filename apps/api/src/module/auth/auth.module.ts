import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { EventSegment } from 'src/event/event.segment';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { GoogleApis } from 'src/services/googleapis/google.apis';
import { SlackBoltService } from 'src/services/slack/slack-bolt.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { SharedService } from '../../services/shared/shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';
import { ImageService } from '../image/image.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { TokenService } from './token.service';

@Module({
  imports: [HttpModule, EditorWebsocketModule],
  exports: [AuthService, TokenService, AuthGuard],
  providers: [
    AuthService,
    FirebaseClient,
    SharedService,
    GoogleApis,
    SlackBoltService,
    ImageService,
    FoldersSharedService,
    TokenService,
    EventSegment,
    AuthGuard,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
