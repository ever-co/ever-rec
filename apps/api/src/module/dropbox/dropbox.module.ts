import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { FirebaseClient } from '../../services/firebase/firebase.client';
import { SharedService } from '../../services/shared/shared.service';
import { ImageService } from '../image/image.service';
import { VideoModule } from '../video/video.module';
import { DropboxController } from './dropbox.controller';
import { DropboxService } from './dropbox.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, VideoModule, EditorWebsocketModule, AuthModule],
  providers: [
    DropboxService,
    ImageService,
    FirebaseClient,
    SharedService,
    FoldersSharedService,
  ],
  controllers: [DropboxController],
})
export class DropboxModule {}
