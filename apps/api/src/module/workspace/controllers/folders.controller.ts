import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard, IRequestUser } from '../../auth/guards/auth.guard';
import { WorkspaceFoldersService } from '../services/folders.service';
import { CanAccessWorkspaceGuard } from '../guards/CanAccessWorkspace.guard';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { CanAccessFolder } from '../decorators/CanAccessFolder.decorator';
import { CanChangePermissions } from '../decorators/CanChangePermissions.decorator';
import { WorkspaceSharedService } from '../services/shared.service';
import { User } from '../../auth/decorators/user.decorator';
import { CreateFolderDto } from '../dto/folders/create-folder.dto';
import { ParseOptionalId, ValidateId } from '../pipes/validate-id.pipe';
import { UpdateFolderDto } from '../dto/folders/update-folder.dto';
import { DeleteFolderDto } from '../dto/folders/delete-folder.dto';
import { MoveItemsDto } from '../dto/folders/move-items.dto';
import { MoveFolderDto } from '../dto/folders/move-folder.dto';
import { CanAccessDestinationFolder } from '../decorators/CanAccessDestinationFolder.decorator';
import { UpdateFolderMemberPermissionsDto } from '../dto/folders/update-member-permissions.dto';

@Controller('workspace/:workspaceId/folders')
@UseGuards(AuthGuard, CanAccessWorkspaceGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkspaceFoldersController {
  constructor(
    private readonly foldersService: WorkspaceFoldersService,
    private readonly foldersSharedService: FoldersSharedService,
    private readonly workspaceSharedService: WorkspaceSharedService,
  ) {
    // left blank intentionally
  }

  @Post()
  async createWorkspaceFolder(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Body() body: CreateFolderDto,
    @User() user: IRequestUser,
  ) {
    return this.foldersService.createWorkspaceFolder(
      user.id,
      workspaceId,
      body.name,
      body.color,
      body.nestLevel,
      body.parentId,
    );
  }

  @CanAccessFolder(PermissionAccessEnum.WRITE)
  @Put(':folderId')
  async updateWorkspaceFolderData(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('folderId', ValidateId) folderId: string,
    @Body() { folder }: UpdateFolderDto,
    @User() user: IRequestUser,
  ) {
    return this.foldersService.updateFolderData(
      user.id,
      workspaceId,
      folderId,
      { name: folder.name, color: folder.color },
    );
  }

  // WRITE on the folder being moved (and every folder above it) and on the destination.
  @CanAccessFolder(PermissionAccessEnum.WRITE)
  @CanAccessDestinationFolder(PermissionAccessEnum.WRITE)
  @Put(':folderId/move')
  async moveWorkspaceFolder(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('folderId', ValidateId) folderId: string,
    @Body() { parentId }: MoveFolderDto,
  ) {
    return this.foldersService.moveFolder(workspaceId, folderId, parentId);
  }

  @CanAccessFolder(PermissionAccessEnum.WRITE)
  @Delete(':folderId')
  async deleteWorkspaceFolder(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('folderId', ValidateId) folderId: string,
    @Query() { currentFolderId }: DeleteFolderDto,
    @User() user: IRequestUser,
  ) {
    return this.foldersService.deleteFolder(
      user.id,
      workspaceId,
      folderId,
      currentFolderId,
    );
  }

  @CanAccessFolder(PermissionAccessEnum.WRITE)
  @Put(':folderId/move-items')
  async moveItemsToFolder(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('folderId', ParseOptionalId) toMoveFolderId: string | false,
    @Body() { itemIds }: MoveItemsDto,
    @User() user: IRequestUser,
  ) {
    // The body's `fromFolderId` is not used: each item moves out of the folder it is stored in.
    return this.foldersService.moveItemsToFolder(
      user,
      workspaceId,
      itemIds,
      toMoveFolderId,
    );
  }

  @Post(':folderId/favorite')
  @CanAccessFolder(PermissionAccessEnum.READ)
  async addFolderToFavorites(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('folderId', ValidateId) folderId: string,
    @User() user: IRequestUser,
  ) {
    return this.foldersSharedService.addRemoveFavFolder(
      user.id,
      folderId,
      undefined,
      workspaceId,
    );
  }

  @Post(':folderId/permissions')
  @CanChangePermissions('folder')
  async changeFolderMemberPermission(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('folderId', ValidateId) folderId: string,
    @Body() body: UpdateFolderMemberPermissionsDto,
  ) {
    return await this.workspaceSharedService.updatePermissions(
      body.id,
      workspaceId,
      folderId,
      body.permissionItemType,
      body.write,
      body.read,
      body.permissionType,
    );
  }
}
