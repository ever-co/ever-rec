import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { WhiteboardTeamService } from '../services/teams.service';

// Request Bodies Interfaces
export interface IUpdateTeamNameBody {
  name?: string;
  avatar?: any;
  thumbnail?: any;
  type: string;
}

export interface ITeamMemberBody {
  teamId: string;
  memberId: string;
}

@Controller('whiteboards/teams')
export class WhiteboardTeamController {
  constructor(private readonly teamsService: WhiteboardTeamService) {}

  // CRUD Methods
  @UseGuards(AuthGuard)
  @Post('add-team/:teamName')
  async addTeam(@Req() req, @Param('teamName') teamName: string) {
    return this.teamsService.addTeam(req.user?.id, teamName);
  }

  @UseGuards(AuthGuard)
  @Get()
  async getTeams(@Req() req) {
    return this.teamsService.getTeams(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ])
  )
  @Put(':teamId')
  async updateTeam(
    @Req() req,
    @Param('teamId') teamId: string,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File;
      thumbnail?: Express.Multer.File;
    },
    @Body() body: IUpdateTeamNameBody
  ) {
    return this.teamsService.updateTeam(
      req.user?.id,
      teamId,
      body.name,
      files?.avatar && files.avatar[0],
      files?.thumbnail && files.thumbnail[0]
    );
  }

  @UseGuards(AuthGuard)
  @Delete('delete/:teamId')
  async deleteTeam(@Req() req, @Param('teamId') teamId: string) {
    return this.teamsService.deleteTeam(req.user?.id, teamId);
  }

  @UseGuards(AuthGuard)
  @Put('/leave-team/:teamId/:teamAdminId')
  async leaveTeam(
    @Req() req,
    @Param('teamId') teamId: string,
    @Param('teamAdminId') teamAdminId: string
  ) {
    return this.teamsService.leaveTeam(req.user?.id, teamAdminId, teamId);
  }

  // Member Methods
  @UseGuards(AuthGuard)
  @Get(':teamId/members')
  async getTeamMembers(@Req() req, @Param('teamId') teamId: string) {
    return this.teamsService.getTeamMembers(req.user?.id, teamId);
  }

  // @UseGuards(AuthGuard)
  // @Post('add-member')
  // async addMember(@Body() body: ITeamMemberBody) {
  //   return this.teamsService.addMember(body.teamId, body.memberId);
  // }

  // TODO: Update team member - his Team permissions/access

  @UseGuards(AuthGuard)
  @Delete('delete-member/:teamId/:memberId')
  async deleteMember(
    @Req() req,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string
  ) {
    return this.teamsService.deleteMember(req.user?.id, teamId, memberId);
  }
}
