import { Injectable } from '@nestjs/common';
import * as postmark from 'postmark';
import { ConfigService } from '@nestjs/config';
import { PostmarkTemplate } from 'src/config/email';
import { IDataResponse, ItemType } from '../../interfaces/_types';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import {
  AuthError,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { IWorkspaceInvite } from '../workspace/Interfaces/Invites';
import { IWorkspace } from '../workspace/Interfaces/Workspace';

enum ResStatusEnum {
  error = 'error',
  success = 'success',
}

@Injectable()
export class EmailService {
  constructor(
    private readonly firebaseClient: FirebaseClient,
    private readonly configService: ConfigService
  ) {}

  async sendWelcomeEmail({ email }: { email: string }): Promise<any> {
    try {
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN')
      );

      await client.sendEmailWithTemplate({
        From: this.configService.get<string>('POSTMARK_SENDER_EMAIL'),
        To: email,
        TemplateAlias: PostmarkTemplate.welcome,
        TemplateModel: {
          email: email,
        },
      });

      return {
        status: ResStatusEnum.success,
        message: 'Email is sent successfully',
        error: null,
      };
    } catch (err) {
      return {
        status: ResStatusEnum.error,
        message: `Failed to send email`,
        error: err,
      };
    }
  }

  async sendResetPasswordEmail(email: string): Promise<IDataResponse> {
    try {
      const auth = admin.auth();
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN')
      );
      const user = await auth.getUserByEmail(email);

      if (user?.providerData[0]?.providerId === 'google.com') {
        throw { message: 'You cannot change Google account password.' };
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

  async verifyCode(oobCode: string): Promise<IDataResponse> {
    const firebaseAuth = this.firebaseClient.firebaseAuth;
    try {
      await verifyPasswordResetCode(firebaseAuth, oobCode);
      return {
        status: ResStatusEnum.success,
        message: 'Code verified successfully',
        error: null,
        data: null,
      };
    } catch (error) {
      return {
        status: ResStatusEnum.error,
        message: 'Code has expired or already been used!',
        error: null,
        data: null,
      };
    }
  }

  async resetPassword({
    oobCode,
    newPassword,
  }: {
    oobCode: string;
    newPassword: string;
  }): Promise<IDataResponse> {
    const firebaseAuth = this.firebaseClient.firebaseAuth;
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, newPassword);
      return {
        status: ResStatusEnum.success,
        message: 'Password has been updated successfully.',
        error: null,
        data: null,
      };
    } catch (error) {
      return {
        status: ResStatusEnum.error,
        message: 'Something went wrong! Please try again.',
        error: null,
        data: null,
      };
    }
  }

  async sendItems({
    emails,
    itemLink,
    itemType,
    itemPublicLink,
    message,
    userDisplayName,
    templateUrl,
  }: {
    emails: string[];
    itemLink: string;
    itemType: ItemType;
    itemPublicLink: string;
    message: string | undefined;
    userDisplayName: string | null;
    templateUrl: string | false;
  }): Promise<any> {
    try {
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN')
      );
      const url =
        this.configService.get<string>('WEBSITE_URL') +
        `/${itemType}/shared/` +
        itemLink;

      const firstName = userDisplayName && userDisplayName.split(' ')[0];
      const template: postmark.TemplatedMessage[] = [];

      emails.forEach(async email => {
        const singleTemp: postmark.TemplatedMessage = {
          From: this.configService.get<string>('POSTMARK_SENDER_EMAIL'),
          To: email,
          TemplateAlias:
            itemType == 'image'
              ? PostmarkTemplate.image
              : PostmarkTemplate.video,
          TemplateModel: {
            itemLink: url,
            itemPublicLink,
            fullName: userDisplayName ? userDisplayName : '',
            firstName: firstName ? `from ${firstName}` : '',
            message: message ? message : '',
            templateUrl,
          },
        };

        template.push(singleTemp);
      });

      await client.sendEmailBatchWithTemplates(template);

      return {
        status: ResStatusEnum.success,
        message:
          emails.length == 1
            ? 'Email is sent successfully'
            : 'Emails are sent successfully',
        error: null,
      };
    } catch (err) {
      return {
        status: ResStatusEnum.error,
        message: `Failed to send ${itemType}`,
        error: err,
      };
    }
  }

  async sendWorkspaceInviteLink({
    emails,
    inviteId,
    inviterDisplayName,
  }: {
    emails: string[];
    inviteId: string;
    inviterDisplayName: string;
  }) {
    try {
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN')
      );
      const inviteLink =
        this.configService.get<string>('WEBSITE_URL') +
        `/workspace/invite/${inviteId}`;

      const workspaceName = await this.getWorkspaceName(inviteId);

      const templates: postmark.TemplatedMessage[] = [];
      emails.forEach(async email => {
        const template: postmark.TemplatedMessage = {
          From: this.configService.get<string>('POSTMARK_SENDER_EMAIL'),
          To: email,
          TemplateAlias: PostmarkTemplate.workspaceInvite,
          TemplateModel: {
            joinWorkspaceLink: inviteLink,
            fullName: inviterDisplayName ? inviterDisplayName : '',
            workspaceName,
          },
        };

        templates.push(template);
      });

      await client.sendEmailBatchWithTemplates(templates);

      const msg =
        emails.length == 1
          ? 'Email is sent successfully!'
          : 'Emails sent successfully!';
      return sendResponse(msg);
    } catch (e) {
      console.log(e.message);
      return sendError('Could not send email.', e.message);
    }
  }

  // Helpers
  async getWorkspaceName(inviteId: string) {
    const db = admin.database();
    const workspaceInviteRef = db.ref(`workspaceInvites/${inviteId}`);
    const workspaceInviteData: IWorkspaceInvite = (
      await workspaceInviteRef.get()
    ).val();
    const workspaceRef = db.ref(
      `workspaces/${workspaceInviteData.workspaceId}`
    );
    const workspaceData: IWorkspace = (await workspaceRef.get()).val();
    const workspaceName = workspaceData?.name;

    return workspaceName ? workspaceName : '';
  }
}
