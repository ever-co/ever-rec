import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { MuxController } from './mux.controller';
import { MuxService } from './mux.service';

@Module({
  imports: [HttpModule],
  controllers: [MuxController],
  providers: [MuxService],
  exports: [MuxService],
})
export class MuxModule {}
