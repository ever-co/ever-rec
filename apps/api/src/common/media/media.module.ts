import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/module/firebase';
import { MediaDbService } from './services/media-db.service';
import { MediaUploadService } from './services/media-upload.service';
import { FirebaseDbStrategy } from './strategies/firebase-db.strategy';
import { FirebaseStorageStrategy } from './strategies/firebase-storage.strategy';

@Module({
  imports: [FirebaseModule],
  providers: [
    FirebaseStorageStrategy,
    MediaDbService,
    MediaUploadService,
    FirebaseDbStrategy,
  ],
  exports: [
    MediaDbService,
    MediaUploadService,
    FirebaseStorageStrategy,
    FirebaseDbStrategy,
  ],
})
export class MediaModule {}
