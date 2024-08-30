import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, LogLevel } from '@slack/bolt';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';

@Injectable()
export class SlackBoltService {
  private clientSecrete: string;
  private clientId: string;
  private baseURL: string;
  private oauthRedirect: string;
  private signingSecrete: string;
  private redirectUriPath = '/api/v1/slack/installation';
  private boltApp: App;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('SLACK_CLIENT_ID');
    this.clientSecrete = this.configService.get<string>('SLACK_CLIENT_SECRET');
    this.baseURL = this.configService.get<string>('API_BASE_URL');
    this.signingSecrete = this.configService.get<string>(
      'SLACK_SIGNING_SECRET'
    );
    this.oauthRedirect = `${this.baseURL}${this.redirectUriPath}`;

    if (this.clientId && this.clientSecrete) {
      this.boltApp = new App({
        logLevel: LogLevel.DEBUG,
        signingSecret: this.signingSecrete,
        clientId: this.clientId,
        clientSecret: this.clientSecrete,
        stateSecret: 'Rec',
        redirectUri: `${this.baseURL}${this.redirectUriPath}`,
        installerOptions: {
          redirectUriPath: `${this.redirectUriPath}`,
        },
      });
    } else {
      console.log('Slack Client ID or Secret not set');
    }
  }

  public async slackLoginUrl(uid: string) {
    const sharableURL = `https://slack.com/oauth/v2/authorize?client_id=${this.clientId}&scope=channels:read,commands,groups:read,mpim:read,im:read&user_scope=channels:read,chat:write,users:read&redirect_uri=${this.oauthRedirect}&state=${uid}&type=web`;

    return sharableURL;
  }

  public async slackChannelList(token: string) {
    let result = [];
    let members = [];
    let channels = [];
    if (token) {
      const conversions = await this.boltApp.client.conversations.list({
        token,
      });
      const users = await this.boltApp.client.users.list({ token });

      if (users && users.members && users.members.length) {
        members = users.members
          .map(item => {
            return !item.deleted
              ? {
                  id: item.id,
                  name: item.profile?.display_name || item.profile?.real_name,
                }
              : null;
          })
          .filter(x => x);
      }

      if (
        conversions &&
        conversions.channels &&
        conversions.channels.length > 0
      ) {
        channels = conversions.channels.map(item => {
          return {
            id: item.id,
            name: item.name || null,
          };
        });
      }

      result = members.concat(channels);
    }

    return result;
  }

  public async slackPostMessage(
    token: string,
    channel: string,
    text,
    blocks: any
  ) {
    try {
      const result = await this.boltApp.client.chat.postMessage({
        channel,
        attachments: [{ blocks: [...blocks] }],
        token,
      });
      return {
        status: ResStatusEnum.success,
        message: 'Message post successfully',
        data: result,
      };
    } catch (error) {
      console.log(error);
      return {
        status: ResStatusEnum.error,
        message: 'You do not have permission to send messages in this channel.',
        error: error.code || null,
        data: null,
      };
    }
  }

  public async slackAuthorizeToken(code: string) {
    if (this.clientId && this.clientSecrete) {
      try {
        const result = await this.boltApp.client.oauth.v2.access({
          client_id: this.clientId,
          client_secret: this.clientSecrete,
          code,
          redirect_uri: this.oauthRedirect,
        });
        return result;
      } catch (error) {
        throw new BadRequestException(error.code);
      }
    } else {
      throw new BadRequestException(
        'Slack ClientId or ClientSecret not set correctly'
      );
    }
  }

  public async slackDisconnectUser(token: string) {
    try {
      const result = await this.boltApp.client.apps.uninstall({
        client_id: this.clientId,
        client_secret: this.clientSecrete,
        token,
      });
      return { data: result };
    } catch (error) {
      return error;
    }
  }
}
