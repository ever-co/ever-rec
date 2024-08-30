import {
  Controller,
  Get,
  Post,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../auth/guards/auth.guard';
import { SlackService } from './slack.service';

@Controller('slack')
export class SlackController {
  constructor(
    private readonly slackService: SlackService,
    private readonly configService: ConfigService
  ) {}

  @UseGuards(AuthGuard)
  @Get('login-url')
  async loginUrl(@Req() req) {
    return this.slackService.getSlackLoginUrl(req.user?.id);
  }

  @Get('installation')
  @Redirect()
  async slackInstallation(@Req() req): Promise<{ url: string }> {
    await this.slackService.storeInstallationInformation(req.query);
    return {
      url: `${this.configService.get<string>(
        'WEBSITE_URL'
      )}/integrations/slack`,
    };
  }

  @UseGuards(AuthGuard)
  @Get('channel-list')
  async channelList(@Req() req) {
    return this.slackService.getChannelList(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Post('post-message')
  async postMessage(@Req() req) {
    return this.slackService.slackPostMessage(req);
  }

  @UseGuards(AuthGuard)
  @Post('disconnect')
  async disconnectUser(@Req() req) {
    return this.slackService.disconnectUser(req.user?.id);
  }
}
