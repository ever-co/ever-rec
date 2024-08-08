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
import { ImageService } from './image.service';
import { FileInterceptor } from '@nestjs/platform-express';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import {
  queryReturnType,
  SharedService,
} from '../../services/shared/shared.service';
import { UserGuard } from '../auth/guards/user.guard';
import { IDataResponse } from '../../interfaces/_types';
import { IDbFolder } from '../../interfaces/IEditorImage';
import { IUniqueView } from 'src/services/utils/models/shared.model';
import { UniqueViewsSharedService } from 'src/services/shared/uniqueViews.shared.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';

// TODO: add return type on all endpoints

@Controller('image')
export class ImageController {
  constructor(
    private readonly imageService: ImageService,
    private readonly sharedService: SharedService,
    private readonly foldersSharedService: FoldersSharedService,
    private readonly uniqueViewsSharedService: UniqueViewsSharedService,
  ) {}

  // This one is for deleting shared Images AND videos from user when he delets account.
  // Probably can be in a better place but for now will be here.

  @UseGuards(AuthGuard)
  @Delete('remove-shared')
  async removeShared(@Req() req): Promise<any> {
    return await this.sharedService.removeShared(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Get('share/:id')
  async share(@Param('id') id: string, @Req() request): Promise<string> {
    return await this.imageService.share(request.user.id, id);
  }

  @UseGuards(AuthGuard)
  @Delete('deleteLink/:link')
  async delete(
    @Param('link') link: string,
    @Req() request,
  ): Promise<void | { message: string }> {
    try {
      await this.imageService.deleteSharedImageById(request.user.id, link);
    } catch (e) {
      return { message: 'Error while trying to delete image' };
    }
  }

  @UseGuards(AuthGuard)
  @Delete('deleteLinkById/:id')
  async deleteById(@Param('id') id: string, @Req() request): Promise<void> {
    await this.imageService.deleteSharedImageByImageId(request.user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('/api/:link')
  async getImageREST(
    @Param('link') link: string,
    @Req() request,
    @Res() res,
  ): Promise<queryReturnType> {
    const result = await this.sharedService.getItemById(
      'image',
      link,
      request.user?.id,
    );

    return res.send(result);
  }

  @SetMetadata('itemType', 'image')
  @SetMetadata('accessType', 'private')
  @UseGuards(AuthGuard)
  @Delete('/user/:ownerId/:link/comments/:commentId')
  async deleteComment(
    @Param('link') link: string,
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
        'image',
        request.user?.id,
        ownerId,
        link,
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
  @Post('/:userId/comment')
  async postNewComment(
    @Param('userId') userId: string,
    @Req() request,
    @Body() body,
  ) {
    try {
      const { itemId, comment, isPublic, limit } = body;
      return await this.sharedService.addComment(
        'image',
        userId,
        request.user?.id,
        itemId,
        comment,
        isPublic,
        limit,
      );
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
      'image',
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
      'image',
      itemId,
      req.user?.id,
      isPublic,
      ownerId,
      limit,
    );

    return res.send(result);
  }

  @UseGuards(AuthGuard)
  @Post(':linkId/like')
  async like(
    @Req() request,
    @Res() res,
    @Param('linkId') linkId: string,
    @Query('isWorkspace') isWorkspace: boolean,
  ) {
    const sharedImage = await this.sharedService.getSharedItemBySharedId(
      'image',
      linkId,
      isWorkspace,
    );

    const itemId = isWorkspace ? sharedImage?.itemId : sharedImage?.imageId;

    const result = await this.sharedService.likeItem(
      'image',
      itemId,
      sharedImage?.uid,
      request.user?.id,
      sharedImage?.workspaceId,
    );

    res.send(result);
  }

  @UseGuards(AuthGuard)
  @Post('upload')
  async uploadScreenshot(@Req() req, @Body() body) {
    return await this.imageService.uploadScreenshot(
      req.user?.id,
      body.imgBase64,
      body.title,
      body.sourceUrl,
      body.fullFileName,
    );
  }

  @UseGuards(AuthGuard)
  @Post('update-original')
  async updateOriginalScreenshot(@Req() req, @Body() body) {
    return await this.imageService.updateOriginalImageFromBucket(
      req.user?.id,
      body.fullFileName,
      body.fileData,
    );
  }

  @UseGuards(AuthGuard)
  @Get('editor/:id')
  async getEditorImage(@Req() req, @Param('id') id: string) {
    return await this.imageService.getUploadedFileByDbId(req.user?.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('upload/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req,
    @Body() body,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.imageService.uploadFile(
      req.user?.id,
      file,
      body.title,
      body.fullFileName,
      body.folderId,
    );
  }

  @UseGuards(AuthGuard)
  @Post('original')
  async saveOriginalImage(@Req() req, @Body() body) {
    return await this.imageService.saveOriginalImage(
      req.user?.id,
      body.fullFileName,
    );
  }

  @UseGuards(AuthGuard)
  @Get('files/all')
  async getFiles(@Req() req, @Query('folderId') folderId: string) {
    return await this.imageService.getFiles(req.user?.id, folderId, 'get');
  }

  @UseGuards(AuthGuard)
  @Get('folders/all')
  async getFolders(@Req() req): Promise<IDataResponse<IDbFolder[] | null>> {
    return await this.imageService.getAllFolders(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Get('folder/:folderId')
  async getFolderById(
    @Req() req,
    @Param('folderId') folderId: string,
  ): Promise<IDataResponse<IDbFolder | null>> {
    return await this.imageService.getFolderById(req.user?.id, folderId);
  }

  @UseGuards(AuthGuard)
  @Get('single/:id')
  async getImageByIdPrivate(@Req() req, @Param('id') id: string) {
    return await this.imageService.getImageByIdPrivate(req.user?.id, id, 'get');
  }

  @UseGuards(AuthGuard)
  @Put('single')
  @UseInterceptors(FileInterceptor('blob'))
  async updateImage(@Req() req, @Body() body, @UploadedFile() blob: any) {
    return await this.imageService.updateImage(
      req.user?.id,
      blob,
      body.refName,
      body.location,
    );
  }

  @UseGuards(AuthGuard)
  @Put('single-data')
  async updateImageData(@Req() req, @Body() body) {
    return await this.imageService.updateImageData(
      req.user?.id,
      body.id,
      body.parentId,
      body.trash,
      body.likes,
      body.title,
      body.stage,
      body.originalImage,
      body.markers,
    );
  }

  @UseGuards(AuthGuard)
  @Delete('single')
  async deleteImage(
    @Req() req,
    @Query('imageId') imageId: string,
    @Query('refName') refName: string,
  ) {
    return await this.imageService.deleteImage(req.user?.id, imageId, refName);
  }

  @UseGuards(AuthGuard)
  @Delete('all')
  async deleteAllImages(@Req() req, @Body() body) {
    return await this.imageService.deleteAllImages(
      req.user?.id,
      body.trashedImages,
    );
  }

  @UseGuards(AuthGuard)
  @Get('shared/all')
  async getALlShared(@Req() req) {
    return await this.imageService.getAllShared(req.user?.id);
  }

  @Get('shared/single/:sharedId')
  async getSharedImageBySharedId(
    @Req() req,
    @Param('sharedId') sharedId: string,
    @Query('isWorkspace') isWorkspace: boolean,
  ) {
    return await this.imageService.getImageBySharedId(sharedId, isWorkspace);
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
    return await this.imageService.getAllTrashed(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Post('folder')
  async createNewFolder(@Req() req, @Body() body) {
    return await this.imageService.createNewFolder(
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
    return await this.imageService.updateFolderData(
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
  async deleteImageFolders(@Req() req, @Query('folderId') folderId: string) {
    return await this.foldersSharedService.deleteImageVideoFolders(
      req.user?.id,
      folderId,
      'image',
      true,
    );
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
      'image',
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
