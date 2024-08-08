import { Module } from '@nestjs/common';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { GoogleApis } from 'src/services/googleapis/google.apis';
import { LogController } from './log.controller';
import { LogService } from './log.service';
import { HttpModule } from 'nestjs-http-promise';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';

@Module({
  imports: [HttpModule],
  providers: [LogService, FirebaseClient, GoogleApis, FoldersSharedService],
  controllers: [LogController],
})
export class LogModule {}
