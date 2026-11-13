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
import {
  CanAccessItem,
  ItemMustExist,
} from '../decorators/CanAccessItem.decorator';
import { CanDeleteShareLinkGuard } from '../guards/CanDeleteShareLink.guard';
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

  // An id that is in no item of the workspace must not get a share link record.
  @ItemMustExist()
  @CanAccessItem(PermissionAccessEnum.WRITE, 'shared')
  @Get(':workspaceId/:itemId')
  async share(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('itemId', ValidateId) itemId: string,
    @User() user: IRequestUser,
  ): Promise<IDataResponse<string>> {
    return await this.shareService.getShareLink(workspaceId, itemId, user.id);
  }

  // The clients send the share link id in the `:itemId` slot, so this route checks the link (it must
  // belong to the workspace in the path) and then its item, not an item with that id.
  @UseGuards(CanDeleteShareLinkGuard)
  @Delete('deleteLink/:workspaceId/:itemId')
  async delete(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('itemId', ValidateId) linkId: string,
    @User() user: IRequestUser,
  ): Promise<IDataResponse<string>> {
    return await this.shareService.deleteShareLink(user.id, linkId, workspaceId);
  }
}
