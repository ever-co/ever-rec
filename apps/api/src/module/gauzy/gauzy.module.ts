import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { ConfigModule } from '@nestjs/config';
import GauzyConfig from './gauzy.config';
import { GauzyRestService } from './services/gauzy-rest.service';
import { GauzyAuthService } from './services/gauzy-auth.service';

@Module({
  imports: [ConfigModule.forFeature(GauzyConfig), HttpModule],
  providers: [GauzyAuthService, GauzyRestService],
  exports: [GauzyRestService, GauzyAuthService]
})
export class GauzyModule { }
