import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { SharedService } from '../../services/shared/shared.service';
import { AuthModule } from '../auth/auth.module';
import { ApiVideoModule } from './api-video/api-video.module';
import { MuxModule } from './mux/mux.module';
import { StreamServiceController } from './streamService.controller';
import { StreamServiceService } from './streamService.service';

@Module({
  imports: [HttpModule, MuxModule, ApiVideoModule, AuthModule],
  controllers: [StreamServiceController],
  providers: [StreamServiceService, SharedService, FoldersSharedService],
  exports: [StreamServiceService],
})
export class StreamServiceModule {}
