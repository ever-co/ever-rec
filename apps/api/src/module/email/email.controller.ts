import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('welcome-email')
  async welcome(@Body() emailBody) {
    console.log(emailBody.email);
    return await this.emailService.sendWelcomeEmail(emailBody.email);
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

  @Post('send-item')
  async sendItems(@Body() emailBody) {
    return await this.emailService.sendItems({ ...emailBody });
  }

  @Post('send-welcome-email')
  async sendWelcomeEmail(@Body() emailBody) {
    return await this.emailService.sendWelcomeEmail({ ...emailBody });
  }

  @Post('send-workspace-invite-email')
  @UseGuards(AuthGuard)
  async sendWorkspaceInviteEmail(@Body() emailBody) {
    return await this.emailService.sendWorkspaceInviteLink({ ...emailBody });
  }
}
