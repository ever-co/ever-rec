import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { GoogleApis } from 'src/services/googleapis/google.apis';
import { SharedModule } from 'src/services/shared/shared.module';
import { UniqueViewsSharedService } from 'src/services/shared/uniqueViews.shared.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { AuthModule } from '../auth/auth.module';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';
import { GauzyModule } from '../gauzy';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { ContextUploader } from './uploader/context.uploader';
import { FirebaseImageUploader } from './uploader/firebase-image.upload';
import { GauzyImageUploader } from './uploader/gauzy-image.upload';

@Module({
  imports: [
    HttpModule,
    EditorWebsocketModule,
    GauzyModule,
    AuthModule,
    SharedModule,
  ],
  providers: [
    ImageService,
    FirebaseClient,
    GoogleApis,
    FoldersSharedService,
    UniqueViewsSharedService,
    FirebaseImageUploader,
    GauzyImageUploader,
    ContextUploader,
  ],
  controllers: [ImageController],
})
export class ImageModule {}
