import { Injectable, Logger } from '@nestjs/common';
import * as postmark from 'postmark';
import { ConfigService } from '@nestjs/config';
import { PostmarkTemplate } from 'src/config/email';
import { IDataResponse } from '../../interfaces/_types';
import { is_id } from '../workspace/validators/id.validator';
import * as admin from 'firebase-admin';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import {
  AuthError,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { IWorkspaceInvite } from '../workspace/Interfaces/Invites';
import { isWorkspaceMember } from '../workspace/guards/CanAccessWorkspace.guard';
import { StreamServiceService } from '../video-services/streamService.service';

/** The kinds of item that can be mailed as a link. */
export type SendableItemType = 'image' | 'video';

const SIGNED_URL_CONFIG = {
  action: 'read' as const,
  expires: '03-01-2500',
};

/** A stored file name: text that cannot step out of the owner's folder. */
const isStoredFileName = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.split('/').some((part) => part === '..' || part === '');

enum ResStatusEnum {
  error = 'error',
  success = 'success',
}

const RESET_EMAIL_SENT_MESSAGE =
  'Password reset instructions sent. Check your email.';
const RESET_LIMIT_MESSAGE =
  'Reset password limit exceeded, please try again later.';
const RESET_EMAIL_FAILED_MESSAGE =
  'Could not send the e-mail, please try again later.';

/** Firebase's codes for an address with no account. */
const NO_ACCOUNT_CODES = ['auth/user-not-found', 'auth/email-not-found'];

/**
 * Identity Toolkit's codes for too many reset requests. firebase-admin maps neither, so they come
 * as `auth/internal-error` with the server's code in the message.
 */
const RESET_LIMIT_SERVER_CODES = [
  'RESET_PASSWORD_EXCEED_LIMIT',
  'TOO_MANY_ATTEMPTS_TRY_LATER',
];

/** The error's code (a Firebase string or a Postmark number), for the log. */
const errorCodeOf = (error: unknown): string => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' || typeof code === 'number'
    ? String(code)
    : 'unknown';
};

const isNoAccountError = (error: unknown): boolean =>
  NO_ACCOUNT_CODES.includes(errorCodeOf(error));

/** The code of a Firebase reset-limit error, or null for any other error. */
const resetLimitCodeOf = (error: unknown): string | null => {
  const code = errorCodeOf(error);
  if (code === 'auth/quota-exceeded') {
    return code;
  }
  if (code !== 'auth/internal-error') {
    return null;
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string'
    ? (RESET_LIMIT_SERVER_CODES.find((serverCode) =>
        message.includes(serverCode),
      ) ?? null)
    : null;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly firebaseClient: FirebaseClient,
    private readonly configService: ConfigService,
    private readonly streamService: StreamServiceService,
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

  /**
   * Mails a password reset link. An address with no account gets the same answer as a real send
   * and no mail, so the form does not tell anyone which addresses have accounts. Each other failure
   * gets its own answer, and the log names its code, never the address.
   */
  async sendResetPasswordEmail(email: string): Promise<IDataResponse> {
    const sent: IDataResponse = {
      status: ResStatusEnum.success,
      message: RESET_EMAIL_SENT_MESSAGE,
      error: null,
      data: null,
    };

    let user: UserRecord;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (isNoAccountError(error)) {
        return sent;
      }
      return this.resetEmailNotSent(
        'look-up',
        errorCodeOf(error),
        RESET_EMAIL_FAILED_MESSAGE,
      );
    }

    if (user?.providerData[0]?.providerId === 'google.com') {
      return {
        status: ResStatusEnum.error,
        message: 'You cannot change Google account password.',
        error: null,
        data: null,
      };
    }

    let originalLink: string;
    try {
      originalLink = await getAuth().generatePasswordResetLink(email);
    } catch (error) {
      if (isNoAccountError(error)) {
        return sent;
      }
      const limitCode = resetLimitCodeOf(error);
      return limitCode
        ? this.resetEmailNotSent('reset link', limitCode, RESET_LIMIT_MESSAGE)
        : this.resetEmailNotSent(
            'reset link',
            errorCodeOf(error),
            RESET_EMAIL_FAILED_MESSAGE,
          );
    }

    const indexOfLink = originalLink.indexOf('oobCode');
    const customLink = originalLink.slice(indexOfLink);

    const resetLink =
      this.configService.get<string>('WEBSITE_URL') +
      `/auth/new-password?${customLink}`;

    try {
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN'),
      );
      await client.sendEmailWithTemplate({
        From: this.configService.get<string>('POSTMARK_SENDER_EMAIL'),
        To: email,
        TemplateAlias: PostmarkTemplate.reset,
        TemplateModel: {
          reset_url: resetLink,
        },
      });
    } catch (error) {
      return this.resetEmailNotSent(
        'send',
        errorCodeOf(error),
        RESET_EMAIL_FAILED_MESSAGE,
      );
    }

    return sent;
  }

  /** Logs why a reset e-mail was not sent (the step and the error code) and answers `message`. */
  private resetEmailNotSent(
    step: string,
    code: string,
    message: string,
  ): IDataResponse {
    this.logger.warn(`Password reset e-mail not sent (${step}): ${code}`);
    return {
      status: ResStatusEnum.error,
      message,
      error: null,
      data: null,
    };
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
      return isStoredFileName(item.refName)
        ? {
            itemPublicLink: await sign(
              `users/${uid}/screenshots/${item.refName}`,
            ),
            templateUrl: false,
          }
        : null;
    }

    // The URLs saved with a streamed video are written by its owner (the save route stores what
    // the client sends), so they are never mailed. The links are asked of the streaming provider
    // for the saved asset id, which must name an asset the provider knows.
    const streamData = item.streamData;

    if (streamData) {
      const { assetId, serviceType } = streamData;

      if (typeof assetId !== 'string' || !is_id(assetId)) {
        return null;
      }

      const links = await this.streamService.getStreamLinks(
        assetId,
        serviceType,
      );

      return links?.playbackUrl
        ? {
            itemPublicLink: links.playbackUrl,
            templateUrl: links.thumbnailUrl || false,
          }
        : null;
    }

    if (!isStoredFileName(item.refName)) {
      return null;
    }

    return {
      itemPublicLink: await sign(`users/${uid}/videos/${item.refName}`),
      templateUrl: isStoredFileName(item.posterRef)
        ? await sign(`users/${uid}/videoPosters/${item.posterRef}`)
        : false,
    };
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

  /**
   * The workspace of the invite `inviteId`, or null when the invite or its workspace is missing,
   * or when `uid` is neither the admin nor a member of that workspace. Only someone in a workspace
   * may mail its invite, and the workspace name in the mail is read from the workspace itself.
   */
  async resolveInviteWorkspace(
    uid: string,
    inviteId: string,
  ): Promise<{ workspaceId: string; workspaceName: string } | null> {
    // The invite id goes straight into a database path, so only plain ids may reach it.
    if (
      typeof uid !== 'string' ||
      !uid ||
      typeof inviteId !== 'string' ||
      !is_id(inviteId)
    ) {
      return null;
    }

    const db = admin.database();
    const invite: IWorkspaceInvite | null = (
      await db.ref(`workspaceInvites/${inviteId}`).get()
    ).val();
    const workspaceId = invite?.workspaceId;

    // A missing workspace has no admin and no members, so it fails the membership check too.
    if (
      typeof workspaceId !== 'string' ||
      !is_id(workspaceId) ||
      !(await isWorkspaceMember(uid, workspaceId))
    ) {
      return null;
    }

    const name = (await db.ref(`workspaces/${workspaceId}/name`).get()).val();

    return {
      workspaceId,
      workspaceName: typeof name === 'string' ? name : '',
    };
  }

  async sendWorkspaceInviteLink({
    emails,
    inviteId,
    inviterDisplayName,
    workspaceName,
  }: {
    emails: string[];
    inviteId: string;
    inviterDisplayName: string;
    workspaceName: string;
  }) {
    try {
      const client = new postmark.ServerClient(
        this.configService.get<string>('POSTMARK_CLIENT_TOKEN'),
      );
      const inviteLink =
        this.configService.get<string>('WEBSITE_URL') +
        `/workspace/invite/${inviteId}`;

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
}
