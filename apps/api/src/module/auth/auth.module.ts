import { Module } from '@nestjs/common';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { GoogleApis } from 'src/services/googleapis/google.apis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SharedService } from '../../services/shared/shared.service';
import { HttpModule } from 'nestjs-http-promise';
import { ImageService } from '../image/image.service';
import { SlackBoltService } from 'src/services/slack/slack-bolt.service';
import { EventSegment } from 'src/event/event.segment';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';

@Module({
  imports: [HttpModule, EditorWebsocketModule],
  providers: [
    AuthService,
    FirebaseClient,
    SharedService,
    GoogleApis,
    SlackBoltService,
    ImageService,
    FoldersSharedService,
    EventSegment,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
