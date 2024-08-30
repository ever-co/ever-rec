import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AtlassianService } from './atlassian.service';

@Controller('atlassian')
export class AtlassianController {
  constructor(
    private readonly atlassianService: AtlassianService,
    private readonly configService: ConfigService
  ) {}

  @UseGuards(AuthGuard)
  @Get('jira/project/data')
  async getProjectsData(@Req() req) {
    return this.atlassianService.getJiraProjectsData(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Get('jira/sign-in')
  async generateAuthUrl(@Req() req) {
    return this.atlassianService.generateJiraAuthUrl(req.user?.id);
  }

  @Get('jira/complete-oauth')
  @Redirect()
  async completeOAuth(@Query() query) {
    await this.atlassianService.completeJiraOAuth(query.state, query.code);
    return {
      url: `${this.configService.get<string>('WEBSITE_URL')}/integrations/jira`,
    };
  }

  @UseGuards(AuthGuard)
  @Post('jira/create/issue')
  async createJiraIssue(@Req() req) {
    return await this.atlassianService.createJiraIssue(req);
  }

  @UseGuards(AuthGuard)
  @Delete('jira/sign-out')
  async signOutJiraUser(@Req() req) {
    return this.atlassianService.signOutJira(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Get('trello/sign-in')
  async generateTrelloAuthUrl(@Req() req) {
    return this.atlassianService.generateTrelloAuthUrl(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Get('trello/project/data')
  async getTrelloProjectsData(@Req() req) {
    return this.atlassianService.getTrelloProjectsData(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Post('/trello/create/issue')
  async createTrelloCard(@Req() req) {
    return await this.atlassianService.createTrelloCard(req.user?.id, req);
  }

  @UseGuards(AuthGuard)
  @Post('/trello/complete-oauth')
  async completeTrelloOAuth(@Req() req) {
    return await this.atlassianService.completeTrelloOAuth(
      req.user?.id,
      req.body
    );
  }

  @UseGuards(AuthGuard)
  @Delete('trello/sign-out')
  async signOutTrelloUser(@Req() req) {
    return this.atlassianService.signOutTrelloUser(req.user?.id);
  }
}
