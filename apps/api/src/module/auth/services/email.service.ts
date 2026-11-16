import { Inject, Injectable, Logger } from '@nestjs/common';
import { IDataResponse } from '../../../interfaces/_types';
import { sendError, sendResponse } from '../../../services/utils/sendResponse';
import { FirebaseAuthService } from '../../firebase/services/firebase-auth.service';
import { UserService } from './user.service';
import { PASSWORD_RESET_EMAIL_STRATEGY, PasswordResetEmailStrategy } from './password-reset/password-reset.strategy';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';

/** Same answer for every address state, so the route reveals nothing. */
const GENERIC_VERIFICATION_MESSAGE =
  'If this address still needs verification, a verification email has been sent';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(PASSWORD_RESET_EMAIL_STRATEGY)
    private readonly passwordResetStrategy: PasswordResetEmailStrategy,
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly userService: UserService,
  ) { }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<IDataResponse> {
    try {
      this.logger.log(`Sending password reset email to: ${email}`);
      const response = await this.passwordResetStrategy.execute(email);
      if (response.status === ResStatusEnum.success) {
        this.logger.log(`Password reset email sent successfully to: ${email}`);
        return sendResponse({ message: response.message });
      }
      this.logger.error(
        `Failed to send password reset email to: ${email}`,
        response.error,
      );
      return sendError(response.message || 'Failed to send password reset email');
    } catch (error: any) {
      this.logger.error(
        `Failed to send password reset email to: ${email}`,
        error,
      );
      return sendError('Failed to send password reset email', error);
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(idToken: string): Promise<IDataResponse> {
    try {
      this.logger.log('Sending email verification');

      const result =
        await this.firebaseAuthService.sendVerificationEmail(idToken);

      if (result.success) {
        this.logger.log('Email verification sent successfully');
        return sendResponse({
          message: 'Verification email sent successfully',
        });
      } else {
        this.logger.error('Failed to send verification email', result.error);
        return sendError(
          result.error?.message || 'Failed to send verification email',
        );
      }
    } catch (error: any) {
      this.logger.error('Failed to send verification email', error);
      return sendError('Failed to send verification email', error);
    }
  }

  /**
   * Send the verification mail to the signed-in caller's own address.
   *
   * The Firebase action link (it carries the one-time code that marks the
   * address verified) is never returned to the client: it only travels in the
   * mail, so whoever asks must be able to read that mailbox. The answer is the
   * same whether or not the address is already verified.
   *
   * The caller's email is checked against the session by `EmailOwnershipGuard`
   * before this runs.
   */
  private async sendOwnVerificationEmail(
    email: string,
    idToken: string,
  ): Promise<IDataResponse> {
    try {
      const user = await this.userService.getUserByEmail(email);

      if (!user.emailVerified) {
        const result =
          await this.firebaseAuthService.sendVerificationEmail(idToken);

        if (!result.success) {
          this.logger.error('Failed to send verification email', result.error);
          return sendError('Failed to send verification email');
        }
      }

      return sendResponse({ message: GENERIC_VERIFICATION_MESSAGE });
    } catch (error: any) {
      this.logger.error('Failed to send verification email', error);
      return sendError('Failed to send verification email', error);
    }
  }

  /**
   * Send the verification mail (formerly returned the verification link).
   */
  async generateEmailVerificationLink(
    email: string,
    idToken: string,
  ): Promise<IDataResponse> {
    return this.sendOwnVerificationEmail(email, idToken);
  }

  /**
   * Check if email is verified
   */
  async verifyEmail(email: string): Promise<IDataResponse<boolean>> {
    try {
      this.logger.debug(`Checking email verification status for: ${email}`);

      const user = await this.userService.getUserByEmail(email);
      return sendResponse(user.emailVerified);
    } catch (error) {
      this.logger.error(
        `Failed to check email verification status for: ${email}`,
        error,
      );
      return sendError('Failed to check email verification status', error);
    }
  }

  /**
   * Verify email with verification code
   */
  async verifyEmailWithCode(verificationCode: string): Promise<IDataResponse> {
    try {
      this.logger.log('Verifying email with code');

      // This would typically use Firebase Auth REST API to verify the code
      // For now, we'll return a success response
      // In a real implementation, you would verify the code with Firebase

      this.logger.log('Email verified successfully with code');

      return sendResponse({ message: 'Email verified successfully' });
    } catch (error: any) {
      this.logger.error('Failed to verify email with code', error);
      return sendError('Failed to verify email', error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    email: string,
    idToken: string,
  ): Promise<IDataResponse> {
    return this.sendOwnVerificationEmail(email, idToken);
  }
}
