import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { ImageService } from '../image/image.service';
import { SlackBoltService } from 'src/services/slack/slack-bolt.service';
import { VideoService } from '../video/video.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SlackService {
  constructor(
    private readonly imageService: ImageService,
    private readonly videoService: VideoService,
    private readonly slackService: SlackBoltService,
    private readonly configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async storeInstallationInformation(query) {
    const { code, state } = query;

    try {
      if (code && state) {
        const result = await this.slackService.slackAuthorizeToken(code);
        if (
          result &&
          result.authed_user &&
          result.authed_user.access_token &&
          state
        ) {
          const userRef = admin.database().ref(`users/${state}`);
          await userRef.update({
            slackToken: result.authed_user.access_token,
            isSlackIntegrate: true,
            slackBotToken: result.access_token,
          });
          await this.eventEmitter.emit('analytics.track', 'Slack Integrated', {
            userId: state,
          });
          return result;
        }
      } else {
        throw new BadRequestException('Please enter valid credentials');
      }
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Something went wrong, Please try again later.',
      );
    }
  }

  public async getChannelList(uid: string) {
    try {
      const userData = await this.getUserData(uid);

      if (userData && userData.isSlackIntegrate && userData.slackToken) {
        const response = await this.slackService.slackChannelList(
          userData.slackToken,
        );
        return {
          status: ResStatusEnum.success,
          message: 'Channels retrieve successfully',
          error: null,
          data: response,
        };
      } else {
        throw new BadRequestException(
          'Something went wrong, Please try again later or try to reconnect to Slack.',
        );
      }
    } catch (error) {
      throw new BadRequestException(
        error,
        'Something went wrong, Please try again later or try to reconnect to Slack.',
      );
    }
  }

  public async slackPostMessage(req) {
    try {
      const uid = req.user?.id;
      const userData = await this.getUserData(uid);

      if (userData && userData.isSlackIntegrate && userData.slackToken) {
        const { channelId = null, id = null, type = 'image' } = req.body;
        let title = null;
        let slackBlock = null;
        const recText = {
          type: 'plain_text',
          text: 'Sent with Rec',
          emoji: true,
        };
        if (type == 'image') {
          const resData = await this.imageService.getImageByIdPrivate(uid, id);
          let sharedImageLink = null;
          if (resData.sharedLink) {
            sharedImageLink = `${this.configService.get<string>(
              'WEBSITE_URL',
            )}/image/shared/${resData.sharedLink}`;
          } else {
            const sharedCode = await this.imageService.share(uid, id);
            sharedImageLink = `${this.configService.get<string>(
              'WEBSITE_URL',
            )}/image/shared/${sharedCode}`;
          }
          if (resData) {
            title = resData.dbData.title;
            slackBlock = [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `<${sharedImageLink}|Click here to more details>`,
                },
              },
              {
                type: 'image',
                title: { ...recText },
                image_url: resData.url,
                alt_text: resData.dbData.title,
              },
            ];
          }
        } else {
          const resData = await this.videoService.getVideoByIdPrivate(uid, id);
          const resPosterData = await this.videoService.getPoster(uid, id);
          if (resData) {
            let sharedLink = null;
            if (resData.sharedLink) {
              sharedLink = `${this.configService.get<string>(
                'WEBSITE_URL',
              )}/video/shared/${resData.sharedLink}`;
            } else {
              const sharedCode = await this.videoService.share(uid, id);
              sharedLink = `${this.configService.get<string>(
                'WEBSITE_URL',
              )}/video/shared/${sharedCode}`;
            }
            title = resData.dbData.title || 'Sent with Rec';
            slackBlock = [
              {
                type: 'context',
                elements: [{ ...recText }],
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `<${sharedLink}|Click here to watch video>`,
                },
              },
            ];
            if (resPosterData) {
              slackBlock.push({
                type: 'image',
                title: { ...recText },
                image_url: resPosterData,
                alt_text: title,
              });
              slackBlock.shift();
            }
          }
        }
        const result = await this.slackService.slackPostMessage(
          userData.slackToken,
          channelId,
          title,
          slackBlock,
        );
        return result;
      } else {
        return {
          status: ResStatusEnum.error,
          message:
            'You do not have permission to send messages in this channel.',
          error: null,
          data: null,
        };
      }
    } catch (error) {
      return {
        status: ResStatusEnum.error,
        message: 'You do not have permission to send messages in this channel.',
        error: null,
        data: null,
      };
    }
  }

  public async getSlackLoginUrl(uid: string) {
    const userData = await this.getUserData(uid);
    if (userData && userData.slackBotToken && userData.isSlackIntegrate) {
      return {
        status: ResStatusEnum.error,
        message:
          'You have already slack integrated. Please refresh the page and try again.',
      };
    } else {
      return this.slackService.slackLoginUrl(uid);
    }
  }

  public async disconnectUser(uid: string) {
    const error = {
      status: ResStatusEnum.error,
      message: 'Something went wrong, Please try again later.',
      error: null,
    };

    const userData = await this.getUserData(uid);

    try {
      if (userData && userData.slackBotToken) {
        const response = await this.slackService.slackDisconnectUser(
          userData.slackBotToken,
        );

        const userRef = admin.database().ref(`users/${uid}`);

        await userRef.update({
          slackToken: null,
          slackBotToken: null,
          isSlackIntegrate: false,
        });

        await this.eventEmitter.emit(
          'analytics.track',
          'Slack Integration Disconnected',
          {
            userId: uid,
            properties: { isSlackIntegrate: false },
          },
        );

        return {
          status: ResStatusEnum.success,
          message: 'Successfully disconnected slack account',
          error: null,
          data: response,
        };
      } else {
        console.log(
          error,
          'SlackBotToken is empty. We clean up user record anyway from any Slack details',
        );

        if (userData) {
          const userRefUpdate = admin.database().ref(`users/${uid}`);

          await userRefUpdate.update({
            slackToken: null,
            slackBotToken: null,
            isSlackIntegrate: false,
          });
        }

        await this.eventEmitter.emit(
          'analytics.track',
          'Slack Integration Disconnected',
          { userId: uid },
        );

        return {
          status: ResStatusEnum.success,
          message: 'Successfully disconnected slack account',
          error: null,
        };
      }
    } catch (error) {
      console.log(error, 'error');
      return { ...error, error: error.code };
    }
  }

  public async getUserData(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.get();
    const userData = snapshot.val();
    return userData;
  }
}
