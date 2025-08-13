import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IDataResponse } from '../../../interfaces/_types';
import { SharedService } from '../../../services/shared/shared.service';
import { sendError, sendResponse } from '../../../services/utils/sendResponse';
import { AuthenticationService } from './authentication.service';
import { EmailService } from './email.service';
import { GoogleAuthService } from './google-auth.service';
import { UserProfileService } from './user-profile.service';
import { UserService } from './user.service';

export interface IRegisterProps {
  email: string;
  password: string;
  username: string;
}

export interface ILoginProps {
  email: string;
  password: string;
}

export interface IChangePasswordProps {
  uid: string;
  email: string;
  oldPassword: string;
  newPassword: string;
}

export interface IUpdateUserDataProps {
  uid: string;
  displayName?: string;
  photoURL?: string;
}

export interface IUploadAvatarProps {
  uid: string;
  avatar: Express.Multer.File;
}

@Injectable()
export class AuthOrchestratorService {
  private readonly logger = new Logger(AuthOrchestratorService.name);

  constructor(
    private readonly userService: UserService,
    private readonly authenticationService: AuthenticationService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly emailService: EmailService,
    private readonly userProfileService: UserProfileService,
    private readonly sharedService: SharedService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== AUTHENTICATION METHODS ====================

  /**
   * Register a new user
   */
  async register(registerData: IRegisterProps): Promise<IDataResponse> {
    return this.authenticationService.register(registerData);
  }

  /**
   * Login user with email and password
   */
  async login(loginData: ILoginProps): Promise<IDataResponse> {
    return this.authenticationService.login(loginData);
  }

  /**
   * Process Google login
   */
  async processGoogleLogin(credentials: string): Promise<IDataResponse> {
    return this.googleAuthService.processGoogleLogin(credentials);
  }

  /**
   * Reauthenticate user
   */
  async reauthenticate(
    email: string,
    password: string,
  ): Promise<IDataResponse> {
    return this.authenticationService.reauthenticate(email, password);
  }

  // ==================== USER MANAGEMENT METHODS ====================

  /**
   * Get user data
   */
  async getUserData(uid: string): Promise<IDataResponse> {
    return this.userProfileService.getUserData(uid);
  }

  /**
   * Get user by ID
   */
  async getUserById(uid: string) {
    return this.userService.getUserById(uid);
  }

  /**
   * Update user data
   */
  async updateUserData(
    updateData: IUpdateUserDataProps,
  ): Promise<IDataResponse> {
    return this.userProfileService.updateUserData(
      updateData.uid,
      updateData.displayName,
      updateData.photoURL,
    );
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(uploadData: IUploadAvatarProps): Promise<IDataResponse> {
    return this.userProfileService.uploadAvatar(
      uploadData.uid,
      uploadData.avatar,
    );
  }

  /**
   * Change user email
   */
  async changeUserEmail(uid: string, newEmail: string): Promise<IDataResponse> {
    try {
      // Update email in Firebase Auth
      await this.userService.updateUser(uid, { email: newEmail });

      // Update email in database
      return this.userProfileService.changeUserEmail(uid, newEmail);
    } catch (error: any) {
      this.logger.error(`Failed to change user email: ${uid}`, error);
      return sendError('Failed to change user email', error);
    }
  }

  /**
   * Change user password
   */
  async changeUserPassword(
    changePasswordData: IChangePasswordProps,
  ): Promise<IDataResponse> {
    return this.authenticationService.changePassword(changePasswordData);
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<IDataResponse> {
    try {
      this.logger.log(`Deleting user: ${uid}`);

      await Promise.all([
        this.sharedService.removeShared(uid),
        this.userProfileService.deleteUserFiles(uid),
        this.userService.deleteUser(uid),
      ]);

      await this.eventEmitter.emit(
        'analytics.track',
        'User deleted! All user files deleted!',
        { userId: uid },
      );

      this.logger.log(`User deleted successfully: ${uid}`);

      return sendResponse(null);
    } catch (error: any) {
      this.logger.error(`Failed to delete user: ${uid}`, error);
      return sendError(
        'Error while trying to delete user or user files!',
        error,
      );
    }
  }

  /**
   * Set user custom claims
   */
  async setUserCustomClaims(uid: string, claims: any): Promise<IDataResponse> {
    try {
      await this.userService.setCustomClaims(uid, claims);
      return sendResponse({ message: 'Custom claims updated successfully' });
    } catch (error: any) {
      this.logger.error(`Failed to set custom claims: ${uid}`, error);
      return sendError('Failed to update custom claims', error);
    }
  }

  // ==================== EMAIL METHODS ====================

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<IDataResponse> {
    return this.emailService.sendPasswordResetEmail(email);
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(idToken: string): Promise<IDataResponse> {
    return this.emailService.sendEmailVerification(idToken);
  }

  /**
   * Generate email verification link
   */
  async generateEmailVerificationLink(email: string): Promise<IDataResponse> {
    return this.emailService.generateEmailVerificationLink(email);
  }

  /**
   * Verify email with code
   */
  async verifyEmailWithCode(verificationCode: string): Promise<IDataResponse> {
    return this.emailService.verifyEmailWithCode(verificationCode);
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<IDataResponse> {
    return this.emailService.resendVerificationEmail(email);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if user uses Google authentication
   */
  async checkGoogleAuth(email: string): Promise<boolean> {
    return this.googleAuthService.checkGoogleAuth(email);
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(email: string): Promise<boolean> {
    return this.emailService.isEmailVerified(email);
  }

  /**
   * Generate custom token for user
   */
  async generateCustomToken(uid: string): Promise<string> {
    return this.userService.generateCustomToken(uid);
  }

  /**
   * Verify ID token
   */
  async verifyIdToken(idToken: string) {
    return this.userService.verifyIdToken(idToken);
  }
}
