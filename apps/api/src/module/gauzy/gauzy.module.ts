import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from 'nestjs-http-promise';
import GauzyConfig from './gauzy.config';
import { GauzyAuthService } from './services/gauzy-auth.service';
import { GauzyRestService } from './services/gauzy-rest.service';
import { GauzyUploadAssetService } from './services/gauzy-upload-asset.service';
import { GauzyUserService } from './services/gauzy-user.service';
import { HeaderBuilderService } from './services/header-builder.service';
import { GauzyUploadService } from './services/gauzy-upload.service';

export const GAUZY_AVAILABLE = Symbol('gauzy availability token');

@Module({
  imports: [ConfigModule.forFeature(GauzyConfig), HttpModule],
  providers: [
    GauzyAuthService,
    GauzyRestService,
    GauzyUserService,
    GauzyUploadAssetService,
    HeaderBuilderService,
    GauzyUploadService,
    {
      provide: GAUZY_AVAILABLE,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('gauzy.apiUrl');
        return !!(url && url.trim().length > 0);
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    GauzyRestService,
    GauzyAuthService,
    GauzyUserService,
    GauzyUploadAssetService,
    GauzyUploadService,
    GAUZY_AVAILABLE,
  ],
})
export class GauzyModule {}
