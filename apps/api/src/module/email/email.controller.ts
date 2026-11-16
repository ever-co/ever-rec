import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { EmailService, SendableItemType } from './email.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { is_id } from '../workspace/validators/id.validator';

/** The most recipients of one mail of an item. */
export const MAX_ITEM_RECIPIENTS = 20;
/** The longest note a sender may add. */
export const MAX_ITEM_MESSAGE_LENGTH = 1000;

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // The welcome mail goes to the signed-in user's own address, whatever the body says.
  @Post('welcome-email')
  @UseGuards(AuthGuard)
  async welcome(@Req() req) {
    return await this.emailService.sendWelcomeEmail({ email: req.user.email });
  }

  @Post('reset-password-email')
  async sendResetEmail(@Body() emailBody) {
    return await this.emailService.sendResetPasswordEmail(emailBody.email);
  }

  @Post('verify-code')
  async verifyCode(@Body() resetCodeBody) {
    return await this.emailService.verifyCode(resetCodeBody.oobCode);
  }

  @Post('new-password')
  async resetPassword(@Body() resetCodeBody) {
    return await this.emailService.resetPassword({ ...resetCodeBody });
  }

  /**
   * Mails a link to an item the caller has shared. The sender's name comes from the session, and
   * the links come from the shared item itself: only the recipients, the item and an optional
   * note are taken from the body.
   */
  @Post('send-item')
  @UseGuards(AuthGuard)
  async sendItems(@Req() req, @Body() body) {
    const { emails, itemType, itemLink, message } = body ?? {};

    if (itemType !== 'image' && itemType !== 'video') {
      throw new BadRequestException('Item type must be image or video.');
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      throw new BadRequestException('At least one recipient is required.');
    }

    if (emails.length > MAX_ITEM_RECIPIENTS) {
      throw new BadRequestException(
        `At most ${MAX_ITEM_RECIPIENTS} recipients are allowed.`,
      );
    }

    if (
      !emails.every((email) => typeof email === 'string' && isEmail(email))
    ) {
      throw new BadRequestException(
        'Every recipient must be an email address.',
      );
    }

    if (
      message !== undefined &&
      message !== null &&
      (typeof message !== 'string' || message.length > MAX_ITEM_MESSAGE_LENGTH)
    ) {
      throw new BadRequestException(
        `The message must be text of at most ${MAX_ITEM_MESSAGE_LENGTH} characters.`,
      );
    }

    const links = await this.emailService.resolveSharedItem(
      req.user.id,
      itemType as SendableItemType,
      itemLink,
    );

    if (!links) {
      throw new ForbiddenException('Access to this item is not allowed');
    }

    return await this.emailService.sendItems({
      emails: [...new Set<string>(emails)],
      itemLink,
      itemType,
      itemPublicLink: links.itemPublicLink,
      templateUrl: links.templateUrl,
      message: message || undefined,
      userDisplayName: req.user.name || req.user.email,
    });
  }

  // Same as `welcome-email`: the body is ignored.
  @Post('send-welcome-email')
  @UseGuards(AuthGuard)
  async sendWelcomeEmail(@Req() req) {
    return await this.emailService.sendWelcomeEmail({ email: req.user.email });
  }

  /**
   * Mails the invite link of a workspace the caller is in. The inviter's name comes from the
   * session and the workspace name from the invite's workspace: only the recipients and the invite
   * are taken from the body.
   */
  @Post('send-workspace-invite-email')
  @UseGuards(AuthGuard)
  async sendWorkspaceInviteEmail(@Req() req, @Body() body) {
    const { emails, inviteId } = body ?? {};

    // The id goes straight into a database path, so only plain ids may reach it.
    if (typeof inviteId !== 'string' || !is_id(inviteId)) {
      throw new BadRequestException('The invite id is not valid.');
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      throw new BadRequestException('At least one recipient is required.');
    }

    if (emails.length > MAX_ITEM_RECIPIENTS) {
      throw new BadRequestException(
        `At most ${MAX_ITEM_RECIPIENTS} recipients are allowed.`,
      );
    }

    if (!emails.every((to) => typeof to === 'string' && isEmail(to))) {
      throw new BadRequestException(
        'Every recipient must be an email address.',
      );
    }

    const workspace = await this.emailService.resolveInviteWorkspace(
      req.user.id,
      inviteId,
    );

    if (!workspace) {
      throw new ForbiddenException('Access to this workspace is not allowed');
    }

    return await this.emailService.sendWorkspaceInviteLink({
      emails: [...new Set<string>(emails)],
      inviteId,
      inviterDisplayName: req.user.name || req.user.email,
      workspaceName: workspace.workspaceName,
    });
  }
}
