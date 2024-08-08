import {
  Controller,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard, IRequestUser } from 'src/module/auth/guards/auth.guard';
import { IsWorkspaceAdminGuard } from '../guards/IsWorkspaceAdmin.guard';
import { WorkspaceInvitesService } from '../services/invites.service';
import { User } from '../../auth/decorators/user.decorator';
import { ValidateId } from '../pipes/validate-id.pipe';

@Controller('workspace')
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkspaceInvitesController {
  constructor(private readonly invitesService: WorkspaceInvitesService) {
    // left blank intentionally
  }

  @UseGuards(IsWorkspaceAdminGuard)
  @Post('/invite/:workspaceId')
  async createInviteLink(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser,
  ) {
    return this.invitesService.createInviteLink(user.id, workspaceId);
  }

  @Post('/join/:workspaceInviteId')
  async joinWorkspace(
    @Param('workspaceInviteId', ValidateId) workspaceInviteId: string,
    @User() user: IRequestUser,
  ) {
    return this.invitesService.joinWorkspace(user.id, workspaceInviteId);
  }
}
