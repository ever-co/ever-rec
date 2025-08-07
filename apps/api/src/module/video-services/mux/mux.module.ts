import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { AuthModule } from '../../../module/auth/auth.module';
import { MuxController } from './mux.controller';
import { MuxService } from './mux.service';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [MuxController],
  providers: [MuxService],
  exports: [MuxService],
})
export class MuxModule {}
