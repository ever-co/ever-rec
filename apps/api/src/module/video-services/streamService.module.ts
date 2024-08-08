import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { SharedService } from '../../services/shared/shared.service';
import { StreamServiceController } from './streamService.controller';
import { StreamServiceService } from './streamService.service';
import { ApiVideoModule } from './api-video/api-video.module';
import { MuxModule } from './mux/mux.module';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';

@Module({
  imports: [HttpModule, MuxModule, ApiVideoModule],
  controllers: [StreamServiceController],
  providers: [StreamServiceService, SharedService, FoldersSharedService],
  exports: [StreamServiceService],
})
export class StreamServiceModule {}
