import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { AtlassianApiService } from 'src/services/atlassian/atlassian.api.service';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { SharedService } from 'src/services/shared/shared.service';
import { ImageService } from '../image/image.service';
import { ApiVideoService } from '../video-services/api-video/api-video.service';
import { MuxService } from '../video-services/mux/mux.service';
import { StreamServiceService } from '../video-services/streamService.service';
import { VideoService } from '../video/video.service';
import { AtlassianController } from './atlassian.controller';
import { AtlassianService } from './atlassian.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, EditorWebsocketModule, AuthModule],
  providers: [
    AtlassianService,
    ImageService,
    SharedService,
    MuxService,
    FirebaseClient,
    VideoService,
    MuxService,
    AtlassianApiService,
    ApiVideoService,
    FoldersSharedService,
    StreamServiceService,
  ],
  controllers: [AtlassianController],
})
export class AtlassianModule {}
