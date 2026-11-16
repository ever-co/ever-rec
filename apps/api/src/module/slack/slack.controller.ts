import {
  Controller,
  Get,
  Post,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  newOAuthBinding,
  readOAuthBinding,
  setOAuthBindingCookie,
} from '../../services/shared/oauth-state.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { SlackService } from './slack.service';

@Controller('slack')
export class SlackController {
  constructor(
    private readonly slackService: SlackService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('login-url')
  async loginUrl(@Req() req, @Res({ passthrough: true }) res) {
    const binding = newOAuthBinding();
    const result = await this.slackService.getSlackLoginUrl(
      req.user?.id,
      binding,
    );
    if (typeof result === 'string') {
      setOAuthBindingCookie(
        res,
        'slack',
        binding,
        this.configService.get<string>('API_BASE_URL'),
      );
    }
    return result;
  }

  @Get('installation')
  @Redirect()
  async slackInstallation(@Req() req): Promise<{ url: string }> {
    const stored = await this.slackService.storeInstallationInformation(
      req.query,
      readOAuthBinding(req, 'slack'),
    );
    const integrationsUrl = `${this.configService.get<string>('WEBSITE_URL')}/integrations`;
    return {
      url:
        stored === null
          ? `${integrationsUrl}?error=invalid_state`
          : integrationsUrl,
    };
  }

  @UseGuards(AuthGuard)
  @Get('channel-list')
  async channelList(@Req() req) {
    return this.slackService.getChannelList(req.user?.id);
  }

  /**
   * @internal
   */
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
