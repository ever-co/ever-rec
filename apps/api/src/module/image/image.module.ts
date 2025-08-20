import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { ImageService } from './image.service';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { GoogleApis } from 'src/services/googleapis/google.apis';
import { SharedService } from '../../services/shared/shared.service';
import { UniqueViewsSharedService } from 'src/services/shared/uniqueViews.shared.service';
import { ImageController } from './image.controller';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, EditorWebsocketModule, AuthModule],
  providers: [
    ImageService,
    FirebaseClient,
    GoogleApis,
    SharedService,
    FoldersSharedService,
    UniqueViewsSharedService,
  ],
  controllers: [ImageController],
})
export class ImageModule {}
