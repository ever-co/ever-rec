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
import { CanDeleteShareLinkGuard } from '../guards/CanDeleteShareLink.guard';
import { CanShareItemGuard } from '../guards/CanShareItem.guard';
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

  // An id that is in no item of the workspace must not get a share link record. The item is read
  // from the path only: a `?itemId=` in the query must neither stand in for a missing item nor
  // move the permission check to another item. The guard checks existence, WRITE on the item and
  // WRITE on its folder, so the query-reading item decorators are not used here.
  @UseGuards(CanShareItemGuard)
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
    return await this.shareService.deleteShareLink(
      user.id,
      linkId,
      workspaceId,
    );
  }
}
