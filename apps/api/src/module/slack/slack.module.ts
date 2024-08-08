import { Module } from '@nestjs/common';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { SlackBoltService } from 'src/services/slack/slack-bolt.service';
import { ImageService } from '../image/image.service';
import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';
import { HttpModule } from 'nestjs-http-promise';
import { VideoModule } from '../video/video.module';
import { SharedService } from '../../services/shared/shared.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';

@Module({
  imports: [HttpModule, VideoModule, EditorWebsocketModule],
  providers: [
    SlackService,
    ImageService,
    SlackBoltService,
    FirebaseClient,
    FoldersSharedService,
    SharedService,
  ],
  controllers: [SlackController],
})
export class SlackModule {}
