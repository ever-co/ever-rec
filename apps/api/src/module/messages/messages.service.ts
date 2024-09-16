import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectTwilio, TwilioClient } from 'nestjs-twilio';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { ImageService } from '../image/image.service';
import { VideoService } from '../video/video.service';

@Injectable()
export class MessagesService {
  public constructor(
    @InjectTwilio() private readonly client: TwilioClient,
    private readonly imageService: ImageService,
    private readonly videoService: VideoService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @internal
   */
  async sendSMS(toPhone: string, mediaUrl: string, body: string = '') {
    return await this.client.messages
      .create({
        body: body,
        from: `whatsapp:${this.configService.get<string>(
          'TWILIO_FROM_NUMBER',
        )}`,
        //to: 'whatsapp:+919998843025',
        to: `whatsapp:${toPhone}`,
        ...(mediaUrl && { mediaUrl }),
      })
      .then((res) => {
        console.log(res, 'res');
        return {
          status: ResStatusEnum.success,
          message: 'Item shared successfully',
          error: null,
          data: res,
        };
      })
      .catch((error: any) => {
        console.log(error, 'error');
        return {
          status: ResStatusEnum.error,
          message: error.message,
          error: error?.code || null,
        };
      });
  }

  /**
   * @internal
   */
  public async sendWhatsAppMessage(req) {
    const uid = req.user.id;
    const { id, type, phone } = req.body;
    let body = null;
    let mediaUrl = null;
    let sharedLink = null;

    if (type == 'image') {
      const resData = await this.imageService.getImageByIdPrivate(uid, id);

      if (resData) {
        mediaUrl = [resData.url];

        if (resData.sharedLink) {
          sharedLink = `${this.configService.get<string>(
            'WEBSITE_URL',
          )}/image/shared/${resData.sharedLink}`;
        } else {
          const sharedCode = await this.videoService.share(uid, id);
          sharedLink = `${this.configService.get<string>(
            'WEBSITE_URL',
          )}/image/shared/${sharedCode}`;
        }
        body = '*Sent with Rec* Click to link for mor details: ' + sharedLink;
        return await this.sendSMS(phone, mediaUrl, body);
      }
    } else {
      const resData = await this.videoService.getVideoByIdPrivate(uid, id);
      mediaUrl = [resData.url];

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

      body = '*Sent with Rec* Click to link for mor details: ' + sharedLink;

      return await this.sendSMS(phone, mediaUrl, body);
    }
  }
}
