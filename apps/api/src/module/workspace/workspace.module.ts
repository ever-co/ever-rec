import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { ImageModule } from '../image/image.module';
import { ImageService } from '../image/image.service';
import { SharedService } from '../../services/shared/shared.service';
import { WorkspaceUtilitiesService } from './services/utilities.service';
import { WorkspacesService } from './services/workspace.service';
import { WorkspaceFilesService } from './services/files.service';
import { WorkspaceMembersService } from './services/members.service';
import { WorkspaceTeamsService } from './services/teams.service';
import { WorkspaceFoldersService } from './services/folders.service';
import { WorkspacesController } from './controllers/workspaces.controller';
import { WorkspaceMembersController } from './controllers/members.controller';
import { WorkspaceFoldersController } from './controllers/folders.controller';
import { WorkspaceTeamsController } from './controllers/teams.controller';
import { WorkspaceFilesController } from './controllers/files.controller';
import { WorkspaceInvitesService } from './services/invites.service';
import { WorkspaceInvitesController } from './controllers/invites.controller';
import { WorkspaceShareService } from './services/share.service';
import { WorkspaceShareController } from './controllers/share.controller';
import { WorkspacePublicService } from './services/public/public.service';
import { WorkspacePublicController } from './controllers/public/public.controller';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { StreamServiceModule } from '../video-services/streamService.module';
import { WorkspaceSharedService } from './services/shared.service';
import { EditorWebsocketModule } from '../editor-websocket-module/editor-websocket.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    ImageModule,
    StreamServiceModule,
    EditorWebsocketModule,
  ],
  providers: [
    SharedService,
    ImageService,
    FoldersSharedService,
    WorkspaceUtilitiesService,
    WorkspacesService,
    WorkspaceFilesService,
    WorkspaceMembersService,
    WorkspaceTeamsService,
    WorkspaceFoldersService,
    WorkspaceInvitesService,
    WorkspaceShareService,
    WorkspacePublicService,
    WorkspaceSharedService,
  ],
  controllers: [
    WorkspacesController,
    WorkspaceMembersController,
    WorkspaceFoldersController,
    WorkspaceTeamsController,
    WorkspaceFilesController,
    WorkspaceInvitesController,
    WorkspaceShareController,
    WorkspacePublicController,
  ],
  exports: [
    WorkspaceUtilitiesService,
    WorkspacesService,
    WorkspaceFilesService,
    WorkspaceMembersService,
    WorkspaceTeamsService,
    WorkspaceFoldersService,
    WorkspaceInvitesService,
    WorkspaceShareService,
    WorkspaceSharedService,
  ],
})
export class WorkspaceModule {}
