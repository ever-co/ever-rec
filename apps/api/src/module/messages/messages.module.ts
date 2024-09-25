import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from 'nestjs-http-promise';
import { TwilioModule } from 'nestjs-twilio';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { AuthModule } from '../auth/auth.module';
import { ImageService } from '../image/image.service';
import { VideoModule } from '../video/video.module';
import { SharedService } from 'src/services/shared/shared.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';

@Module({
  imports: [
    AuthModule,
    HttpModule,
    EditorWebsocketModule,
    TwilioModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        accountSid: cfg.get('TWILIO_ACCOUNT_SID'),
        authToken: cfg.get('TWILIO_AUTH_TOKEN'),
      }),
      inject: [ConfigService],
    }),
    VideoModule,
  ],
  providers: [
    MessagesService,
    ImageService,
    SharedService,
    FoldersSharedService,
  ],
  controllers: [MessagesController],
})
export class MessagesModule {}
