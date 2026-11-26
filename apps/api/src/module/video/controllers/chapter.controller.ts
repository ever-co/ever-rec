import {
  BadRequestException,
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
import { uploadOptions } from 'src/common/multipart/upload-limits';
import { AuthGuard } from 'src/module/auth/guards/auth.guard';
import {
  CanAccessWorkspaceQueryGuard,
  WorkspaceVideoAccess,
} from 'src/module/workspace/guards/CanAccessWorkspaceQuery.guard';
import { PermissionAccessEnum } from 'src/module/workspace/Interfaces/Workspace';
import { ValidateId } from 'src/module/workspace/pipes/validate-id.pipe';
import { VideoChapterService } from '../services/chapter.service';
import { MAX_CHAPTERS, parseChapterList } from '../utilities/chapterPayload';

/**
 * Largest chapter thumbnail, in bytes. The editors send 1000x562 JPEG
 * thumbnails at quality 0.75: even a frame of pure noise makes one of about
 * 320 KB, and a real frame far less.
 */
const MAX_CHAPTER_THUMBNAIL_BYTES = 448 * 1024;

/** Longest of the two chapter lists (`chapters`, `chaptersBlobs`), in bytes. */
const MAX_CHAPTER_LIST_BYTES = 1024 * 1024;

@Controller('video/chapter')
export class VideoChapterController {
  constructor(private videoChapterService: VideoChapterService) {}

  @UseGuards(AuthGuard, CanAccessWorkspaceQueryGuard)
  @WorkspaceVideoAccess(PermissionAccessEnum.READ)
  @Get('/:videoId')
  async getChapters(
    @Req() request,
    @Param('videoId', ValidateId) videoId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return await this.videoChapterService.getChapters(
      request.user?.id,
      videoId,
      workspaceId,
    );
  }

  @UseGuards(AuthGuard, CanAccessWorkspaceQueryGuard)
  @WorkspaceVideoAccess(PermissionAccessEnum.WRITE)
  // Multer keeps the whole save in memory, so the thumbnails and the text
  // fields are capped while they are read: a file that reaches the cap gets a
  // 413, more than MAX_CHAPTERS files or any field but the two lists a 400. One
  // save holds at most about 94 MB.
  @UseInterceptors(
    FilesInterceptor(
      'blobs',
      MAX_CHAPTERS,
      uploadOptions({
        files: MAX_CHAPTERS,
        fileSize: MAX_CHAPTER_THUMBNAIL_BYTES,
        fields: 2,
        fieldSize: MAX_CHAPTER_LIST_BYTES,
      }),
    ),
  )
  @Post('save-changes/:videoId')
  async saveChapters(
    @Req() request,
    @Param('videoId', ValidateId) videoId: string,
    @Query('workspaceId') workspaceId: string,
    @Body() body: { chapters: string; chaptersBlobs: string },
    @UploadedFiles() thumbnailFiles: Array<Express.Multer.File>,
  ) {
    const chapters = parseChapterList(body?.chapters, 'chapters');
    const chaptersBlobs = parseChapterList(
      body?.chaptersBlobs,
      'chaptersBlobs',
    );

    // The service pairs the n-th thumbnail with the n-th entry of
    // chaptersBlobs, so there must be exactly one thumbnail for each entry.
    const thumbnailCount = thumbnailFiles?.length ?? 0;
    if (thumbnailCount !== chaptersBlobs.length) {
      throw new BadRequestException(
        `"blobs" must hold one thumbnail for each entry of "chaptersBlobs" (got ${thumbnailCount} for ${chaptersBlobs.length})`,
      );
    }

    return await this.videoChapterService.saveChapters(
      request.user?.id,
      videoId,
      chapters,
      chaptersBlobs,
      thumbnailFiles,
      workspaceId,
    );
  }

  @UseGuards(AuthGuard, CanAccessWorkspaceQueryGuard)
  @WorkspaceVideoAccess(PermissionAccessEnum.WRITE)
  @Post('enable-chapters/:videoId')
  async enableChapters(
    @Req() request,
    @Body() body: { chaptersEnabled: boolean },
    @Param('videoId', ValidateId) videoId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return await this.videoChapterService.enableChapters(
      request.user?.id,
      videoId,
      body.chaptersEnabled,
      workspaceId,
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
