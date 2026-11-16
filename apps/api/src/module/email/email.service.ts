import { Injectable } from '@nestjs/common';
import * as postmark from 'postmark';
import { ConfigService } from '@nestjs/config';
import { PostmarkTemplate } from 'src/config/email';
import { IDataResponse } from '../../interfaces/_types';
import { is_id } from '../workspace/validators/id.validator';
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

/** The kinds of item that can be mailed as a link. */
export type SendableItemType = 'image' | 'video';

const SIGNED_URL_CONFIG = {
  action: 'read' as const,
  expires: '03-01-2500',
};

enum ResStatusEnum {
  error = 'error',
  success = 'success',
}

@Injectable()
export class EmailService {
  constructor(
    private readonly firebaseClient: FirebaseClient,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcomeEmail({ email }: { email: string }): Promise<any> {
    try {
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN'),
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
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN'),
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

  /**
   * The links of a shared item for the mail, read from the item itself, or null when `itemLink` is
   * not a share record of `uid` (or its item is gone or in the trash). Nothing a caller sends
   * decides what the mail links to. The links are signed with the same long expiry the owner's own
   * lists use, so the mail keeps working after the day a shared-page link lasts.
   */
  async resolveSharedItem(
    uid: string,
    itemType: SendableItemType,
    itemLink: string,
  ): Promise<{ itemPublicLink: string; templateUrl: string | false } | null> {
    if (
      typeof uid !== 'string' ||
      !is_id(uid) ||
      typeof itemLink !== 'string' ||
      !is_id(itemLink)
    ) {
      return null;
    }

    const db = admin.database();
    const isImage = itemType === 'image';
    const sharedSnap = await db
      .ref(`${isImage ? 'shared' : 'sharedVideos'}/${itemLink}`)
      .get();
    const shared = sharedSnap.val();
    const itemId = shared?.[isImage ? 'imageId' : 'videoId'];

    if (
      !shared ||
      shared.uid !== uid ||
      typeof itemId !== 'string' ||
      !is_id(itemId)
    ) {
      return null;
    }

    const item = (
      await db
        .ref(`users/${uid}/${isImage ? 'screenshots' : 'videos'}/${itemId}`)
        .get()
    ).val();

    if (!item || item.trash) {
      return null;
    }

    const bucket = admin.storage().bucket();
    const sign = async (path: string): Promise<string> =>
      (await bucket.file(path).getSignedUrl(SIGNED_URL_CONFIG))[0];

    if (isImage) {
      return {
        itemPublicLink: await sign(`users/${uid}/screenshots/${item.refName}`),
        templateUrl: false,
      };
    }

    const streamData = item.streamData;
    const itemPublicLink: string = streamData
      ? streamData.playbackUrl
      : await sign(`users/${uid}/videos/${item.refName}`);
    const templateUrl: string | false = streamData
      ? streamData.thumbnailUrl || false
      : item.posterRef
      ? await sign(`users/${uid}/videoPosters/${item.posterRef}`)
      : false;

    return { itemPublicLink, templateUrl };
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
    itemType: SendableItemType;
    itemPublicLink: string;
    message: string | undefined;
    userDisplayName: string | null;
    templateUrl: string | false;
  }): Promise<any> {
    try {
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN'),
      );
      const url =
        this.configService.get<string>('WEBSITE_URL') +
        `/${itemType}/shared/` +
        itemLink;

      const firstName = userDisplayName && userDisplayName.split(' ')[0];
      const template: postmark.TemplatedMessage[] = [];

      emails.forEach(async (email) => {
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
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN'),
      );
      const inviteLink =
        this.configService.get<string>('WEBSITE_URL') +
        `/workspace/invite/${inviteId}`;

      const workspaceName = await this.getWorkspaceName(inviteId);

      const templates: postmark.TemplatedMessage[] = [];
      emails.forEach(async (email) => {
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
      `workspaces/${workspaceInviteData.workspaceId}`,
    );
    const workspaceData: IWorkspace = (await workspaceRef.get()).val();
    const workspaceName = workspaceData?.name;

    return workspaceName ? workspaceName : '';
  }
}
