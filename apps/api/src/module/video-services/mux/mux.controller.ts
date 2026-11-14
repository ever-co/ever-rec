import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { MuxService } from './mux.service';
import { PlaybackStatusEnum } from '../../../enums/StreamingServicesEnums';
import {
  CanAccessWorkspaceQueryGuard,
  WorkspaceVideoAccess,
} from '../../workspace/guards/CanAccessWorkspaceQuery.guard';
import { PermissionAccessEnum } from '../../workspace/Interfaces/Workspace';
import { PlaybackStatusGuard } from '../guards/playback-status.guard';

@Controller('mux')
export class MuxController {
  constructor(private readonly muxService: MuxService) {}

  @UseGuards(AuthGuard)
  @Get('/direct-upload')
  async getDirectUpload() {
    return this.muxService.getDirectUpload();
  }

  @UseGuards(AuthGuard)
  @Get('/uploaded-asset/:uploadId')
  async getUploadedAsset(@Param('uploadId') uploadId: string) {
    return this.muxService.getUploadedAsset(uploadId);
  }

  @UseGuards(AuthGuard, CanAccessWorkspaceQueryGuard, PlaybackStatusGuard)
  @WorkspaceVideoAccess(PermissionAccessEnum.READ)
  @Get('/get-status/:videoId/:assetId')
  async getPlaybackStatus(
    @Req() request,
    @Param('videoId') videoId: string,
    @Param('assetId') assetId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<{
    data: PlaybackStatusEnum;
  }> {
    const uid = request.user?.id;
    return this.muxService.getPlaybackStatus(
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
    return this.muxService.getDownloadStatus(uid, videoId, assetId);
  }
}
