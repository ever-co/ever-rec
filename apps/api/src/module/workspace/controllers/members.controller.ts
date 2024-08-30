import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard, IRequestUser } from '../../auth/guards/auth.guard';
import { WorkspaceMembersService } from '../services/members.service';
import { IsWorkspaceAdminGuard } from '../guards/IsWorkspaceAdmin.guard';
import { CanAccessWorkspaceGuard } from '../guards/CanAccessWorkspace.guard';
import { User } from '../../auth/decorators/user.decorator';
import { GetPopulatedMembersDto } from '../dto/members/get-populated-members.dto';
import { ValidateId } from '../pipes/validate-id.pipe';

@Controller('workspace')
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkspaceMembersController {
  constructor(private readonly membersService: WorkspaceMembersService) {
    // left blank intentionally
  }

  @UseGuards(IsWorkspaceAdminGuard)
  @Post(':workspaceId/member')
  async addNewMemberToWorkspace(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser
  ) {
    return this.membersService.addWorkspaceMember(
      user.id,
      user.name,
      user.email,
      workspaceId
    );
  }

  @UseGuards(IsWorkspaceAdminGuard)
  @Delete(':workspaceId/member')
  async removeMemberFromWorkspace(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser
  ) {
    return this.membersService.removeMemberFromWorkspace(user.id, workspaceId);
  }

  @UseGuards(CanAccessWorkspaceGuard)
  @Get(':workspaceId/members')
  async getPopulatedMembers(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @User() user: IRequestUser,
    @Query() { limit }: GetPopulatedMembersDto
  ) {
    return this.membersService.getPopulatedMembers(user.id, workspaceId, limit);
  }
}
