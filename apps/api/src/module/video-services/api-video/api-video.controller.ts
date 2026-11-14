import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/module/auth/guards/auth.guard';
import { ApiVideoService } from './api-video.service';
import {
  CanAccessWorkspaceQueryGuard,
  WorkspaceVideoAccess,
} from '../../workspace/guards/CanAccessWorkspaceQuery.guard';
import { PermissionAccessEnum } from '../../workspace/Interfaces/Workspace';
import { PlaybackStatusGuard } from '../guards/playback-status.guard';

@Controller('api.video')
export class ApiVideoController {
  constructor(private readonly apiVideoService: ApiVideoService) {}

  @UseGuards(AuthGuard)
  @Get('/direct-upload')
  async getDirectUpload() {
    return this.apiVideoService.getDirectUpload();
  }

  @UseGuards(AuthGuard, CanAccessWorkspaceQueryGuard, PlaybackStatusGuard)
  @WorkspaceVideoAccess(PermissionAccessEnum.READ)
  @Get('/get-status/:videoId/:assetId')
  async getPlaybackStatus(
    @Req() request,
    @Param('videoId') videoId: string,
    @Param('assetId') assetId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    const uid = request.user?.id;
    return this.apiVideoService.getPlaybackStatus(
      uid,
      videoId,
      assetId,
      workspaceId,
    );
  }

  @UseGuards(AuthGuard)
  @Get('/get-status-download/:videoId/:assetId')
  async getDownloadStatus(
    @Req() request,
    @Param('videoId') videoId: string,
    @Param('assetId') assetId: string,
  ) {
    const uid = request.user?.id;
    return this.apiVideoService.getDownloadStatus(uid, videoId, assetId);
  }
}
