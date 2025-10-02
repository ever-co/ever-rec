import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MediaModule } from 'src/common/media/media.module';
import { FirebaseModule } from '../firebase';
import { CamshotController } from './camshot.controller';
import { CamshotService } from './camshot.service';
import { AuthModule } from '../auth/auth.module';
import { FirebaseCamshotUploader } from './uploader/firebase-camshot.uploader';
import { GauzyCamshotUploader } from './uploader/gauzy-camshot.uploader';
import { GauzyModule } from '../gauzy';

@Module({
  imports: [MediaModule, FirebaseModule, AuthModule, GauzyModule],
  controllers: [CamshotController],
  providers: [
    CamshotService,
    EventEmitter2,
    FirebaseCamshotUploader,
    GauzyCamshotUploader,
  ],
  exports: [CamshotService],
})
export class CamshotModule { }
