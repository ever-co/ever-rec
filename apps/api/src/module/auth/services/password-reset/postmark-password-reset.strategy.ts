import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postmark from 'postmark';
import { PostmarkTemplate } from '../../../../config/email';
import { ResStatusEnum } from '../../../../enums/ResStatusEnum';
import { IDataResponse } from '../../../../interfaces/_types';
import { FirebaseAuthService } from '../../../firebase/services/firebase-auth.service';
import { GoogleAuthService } from '../google-auth.service';
import { PasswordResetEmailStrategy } from './password-reset.strategy';

@Injectable()
export class PostmarkPasswordResetStrategy
  implements PasswordResetEmailStrategy
{
  constructor(
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly firebaseAuthService: FirebaseAuthService,
  ) {}

  async execute(email: string): Promise<IDataResponse> {
    try {
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN'),
      );
      const hasGoogleProvider =
        await this.googleAuthService.checkGoogleAuth(email);

      if (hasGoogleProvider) {
        return {
          status: ResStatusEnum.error,
          message: 'You cannot change Google account password.',
          error: null,
          data: null,
        };
      }

      const {
        data: { link: originalLink },
      } = await this.firebaseAuthService.generatePasswordResetLink(email);
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
