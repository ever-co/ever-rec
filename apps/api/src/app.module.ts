import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './module/admin/admin.module';
import { AtlassianModule } from './module/atlassian/atlassian.module';
import { AuthModule } from './module/auth/auth.module';
import { DriveModule } from './module/drive/drive.module';
import { DropboxModule } from './module/dropbox/dropbox.module';
import { EditorWebsocketModule } from './module/editor-websocket-module/editor-websocket.module';
import { EditorGateway } from './module/editor-websocket-module/editor.gateway';
import { EmailModule } from './module/email/email.module';
import { EverIdModule } from './module/ever-id/ever-id.module';
import { FirebaseModule } from './module/firebase/firebase.module';
import { ImageModule } from './module/image/image.module';
import { LogModule } from './module/log/log.module';
import { MessagesModule } from './module/messages/messages.module';
import { SlackModule } from './module/slack/slack.module';
import { TermsModule } from './module/terms/terms.module';
import { VideoModule } from './module/video/video.module';
import { WhiteboardsModule } from './module/whiteboards/whiteboards.module';
import { WorkspaceModule } from './module/workspace/workspace.module';
import { PipelineModule } from './common/pipeline/pipeline.module';
import { SoundshotModule } from './module/soundshot/soundshot.module';
import { CamshotModule } from './module/camshot/camshot.module';
import { isEverStatsEnabled } from './common/ever-platform/env';
import { EverInstanceModule } from './module/ever-instance/ever-instance.module';
import { EverStatsModule } from './module/ever-stats/ever-stats.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : `.env.dev`,
    }),
    FirebaseModule,
    AdminModule,
    AuthModule,
    EverIdModule,
    TermsModule,
    ImageModule,
    VideoModule,
    LogModule,
    DriveModule,
    DropboxModule,
    EmailModule,
    WorkspaceModule,
    SlackModule,
    MessagesModule,
    AtlassianModule,
    WhiteboardsModule,
    EditorWebsocketModule,
    PipelineModule,
    SoundshotModule,
    CamshotModule,
    // Optional anonymous usage statistics (docs/ever-platform). Read after ConfigModule.forRoot()
    // above has loaded the .env file; only EVER_STATS_ENABLED=false leaves both modules out.
    ...(isEverStatsEnabled() ? [EverInstanceModule] : []),
    ...(isEverStatsEnabled() ? [EverStatsModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EditorGateway,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule { }
