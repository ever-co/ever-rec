import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { FirebaseClient } from '../../services/firebase/firebase.client';
import { GoogleApis } from '../../services/googleapis/google.apis';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { SharedService } from '../../services/shared/shared.service';
import { UniqueViewsSharedService } from '../../services/shared/uniqueViews.shared.service';
import { AuthModule } from '../auth/auth.module';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';
import { GauzyModule } from '../gauzy';
import { ImageService } from '../image/image.service';
import { StreamServiceModule } from '../video-services/streamService.module';
import { VideoChapterController } from './controllers/chapter.controller';
import { VideoChapterService } from './services/chapter.service';
import { ContextUploader } from './services/uploader/context.uploader';
import { FirebaseVideoUploader } from './services/uploader/firebase-video.upload';
import { GauzyVideoUploader } from './services/uploader/gauzy-video.upload';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

@Module({
  imports: [
    HttpModule,
    StreamServiceModule,
    EditorWebsocketModule,
    AuthModule,
    GauzyModule,
  ],
  providers: [
    VideoService,
    VideoChapterService,
    ImageService,
    FirebaseClient,
    GoogleApis,
    SharedService,
    FoldersSharedService,
    UniqueViewsSharedService,
    ContextUploader,
    FirebaseVideoUploader,
    GauzyVideoUploader,
  ],
  controllers: [VideoController, VideoChapterController],
  exports: [VideoService],
})
export class VideoModule {}
