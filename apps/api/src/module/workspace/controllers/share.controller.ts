import {
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IDataResponse } from 'src/interfaces/_types';
import { WorkspaceShareService } from '../services/share.service';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { CanAccessItem } from '../decorators/CanAccessItem.decorator';
import { User } from '../../auth/decorators/user.decorator';
import { AuthGuard, IRequestUser } from '../../auth/guards/auth.guard';
import { ValidateId } from '../pipes/validate-id.pipe';
import { CanAccessWorkspaceGuard } from '../guards/CanAccessWorkspace.guard';

// Membership is checked first: grants left on an item for someone who has since been removed from
// the workspace must not let them create or delete share links.
@Controller('workspace/share')
@UseGuards(AuthGuard, CanAccessWorkspaceGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkspaceShareController {
  constructor(private readonly shareService: WorkspaceShareService) {
    // left blank intentionally
  }

  @CanAccessItem(PermissionAccessEnum.WRITE, 'shared')
  @Get(':workspaceId/:itemId')
  async share(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('itemId', ValidateId) itemId: string,
    @User() user: IRequestUser,
  ): Promise<IDataResponse<string>> {
    return await this.shareService.getShareLink(workspaceId, itemId, user.id);
  }

  @CanAccessItem(PermissionAccessEnum.WRITE, 'shared')
  @Delete('deleteLink/:workspaceId/:itemId')
  async delete(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('itemId', ValidateId) itemId: string,
    @User() user: IRequestUser,
  ): Promise<IDataResponse<string>> {
    return await this.shareService.deleteShareLink(user.id, itemId);
  }
}
