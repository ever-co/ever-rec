import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { ConfigModule, ConfigService } from '@nestjs/config';
import GauzyConfig from './gauzy.config';
import { GauzyRestService } from './services/gauzy-rest.service';
import { GauzyAuthService } from './services/gauzy-auth.service';

export const GAUZY_AVAILABLE = Symbol('gauzy availability token');

@Module({
  imports: [ConfigModule.forFeature(GauzyConfig), HttpModule],
  providers: [GauzyAuthService, GauzyRestService,
    {
      provide: GAUZY_AVAILABLE,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('gauzy.apiUrl');
        return !!(url && url.trim().length > 0);
      },
      inject: [ConfigService],
    }
  ],
  exports: [GauzyRestService, GauzyAuthService, GAUZY_AVAILABLE]
})
export class GauzyModule { }
