import { Injectable } from '@nestjs/common';
import * as postmark from 'postmark';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { IDataResponse } from '../../../../interfaces/_types';
import { ResStatusEnum } from '../../../../enums/ResStatusEnum';
import { PostmarkTemplate } from '../../../../config/email';
import { PasswordResetEmailStrategy } from './password-reset.strategy';

@Injectable()
export class PostmarkPasswordResetStrategy implements PasswordResetEmailStrategy {
  constructor(private readonly configService: ConfigService) { }

  async execute(email: string): Promise<IDataResponse> {
    try {
      const auth = admin.auth();
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN'),
      );
      const user = await auth.getUserByEmail(email);

      if (user?.providerData[0]?.providerId === 'google.com') {
        return {
          status: ResStatusEnum.error,
          message: 'You cannot change Google account password.',
          error: null,
          data: null,
        };
      }

      const originalLink = await getAuth().generatePasswordResetLink(email);
      const indexOfLink = originalLink.indexOf('oobCode');
      const customLink = originalLink.slice(indexOfLink);

      const resetLink =
        this.configService.get<string>('WEBSITE_URL') +
        `/auth/new-password?${customLink}`;

      await client.sendEmailWithTemplate({
        From: this.configService.get<string>('POSTMARK_SENDER_EMAIL'),
        To: email,
        TemplateAlias: PostmarkTemplate.reset,
        TemplateModel: {
          reset_url: resetLink,
        },
      });

      return {
        status: ResStatusEnum.success,
        message: 'Password reset instructions sent. Check your email.',
        error: null,
        data: null,
      };
    } catch (error) {
      return {
        status: ResStatusEnum.error,
        message: 'Reset password limit exceeded, please try again later.',
        error: null,
        data: null,
      };
    }
  }
}
