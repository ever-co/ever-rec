import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { ApiVideoController } from './api-video.controller';
import { ApiVideoService } from './api-video.service';
import { AuthModule } from '../../../module/auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [ApiVideoController],
  providers: [ApiVideoService],
  exports: [ApiVideoService],
})
export class ApiVideoModule {}
