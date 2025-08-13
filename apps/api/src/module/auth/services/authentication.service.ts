import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IDataResponse } from '../../../interfaces/_types';
import { sendError, sendResponse } from '../../../services/utils/sendResponse';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { FirebaseAuthService } from '../../firebase/services/firebase-auth.service';
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

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  private readonly errorParser = {
    'auth/email-already-in-use':
      'This email is already taken. Please try with another one...',
    'auth/wrong-password': 'Invalid email or password. Please try again...',
    'auth/invalid-email': 'Invalid email or password. Please try again...',
    'auth/user-disabled': 'This User is disabled.',
    'auth/user-not-found': 'This email is not yet registered...',
    'auth/invalid-credential': 'Invalid credential provided.',
    'auth/too-many-requests':
      'Too many failed login attempts. Please try again later.',
    'auth/network-request-failed':
      'Network error. Please check your internet connection and try again.',
    'custom/user-uses-google-auth':
      'This account is already associated with a Google account. Please sign in using Google login button.',
  };

  constructor(
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): IDataResponse<null> {
    const errorCode = error.code || 'unknown';
    const message =
      this.errorParser[errorCode] ||
      'There was a problem, please try again later...';

    this.logger.error(`Authentication error: ${errorCode}`, error);

    return sendError(message, error);
  }

  /**
   * Register a new user
   */
  async register(registerData: IRegisterProps): Promise<IDataResponse> {
    try {
      this.logger.log(`Registering new user: ${registerData.email}`);

      // Create user in Firebase Auth
      const userRecord = await this.userService.createUser({
        email: registerData.email,
        password: registerData.password,
        displayName: registerData.username,
      });

      // Add user to database
      const newDbUser = await this.userService.addUserToDb({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: registerData.username || userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        googleCredentials: undefined,
      });

      // Generate custom token
      const customToken = await this.userService.generateCustomToken(
        userRecord.uid,
      );

      const photoURL = 'photoURL' in newDbUser ? newDbUser.photoURL : null;
      const displayName =
        'displayName' in newDbUser ? newDbUser.displayName : null;

      // Emit analytics events
      this.eventEmitter.emit('analytics.identify', userRecord.uid, {
        email: userRecord.email,
        name: displayName,
        avatar: photoURL,
      });
      this.eventEmitter.emit('analytics.track', 'User Registered', {
        userId: userRecord.uid,
        accountType: 'Email',
      });

      this.logger.log(`User registered successfully: ${userRecord.uid}`);

      return sendResponse({
        id: userRecord.uid,
        customToken,
        isVerified: false,
        photoURL,
        displayName,
        email: registerData.email,
      });
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  /**
   * Login user with email and password
   */
  async login(loginData: ILoginProps): Promise<IDataResponse> {
    try {
      this.logger.log(`User login attempt: ${loginData.email}`);

      // Check sign-in methods
      const signInMethodsResult =
        await this.firebaseAuthService.fetchSignInMethodsForEmail(
          loginData.email,
        );

      this.logger.error(signInMethodsResult);

      if (!signInMethodsResult.success) {
        throw new BadRequestException('Failed to check sign-in methods');
      }

      const signInMethods = signInMethodsResult.data?.signinMethods || [];
      if (signInMethods.includes('google.com')) {
        throw { code: 'custom/user-uses-google-auth' };
      }

      // Authenticate user
      const loginResult = await this.firebaseAuthService.login(
        loginData.email,
        loginData.password,
      );

      if (!loginResult) {
        throw new BadRequestException('Login failed');
      }

      // Get user metadata
      const { displayName, photoURL, isSlackIntegrate, dropbox, jira, trello } =
        await this.getUserMetadata(loginResult.localId);

      // Emit analytics events
      this.eventEmitter.emit('analytics.identify', loginResult.localId, {
        email: loginResult.email,
        name: displayName,
        avatar: photoURL,
      });
      this.eventEmitter.emit('analytics.track', 'User Logged', {
        userId: loginResult.localId,
        accountType: 'Email',
      });

      this.logger.log(`User logged in successfully: ${loginResult.localId}`);

      return sendResponse({
        id: loginResult.localId,
        refreshToken: loginResult.refreshToken,
        expiresAt: loginResult.expiresIn,
        idToken: loginResult.idToken,
        photoURL,
        displayName,
        email: loginData.email,
        isSlackIntegrate,
        dropbox,
        trello,
        jira,
      });
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    changePasswordData: IChangePasswordProps,
  ): Promise<IDataResponse> {
    try {
      this.logger.log(
        `Password change attempt for user: ${changePasswordData.uid}`,
      );

      // Check if user uses Google auth
      const signInMethodsResult =
        await this.firebaseAuthService.fetchSignInMethodsForEmail(
          changePasswordData.email,
        );

      if (!signInMethodsResult.success) {
        throw new BadRequestException('Failed to check sign-in methods');
      }

      const signInMethods = signInMethodsResult.data?.signinMethods || [];
      if (signInMethods.includes('google.com')) {
        throw { code: 'custom/user-uses-google-auth' };
      }

      // Verify old password
      const loginResult = await this.firebaseAuthService.login(
        changePasswordData.email,
        changePasswordData.oldPassword,
      );
      if (!loginResult) {
        throw new BadRequestException('Invalid old password');
      }

      // Update password
      await this.userService.updateUser(changePasswordData.uid, {
        password: changePasswordData.newPassword,
      });

      this.logger.log(
        `Password changed successfully for user: ${changePasswordData.uid}`,
      );

      return sendResponse('Password changed successfully!');
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  /**
   * Reauthenticate user
   */
  async reauthenticate(
    email: string,
    password: string,
  ): Promise<IDataResponse> {
    try {
      this.logger.log(`Reauthentication attempt: ${email}`);

      const loginResult = await this.firebaseAuthService.login(email, password);

      if (!loginResult) {
        throw new BadRequestException('Invalid credentials');
      }

      this.logger.log(`Reauthentication successful: ${loginResult.localId}`);

      return sendResponse({
        refreshToken: loginResult.refreshToken,
        expiresAt: loginResult.expiresIn,
        idToken: loginResult.idToken,
      });
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  /**
   * Get user metadata from database
   */
  private async getUserMetadata(uid: string) {
    try {
      const db = this.firebaseAdminService.getDatabase();
      const userRef = db.ref(`users/${uid}`);
      const snapshot = await userRef.get();
      const userData = snapshot.val();

      if (!userData) {
        throw new Error('User not found in database');
      }

      return {
        displayName: userData?.displayName || null,
        photoURL: userData?.photoURL || null,
        isSlackIntegrate: userData?.isSlackIntegrate || false,
        dropbox: {
          isDropBoxIntegrated:
            userData?.dropboxAPISCredentials &&
            userData.dropboxAPISCredentials.credentials &&
            userData.dropboxAPISCredentials.credentials.access_token
              ? true
              : false,
          email: userData?.dropboxAPISCredentials
            ? userData.dropboxAPISCredentials.email
            : null,
        },
        jira: {
          isIntegrated:
            userData?.jiraAPISCredentials &&
            userData.jiraAPISCredentials.credentials &&
            userData.jiraAPISCredentials.credentials.access_token
              ? true
              : false,
          email: userData?.jiraAPISCredentials
            ? userData.jiraAPISCredentials.email
            : null,
        },
        trello: {
          isIntegrated:
            userData?.trelloAPISCredentials &&
            userData.trelloAPISCredentials.credentials &&
            userData.trelloAPISCredentials.credentials.access_token
              ? true
              : false,
          email: userData?.trelloAPISCredentials
            ? userData.trelloAPISCredentials.email
            : null,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user metadata: ${uid}`, error);
      throw new BadRequestException('Failed to retrieve user metadata');
    }
  }
}
