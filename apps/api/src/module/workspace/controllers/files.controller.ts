import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';

import { TMP_PATH } from '../../../enums/tmpPathsEnums';
import { WorkspaceFilesService } from '../services/files.service';
import { CanAccessFolder } from '../decorators/CanAccessFolder.decorator';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { CanAccessItem } from '../decorators/CanAccessItem.decorator';
import { WorkspaceSharedService } from '../services/shared.service';
import { AuthGuard, IRequestUser } from '../../auth/guards/auth.guard';
import { CanAccessWorkspaceGuard } from '../guards/CanAccessWorkspace.guard';
import { User } from '../../auth/decorators/user.decorator';
import { UploadVideoDto } from '../dto/files/upload-video.dto';
import { UploadImageDto } from '../dto/files/upload-image.dto';
import { UpdateItemDataDto } from '../dto/files/update-item-data.dto';
import { UpdateImageDto } from '../dto/files/update-image.dto';
import { MovePersonalItemDto } from '../dto/files/move-personal-item.dto';
import { DeleteImageDto } from '../dto/files/delete-image.dto';
import { DeleteVideoDto } from '../dto/files/delete-video.dto';
import { UpdateFileMemberPermissionsDto } from '../dto/files/update-member-permissions.dto';
import { ValidateId } from '../pipes/validate-id.pipe';

@Controller('workspace/:workspaceId/files')
@UseGuards(AuthGuard, CanAccessWorkspaceGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkspaceFilesController {
  constructor(
    private readonly filesService: WorkspaceFilesService,
    private readonly workspaceSharedService: WorkspaceSharedService,
  ) {
    // left blank intentionally
  }

  @Post('video/add-from-personal')
  @CanAccessFolder(PermissionAccessEnum.WRITE)
  async addVideoToWorkspaceFromPersonal(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser,
    @Query() { itemId, folderId }: MovePersonalItemDto,
  ) {
    return this.filesService.moveItemFromPersonalToWorkspace(
      user.id,
      workspaceId,
      itemId,
      'video',
      folderId,
    );
  }

  @Post('image/add-from-personal')
  @CanAccessFolder(PermissionAccessEnum.WRITE)
  async addImageToWorkspaceFromPersonal(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser,
    @Query() { itemId, folderId }: MovePersonalItemDto,
  ) {
    return this.filesService.moveItemFromPersonalToWorkspace(
      user.id,
      workspaceId,
      itemId,
      'image',
      folderId,
    );
  }

  @Get('image/:imageId')
  @CanAccessItem(PermissionAccessEnum.READ, 'image')
  async getWorkspaceImage(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('imageId', ValidateId) imageId: string,
  ) {
    return this.filesService.getImage(workspaceId, imageId);
  }

  @Get('video/:videoId')
  @CanAccessItem(PermissionAccessEnum.READ, 'video')
  async getWorkspaceVideo(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('videoId', ValidateId) videoId: string,
  ) {
    return this.filesService.getVideo(workspaceId, videoId);
  }

  @Post('video')
  @CanAccessFolder(PermissionAccessEnum.WRITE)
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
  async uploadNewVideoFromFile(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Body() uploadVideo: UploadVideoDto,
    @UploadedFile() file: Express.Multer.File,
    @User() user: IRequestUser,
  ) {
    return this.filesService.addVideoFromFile(
      user.id,
      workspaceId,
      file,
      uploadVideo.title,
      uploadVideo.fullFileName,
      uploadVideo.folderId,
    );
  }

  @Post('image')
  @CanAccessFolder(PermissionAccessEnum.WRITE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadNewImageFromFile(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Body() updateImage: UploadImageDto,
    @UploadedFile() file: Express.Multer.File,
    @User() user: IRequestUser,
  ) {
    return this.filesService.addImageFromFile(
      user.id,
      workspaceId,
      file,
      updateImage.title,
      updateImage.fullFileName,
      updateImage.folderId,
    );
  }

  @CanAccessItem(PermissionAccessEnum.WRITE, 'image')
  @Post(':workspaceId/save-original')
  async saveOriginalWorkspaceImage(
    @Param('workspaceId') workspaceId: string,
    @Body() body,
  ) {
    return this.filesService.saveOriginalWSImage(
      workspaceId,
      body.fullFileName,
    );
  }

  @Delete('image/single')
  @CanAccessItem(PermissionAccessEnum.WRITE, 'image')
  async deleteImage(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Query() { imageId, refName: filename, folderId }: DeleteImageDto,
  ) {
    const parentFolderId =
      folderId === 'false' || folderId === undefined ? false : folderId;

    return await this.filesService.deleteImage(
      workspaceId,
      imageId,
      filename,
      parentFolderId,
    );
  }

  @Delete('video/single')
  @CanAccessItem(PermissionAccessEnum.WRITE, 'video')
  async deleteVideo(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Query() { videoId, refName }: DeleteVideoDto,
  ) {
    return await this.filesService.deleteVideo(workspaceId, videoId, refName);
  }

  @Put('image/:imageId/single-data')
  @CanAccessItem(PermissionAccessEnum.WRITE, 'image')
  async updateItemDataImage(
    @Req() req,
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('imageId', ValidateId) imageId: string,
    @Body() body: UpdateItemDataDto,
  ) {
    return await this.filesService.updateItemData(
      req.user?.id,
      workspaceId,
      'image',
      imageId,
      body.parentId,
      body.trash,
      body.likes,
      body.title,
      body.stage,
      body.originalImage,
      body.markers,
    );
  }

  @Put('video/:videoId/single-data')
  @CanAccessItem(PermissionAccessEnum.WRITE, 'video')
  async updateItemDataVideo(
    @Req() req,
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('videoId', ValidateId) videoId: string,
    @Body() body: UpdateItemDataDto,
  ) {
    return await this.filesService.updateItemData(
      req.user?.id,
      workspaceId,
      'video',
      videoId,
      body.parentId,
      body.trash,
      body.likes,
      body.title,
    );
  }

  @Put('image')
  @CanAccessItem(PermissionAccessEnum.WRITE, 'image')
  @UseInterceptors(FileInterceptor('blob'))
  async updateWorkspaceImage(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Body() body: UpdateImageDto,
    @UploadedFile() blob: Express.Multer.File,
  ) {
    if (body.refName === undefined && body.location === undefined) {
      throw new BadRequestException(
        'Either refName or location should be passed in body',
      );
    }

    return await this.filesService.updateImage(
      workspaceId,
      blob,
      body.refName,
      body.location,
    );
  }

  @Post(':itemId/permissions')
  @CanAccessFolder(PermissionAccessEnum.ADMIN)
  async updateFilePermissions(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('itemId', ValidateId) itemId: string,
    @Body() body: UpdateFileMemberPermissionsDto,
  ) {
    return await this.workspaceSharedService.updatePermissions(
      body.id,
      workspaceId,
      itemId,
      body.permissionItemType,
      body.write,
      body.read,
      body.permissionType,
    );
  }
}
