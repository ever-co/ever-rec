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
import { CanChangePermissions } from '../decorators/CanChangePermissions.decorator';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import {
  CanAccessItem,
  ItemByFileName,
  ItemMustExist,
} from '../decorators/CanAccessItem.decorator';
import { NamedImageWrite } from '../decorators/NamedImageWrite.decorator';
import {
  CHECKED_IMAGE_FILE_NAME,
  NamedImageWriteInterceptor,
} from '../interceptors/NamedImageWrite.interceptor';
import { getPersonalImageFileName } from '../guards/utils';
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

  // The copy is stored under the personal image's file name: refused when that name already
  // belongs to a workspace image the caller may not write. A folder id in the query is read by
  // the folder guard.
  @Post('image/add-from-personal')
  @CanAccessFolder(PermissionAccessEnum.WRITE)
  @NamedImageWrite({ fileName: getPersonalImageFileName, nameOptional: true })
  @UseInterceptors(NamedImageWriteInterceptor)
  async addImageToWorkspaceFromPersonal(
    @Req() req,
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser,
    @Query() { itemId, folderId }: MovePersonalItemDto,
  ) {
    // The personal image's name was read and checked before the handler ran; the copy must use
    // that same name, or the check would not apply to what is written.
    return this.filesService.moveItemFromPersonalToWorkspace(
      user.id,
      workspaceId,
      itemId,
      'image',
      folderId,
      req[CHECKED_IMAGE_FILE_NAME] ?? null,
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

  // Writes the file and its original under `fullFileName`: refused when that name already belongs
  // to a workspace image the caller may not write. The body (multipart) is only parsed by the file
  // interceptor, so the folder in the body is checked by the interceptor after it.
  @Post('image')
  @CanAccessFolder(PermissionAccessEnum.WRITE)
  @NamedImageWrite({
    fileName: (req) => req.body?.fullFileName,
    checkBodyFolder: true,
  })
  @UseInterceptors(FileInterceptor('file'), NamedImageWriteInterceptor)
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
  @ItemByFileName()
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
    @Query() { imageId, folderId }: DeleteImageDto,
  ) {
    const parentFolderId =
      folderId === 'false' || folderId === undefined ? false : folderId;

    // `refName` in the query is accepted for older clients but not used: the files to delete are
    // the ones recorded for `imageId`, the image the guard checked.
    return await this.filesService.deleteImage(
      workspaceId,
      imageId,
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
  @ItemMustExist()
  @CanAccessDestinationFolder(PermissionAccessEnum.WRITE)
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
  @ItemMustExist()
  @CanAccessDestinationFolder(PermissionAccessEnum.WRITE)
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

  // Replaces the file of the image stored under `refName` (or `location`). The image is resolved
  // from that name only, never from an id in the query, and must exist in this workspace.
  @Put('image')
  @NamedImageWrite({
    fileName: (req) =>
      req.body?.refName ? req.body.refName : req.body?.location,
    mustExist: true,
  })
  @UseInterceptors(FileInterceptor('blob'), NamedImageWriteInterceptor)
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
  @CanChangePermissions('item')
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
