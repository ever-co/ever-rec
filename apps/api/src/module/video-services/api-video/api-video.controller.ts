import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/module/auth/guards/auth.guard';
import { ApiVideoService } from './api-video.service';

@Controller('api.video')
export class ApiVideoController {
  constructor(private readonly apiVideoService: ApiVideoService) {}

  @UseGuards(AuthGuard)
  @Get('/direct-upload')
  async getDirectUpload() {
    return this.apiVideoService.getDirectUpload();
  }

  @UseGuards(AuthGuard)
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
