import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/module/auth/guards/auth.guard';
import { VideoChapterService } from '../services/chapter.service';

@Controller('video/chapter')
export class VideoChapterController {
  constructor(private videoChapterService: VideoChapterService) {}

  @UseGuards(AuthGuard)
  @Get('/:videoId')
  async getChapters(
    @Req() request,
    @Param('videoId') videoId: string,
    @Query('workspaceId') workspaceId: string
  ) {
    return await this.videoChapterService.getChapters(
      request.user?.id,
      videoId,
      workspaceId
    );
  }

  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('blobs'))
  @Post('save-changes/:videoId')
  async saveChapters(
    @Req() request,
    @Param('videoId') videoId: string,
    @Query('workspaceId') workspaceId: string,
    @Body() body: { chapters: string; chaptersBlobs: string },
    @UploadedFiles() thumbnailFiles: Array<Express.Multer.File>
  ) {
    const chapters = JSON.parse(body.chapters);
    const chaptersBlobs = JSON.parse(body.chaptersBlobs);

    return await this.videoChapterService.saveChapters(
      request.user?.id,
      videoId,
      chapters,
      chaptersBlobs,
      thumbnailFiles,
      workspaceId
    );
  }

  @UseGuards(AuthGuard)
  @Post('enable-chapters/:videoId')
  async enableChapters(
    @Req() request,
    @Body() body: { chaptersEnabled: boolean },
    @Param('videoId') videoId: string,
    @Query('workspaceId') workspaceId: string
  ) {
    return await this.videoChapterService.enableChapters(
      request.user?.id,
      videoId,
      body.chaptersEnabled,
      workspaceId
    );
  }

  /*
  @UseGuards(AuthGuard)
  @Post('/:videoId')
  async addChapter(
    @Req() request,
    @Body() body: IAddChapterReqBody,
    @Param('videoId') videoId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return await this.videoChapterService.addChapter(
      request.user?.id,
      videoId,
      body.timestamp,
      body.content,
      workspaceId,
    );
  }

  @UseGuards(AuthGuard)
  @Post('update/:videoId')
  async updateChapter(
    @Req() request,
    @Body() body: IChapter,
    @Param('videoId') videoId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return await this.videoChapterService.updateChapter(
      request.user?.id,
      videoId,
      body.id,
      body.timestamp,
      body.content,
      workspaceId,
    );
  }

  @UseGuards(AuthGuard)
  @Delete('/:videoId/:chapterId')
  async deleteChapter(
    @Req() request,
    @Param('videoId') videoId: string,
    @Param('chapterId') chapterId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return await this.videoChapterService.deleteChapter(
      request.user?.id,
      videoId,
      chapterId,
      workspaceId,
    );
  }
  */
}
