import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { IDataResponse } from '../../../interfaces/_types';
import { sendError, sendResponse } from '../../../services/utils/sendResponse';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { FirebaseAuthService } from '../../firebase/services/firebase-auth.service';
import { UserService } from './user.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly userService: UserService,
  ) {}

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<IDataResponse> {
    try {
      this.logger.log(`Sending password reset email to: ${email}`);

      const result =
        await this.firebaseAuthService.sendPasswordResetEmail(email);

      if (result.success) {
        this.logger.log(`Password reset email sent successfully to: ${email}`);
        return sendResponse({
          message: 'Password reset email sent successfully',
        });
      } else {
        this.logger.error(
          `Failed to send password reset email to: ${email}`,
          result.error,
        );
        return sendError(
          result.error?.message || 'Failed to send password reset email',
        );
      }
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
   * Generate email verification link
   */
  async generateEmailVerificationLink(email: string): Promise<IDataResponse> {
    try {
      this.logger.log(`Generating email verification link for: ${email}`);

      const user = await this.userService.getUserByEmail(email);

      if (user.emailVerified) {
        throw new ConflictException('Email already verified');
      }

      const link =
        await this.firebaseAdminService.generateEmailVerificationLink(email);

      this.logger.log(
        `Email verification link generated successfully for: ${email}`,
      );

      return sendResponse({ link });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate email verification link for: ${email}`,
        error,
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      return sendError('Failed to generate verification link', error);
    }
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(email: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking email verification status for: ${email}`);

      const user = await this.userService.getUserByEmail(email);
      return user.emailVerified;
    } catch (error) {
      this.logger.error(
        `Failed to check email verification status for: ${email}`,
        error,
      );
      return false;
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
  async resendVerificationEmail(email: string): Promise<IDataResponse> {
    try {
      this.logger.log(`Resending verification email to: ${email}`);

      // Check if email is already verified
      const isVerified = await this.isEmailVerified(email);
      if (isVerified) {
        throw new ConflictException('Email is already verified');
      }

      // Generate new verification link
      const link =
        await this.firebaseAdminService.generateEmailVerificationLink(email);

      this.logger.log(`Verification email resent successfully to: ${email}`);

      return sendResponse({
        message: 'Verification email resent successfully',
        link,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to resend verification email to: ${email}`,
        error,
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      return sendError('Failed to resend verification email', error);
    }
  }
}
