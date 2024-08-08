import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard, IRequestUser } from '../../auth/guards/auth.guard';
import { CanAccessWorkspaceGuard } from '../guards/CanAccessWorkspace.guard';
import { WorkspacesService } from '../services/workspace.service';
import { IsWorkspaceAdminGuard } from '../guards/IsWorkspaceAdmin.guard';
import { CanAccessFolder } from '../decorators/CanAccessFolder.decorator';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../../auth/decorators/user.decorator';
import { ValidateId } from '../pipes/validate-id.pipe';
import { CreateWorkspaceDto } from '../dto/workspaces/create-workspace.dto';
import { RenameWorkspaceDto } from '../dto/workspaces/rename-workspace.dto';
import { GetWorkspaceDto } from '../dto/workspaces/get-workspace.dto';

@Controller('workspace')
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {
    // left blank intentionally
  }

  @Get('all')
  async getUserWorkspaces(@User() user: IRequestUser) {
    return this.workspacesService.getUserWorkspaces(user.id);
  }

  @Get('single/:workspaceId')
  @CanAccessFolder(PermissionAccessEnum.READ)
  async getSingleWorkspace(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Query() { folderId }: GetWorkspaceDto,
    @User() user: IRequestUser,
  ) {
    // TODO check folder id exists

    return this.workspacesService.getSingleWorkspace(
      user.id,
      workspaceId,
      folderId,
    );
  }

  @Post('new')
  async createNewWorkspace(
    @Query() query: CreateWorkspaceDto, // TODO should be body
    @User() user: IRequestUser,
  ) {
    return this.workspacesService.createNewWorkspace(
      user.id,
      user.name,
      user.email,
      query.name,
    );
  }

  @Delete(':workspaceId/leave')
  @UseGuards(CanAccessWorkspaceGuard)
  async leaveWorkspace(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser,
  ) {
    return this.workspacesService.leaveWorkspace(user.id, workspaceId);
  }

  @Delete(':workspaceId/delete')
  @UseGuards(IsWorkspaceAdminGuard)
  async deleteWorkspace(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser,
  ) {
    return this.workspacesService.deleteWorkspace(user.id, workspaceId);
  }

  @Put(':workspaceId/name')
  @UseGuards(IsWorkspaceAdminGuard)
  async renameWorkspace(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser,
    @Body() { newName }: RenameWorkspaceDto,
  ) {
    return this.workspacesService.renameWorkspace(
      user.id,
      workspaceId,
      newName,
    );
  }

  @Post(':workspaceId/avatar')
  @UseGuards(IsWorkspaceAdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async changeWorkspaceAvatar(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.workspacesService.changeWorkspaceAvatar(workspaceId, file);
  }

  @Post(':workspaceId/thumbnail')
  @UseGuards(IsWorkspaceAdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async changeWorkspaceThumbnail(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.workspacesService.changeWorkspaceThumbnail(workspaceId, file);
  }
}
