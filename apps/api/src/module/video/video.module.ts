import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { StreamServiceModule } from '../video-services/streamService.module';
import { VideoService } from './video.service';
import { VideoChapterService } from './services/chapter.service';
import { ImageService } from '../image/image.service';
import { FirebaseClient } from '../../services/firebase/firebase.client';
import { GoogleApis } from '../../services/googleapis/google.apis';
import { SharedService } from '../../services/shared/shared.service';
import { UniqueViewsSharedService } from '../../services/shared/uniqueViews.shared.service';
import { VideoController } from './video.controller';
import { VideoChapterController } from './controllers/chapter.controller';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, StreamServiceModule, EditorWebsocketModule, AuthModule],
  providers: [
    VideoService,
    VideoChapterService,
    ImageService,
    FirebaseClient,
    GoogleApis,
    SharedService,
    FoldersSharedService,
    UniqueViewsSharedService,
  ],
  controllers: [VideoController, VideoChapterController],
  exports: [VideoService],
})
export class VideoModule {}
