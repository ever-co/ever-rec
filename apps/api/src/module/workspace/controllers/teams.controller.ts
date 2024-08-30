import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard, IRequestUser } from '../../auth/guards/auth.guard';
import { IsWorkspaceAdminGuard } from '../guards/IsWorkspaceAdmin.guard';
import { WorkspaceTeamsService } from '../services/teams.service';
import { User } from '../../auth/decorators/user.decorator';
import { ValidateId } from '../pipes/validate-id.pipe';
import { AddTeamDto } from '../dto/teams/add-team.dto';
import { UpdateTeamDto } from '../dto/teams/update-team.dto';
import { AddTeamMemberDto } from '../dto/teams/add-member.dto';
import { DeleteTeamMemberDto } from '../dto/teams/delete-member.dto';

@Controller('workspace/:workspaceId/teams')
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkspaceTeamsController {
  constructor(private readonly teamsService: WorkspaceTeamsService) {
    // left blank intentionally
  }

  @UseGuards(IsWorkspaceAdminGuard)
  @Post('add-team/:teamName')
  async addTeam(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param() { teamName }: AddTeamDto, // TODO should be part of body
    @User() user: IRequestUser
  ) {
    return this.teamsService.addTeam(user.id, workspaceId, teamName);
  }

  @Get()
  async getTeams(@Param('workspaceId', ValidateId) workspaceId: string) {
    return this.teamsService.getTeams(workspaceId);
  }

  @Put(':teamId')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ])
  )
  async updateTeam(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('teamId', ValidateId) teamId: string,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
    @Body() body: UpdateTeamDto
  ) {
    return this.teamsService.updateTeam(
      workspaceId,
      teamId,
      body.name,
      files?.avatar && files.avatar[0],
      files?.thumbnail && files.thumbnail[0]
    );
  }

  @Delete('delete/:teamId')
  @UseGuards(IsWorkspaceAdminGuard)
  async deleteTeam(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('teamId', ValidateId) teamId: string
  ) {
    return this.teamsService.deleteTeam(workspaceId, teamId);
  }

  @Put('/leave-team/:teamId')
  async leaveTeam(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Param('teamId', ValidateId) teamId: string,
    @User() user: IRequestUser
  ) {
    return this.teamsService.leaveTeam(workspaceId, user.id, teamId);
  }

  @Get('teams-members')
  async getTeamsMembers(@Param('workspaceId', ValidateId) workspaceId: string) {
    return this.teamsService.getTeamsMembers(workspaceId);
  }

  @Post('add-member')
  @UseGuards(IsWorkspaceAdminGuard)
  async addMember(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Body() { teamId, memberId }: AddTeamMemberDto
  ) {
    return this.teamsService.addMember(workspaceId, teamId, memberId);
  }

  @Post('delete-member')
  @UseGuards(IsWorkspaceAdminGuard)
  async deleteMember(
    @Param('workspaceId', ValidateId) workspaceId: string,
    @Body() { teamId, memberId }: DeleteTeamMemberDto
  ) {
    return this.teamsService.deleteMember(workspaceId, teamId, memberId);
  }
}
