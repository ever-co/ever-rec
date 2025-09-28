import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MediaModule } from 'src/common/media/media.module';
import { FirebaseModule } from '../firebase';
import { SoundshotController } from './soundshot.controller';
import { SoundshotService } from './soundshot.service';
import { AuthModule } from '../auth/auth.module';
import { FirebaseSoundshotUploader } from './uploader/firebase-soundshot.uploader';
import { GauzySoundshotUploader } from './uploader/gauzy-soundshot.uploader';
import { GauzyModule } from '../gauzy';

@Module({
  imports: [MediaModule, FirebaseModule, AuthModule, GauzyModule],
  controllers: [SoundshotController],
  providers: [
    SoundshotService,
    EventEmitter2,
    FirebaseSoundshotUploader,
    GauzySoundshotUploader,
  ],
  exports: [SoundshotService],
})
export class SoundshotModule {}
