import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { VideoService } from './video.service';
import { SharedService } from '../../services/shared/shared.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { UserGuard } from '../auth/guards/user.guard';
import { IUniqueView } from 'src/services/utils/models/shared.model';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { TMP_PATH } from '../../enums/tmpPathsEnums';
import { fileExtensionMap } from 'src/services/utils/fileExtensionMap';
import { IDataResponse } from 'src/interfaces/_types';
import { UniqueViewsSharedService } from 'src/services/shared/uniqueViews.shared.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';

@Controller('video')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly sharedService: SharedService,
    private readonly foldersSharedService: FoldersSharedService,
    private readonly uniqueViewsSharedService: UniqueViewsSharedService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('share/:id')
  async share(@Param('id') id: string, @Req() request): Promise<string> {
    return await this.videoService.share(request.user?.id, id);
  }

  @UseGuards(AuthGuard)
  @Delete('deleteLink/:link')
  async delete(
    @Param('link') link: string,
    @Req() request,
  ): Promise<void | { message: string }> {
    try {
      return await this.videoService.deleteLink(request.user?.id, link);
    } catch (e) {
      return { message: 'Error while trying to delete video' };
    }
  }

  @UseGuards(AuthGuard)
  @Delete('deleteLinkById/:id')
  async deleteById(@Param('id') id: string, @Req() request): Promise<void> {
    await this.videoService.deleteLinkById(request.user?.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('/api/:link')
  async getVideoAPI(@Param('link') link: string, @Req() request): Promise<any> {
    return await this.sharedService.getItemById(
      'video',
      link,
      request.user?.id,
    );
  }

  @SetMetadata('itemType', 'video')
  @SetMetadata('accessType', 'private')
  @UseGuards(AuthGuard)
  @Delete('/user/:ownerId/:itemId/comments/:commentId')
  async deleteComment(
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
    @Param('ownerId') ownerId: string,
    @Query('limit') limit: string,
    @Query('isPublic') isPublicQuery: string,
    @Req() request,
    @Res() res,
  ) {
    try {
      const isPublic = isPublicQuery === 'true';
      const result = await this.sharedService.deleteComment(
        'video',
        request.user?.id,
        ownerId,
        itemId,
        commentId,
        isPublic,
        limit,
      );
      return res.send(result);
    } catch (e) {
      console.log(e);
      return { message: 'Error while trying to remove comment.' };
    }
  }

  @UseGuards(AuthGuard)
  @Post('/:ownerId/comment')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'comment', maxCount: 1 }]))
  async postNewComment(
    @Param('ownerId') ownerId: string,
    @Req() request,
    @Body() body,
  ) {
    try {
      const { itemId, comment, isPublic, limit } = body;

      const result = await this.sharedService.addComment(
        'video',
        ownerId,
        request.user?.id,
        itemId,
        comment,
        isPublic,
        limit,
      );

      return result;
    } catch (e) {
      console.log(e);
      return e;
    }
  }

  @UseGuards(AuthGuard)
  @Put('/user/:ownerId/:itemId/comment/:commentId')
  async updateComment(
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
    @Param('ownerId') ownerId: string,
    @Req() req,
    @Body() body,
    @Res() res,
  ) {
    const {
      comment,
      limit,
      isPublic,
    }: { comment: string; limit: string | number; isPublic: boolean } = body;

    const result = await this.sharedService.updateCommentAPI(
      'video',
      ownerId,
      itemId,
      commentId,
      comment,
      isPublic,
      limit,
    );

    return res.send(result);
  }

  @UseGuards(UserGuard)
  @Post('/:link/comments')
  async getUpdatedComments(
    @Param('link') itemId: string,
    @Body() body,
    @Req() req,
    @Res() res,
  ) {
    const {
      ownerId,
      limit,
      isPublic,
    }: { ownerId: string | null; limit: string | number; isPublic: boolean } =
      body;

    const result = await this.sharedService.getCommentsById(
      'video',
      itemId,
      req.user?.id,
      isPublic,
      ownerId,
      limit,
    );

    return res.send(result);
  }

  @UseGuards(AuthGuard)
  @Post(':videoId/like-own')
  async likeOwn(
    @Req() request,
    @Param('videoId') videoId: string,
    @Body() body: { workspaceId?: string },
  ) {
    const userId = request.user?.id;
    const workspaceId = body?.workspaceId;

    const result = await this.sharedService.likeItem(
      'video',
      videoId,
      userId,
      userId,
      workspaceId,
    );

    return result;
  }

  @UseGuards(AuthGuard)
  @Post(':sharedId/like')
  async like(
    @Req() request,
    @Param('sharedId') sharedId: string,
    @Query('isWorkspace') isWorkspace: boolean,
  ) {
    const sharedVideo = await this.sharedService.getSharedItemBySharedId(
      'video',
      sharedId,
      isWorkspace,
    );

    const itemId = isWorkspace ? sharedVideo?.itemId : sharedVideo?.videoId;

    const result = await this.sharedService.likeItem(
      'video',
      itemId,
      sharedVideo?.uid,
      request.user?.id,
      sharedVideo?.workspaceId,
    );

    return result;
  }

  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('blob', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          callback(null, TMP_PATH);
        },
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          return cb(null, randomName);
        },
      }),
    }),
  )
  @Post('upload')
  async uploadVideo(
    @Req() req,
    @Body() body,
    @UploadedFile() blob: Express.Multer.File,
  ) {
    const fileExtension = fileExtensionMap[blob.mimetype];

    return await this.videoService.uploadVideo(
      req.user?.id,
      blob,
      body.title,
      body.duration,
      blob.filename + fileExtension,
    );
  }

  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          callback(null, TMP_PATH);
        },
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          return cb(null, randomName);
        },
      }),
    }),
  )
  @Post('upload/file')
  async uploadFile(
    @Req() req,
    @Body() body,
    @UploadedFile() blob: Express.Multer.File,
  ) {
    const fileExtension = fileExtensionMap[blob.mimetype];

    return await this.videoService.uploadVideoFile(
      req.user?.id,
      blob,
      body.title,
      body.duration,
      blob.filename + fileExtension, // fullFilename
      body.folderId,
    );
  }

  @UseGuards(AuthGuard)
  @Get('files/all')
  async getVideoFiles(@Req() req, @Query('folderId') folderId: string) {
    return await this.videoService.getVideoFiles(req.user?.id, folderId);
  }

  @UseGuards(AuthGuard)
  @Get('folders/all')
  async getFolders(@Req() req) {
    return await this.videoService.getVideoFolders(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Get('folder/:folderId')
  async getFolderById(@Req() req, @Param('folderId') folderId: string) {
    return await this.videoService.getFolderById(req.user?.id, folderId);
  }

  @UseGuards(AuthGuard)
  @Get('single/:id')
  async getVideoByIdPrivate(@Req() req, @Param('id') id: string) {
    return await this.videoService.getVideoByIdPrivate(req.user?.id, id, 'get');
  }

  @UseGuards(AuthGuard)
  @Put('single-data')
  @UseInterceptors(FileInterceptor('blob'))
  async updateVideoData(@Req() req, @Body() body, @UploadedFile() blob: any) {
    return await this.videoService.updateVideoData(
      req.user?.id,
      body.id,
      body.parentId,
      body.trash,
      body.likes,
      body.title,
    );
  }

  @UseGuards(AuthGuard)
  @Put('single')
  @UseInterceptors(FileInterceptor('blob'))
  async updateVideo(@Req() req, @UploadedFile() blob: any, @Body() body) {
    return await this.videoService.updateVideo(
      req.user?.id,
      blob,
      body.refName,
    );
  }

  @UseGuards(AuthGuard)
  @Delete('single')
  async deleteVideo(
    @Req() req,
    @Query('id') id: string,
    @Query('refName') refName: string,
  ) {
    return await this.videoService.deleteVideo(req.user?.id, id, refName);
  }

  @UseGuards(AuthGuard)
  @Delete('all')
  async deleteAllVideos(@Req() req, @Body() body) {
    return await this.videoService.deleteAllVideos(
      req.user?.id,
      body.trashedVideos,
    );
  }

  @UseGuards(AuthGuard)
  @Get('shared/all')
  async getALlShared(@Req() req) {
    return await this.videoService.getAllShared(req.user?.id);
  }

  @Get('shared/single/:sharedId')
  async getSharedImageBySharedId(
    @Req() req,
    @Param('sharedId') sharedId: string,
    @Query('isWorkspace') isWorkspace: boolean,
  ) {
    return await this.videoService.getVideoBySharedId(sharedId, isWorkspace);
  }

  @Post('shared/view-info')
  async addUniqueViewInfo(
    @Body() reqBody,
  ): Promise<IDataResponse<{ uniqueViewsDb: IUniqueView[]; views: number }>> {
    return await this.uniqueViewsSharedService.addUniqueView({ ...reqBody });
  }

  @Post('shared/get-view-info')
  async getUniqueViewInfo(
    @Body() reqBody,
  ): Promise<IDataResponse<IUniqueView[]>> {
    return await this.uniqueViewsSharedService.getUniqueView({ ...reqBody });
  }

  @UseGuards(AuthGuard)
  @Get('trashed/all')
  async getAllTrashed(@Req() req) {
    return await this.videoService.getAllTrashed(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Post('folder')
  async createNewFolder(@Req() req, @Body() body) {
    return await this.videoService.createNewFolder(
      req.user?.id,
      body.name,
      body.color,
      body.rootFolderId,
      body.newId,
      body.parentId,
    );
  }

  @UseGuards(AuthGuard)
  @Put('folder')
  async updateFolderData(@Req() req, @Body() body) {
    const { folderId, name, parentId, items, color } = body;
    return await this.videoService.updateVideoFolderData(
      req.user?.id,
      folderId,
      name,
      parentId,
      items,
      color,
    );
  }

  @UseGuards(AuthGuard)
  @Delete('folders')
  async deleteVideoFolders(@Req() req, @Query('folderId') folderId: string) {
    return await this.foldersSharedService.deleteImageVideoFolders(
      req.user?.id,
      folderId,
      'video',
      true,
    );
  }

  @UseGuards(AuthGuard)
  @Get('getPosterRef/:id')
  async poster(
    @Param('id') id: string,
    @Req() request,
  ): Promise<string | false> {
    return await this.videoService.getPoster(request.user?.id, id);
  }

  // TODO: Fix
  @UseGuards(AuthGuard)
  @Post('setPosterRef')
  @UseInterceptors(FileInterceptor('templateBase64'))
  async uploadPoster(
    @Req() req,
    @Body() posterBody,
    @UploadedFile() templateBase64: any,
  ) {
    return await this.videoService.setPoster(req.user?.id, templateBase64, {
      ...posterBody,
    });
  }

  @UseGuards(AuthGuard)
  @Post('folders/:folderId/favorite')
  async addFolderToFavorites(
    @Req() req,
    @Param() param,
    @Body() body: { forceRemove?: boolean },
  ) {
    return await this.foldersSharedService.addRemoveFavFolder(
      req.user.id,
      param.folderId,
      'video',
      undefined,
      body?.forceRemove,
    );
  }

  @UseGuards(AuthGuard)
  @Get('folders/favorite')
  async getFavFolders(@Req() req) {
    return this.foldersSharedService.getUserFavFolders(req.user.id);
  }
}
