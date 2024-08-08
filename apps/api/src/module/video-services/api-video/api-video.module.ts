import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { ApiVideoController } from './api-video.controller';
import { ApiVideoService } from './api-video.service';

@Module({
  imports: [HttpModule],
  controllers: [ApiVideoController],
  providers: [ApiVideoService],
  exports: [ApiVideoService],
})
export class ApiVideoModule {}
