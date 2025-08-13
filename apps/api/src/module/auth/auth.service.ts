import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { IResponseMetadata } from '../../interfaces/IResponseMetadata';
import { IUser } from '../../interfaces/IUser';
import { IDataResponse } from '../../interfaces/_types';
import { SharedService } from '../../services/shared/shared.service';
import { sendError, sendResponse } from '../../services/utils/sendResponse';
import { FirebaseAdminService } from '../firebase/services/firebase-admin.service';
import { FirebaseAuthService } from '../firebase/services/firebase-auth.service';

const defaultProblemMessage = 'There was a problem, please try again later...';

interface IRegisterProps {
  email: string;
  password: string;
  username: string;
}

interface ILoginProps {
  email: string;
  password: string;
}

interface ISignedUrlConfig {
  action: string;
  expires: string | number;
}

interface IUserWithCredentials {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  googleCredentials?: any;
}

export interface TokenRefreshResponse {
  idToken: string;
  refreshToken: string;
  expiresAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly config: ISignedUrlConfig;
  private readonly expirationTime500years: number;
  private readonly rootDb = 'users';

  constructor(
    private readonly sharedService: SharedService,
    private eventEmitter: EventEmitter2,
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
    this.expirationTime500years = 1000 * 15778476000;
  }

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

  private parseUserEmailToDisplayName(email: string): string {
    try {
      const rawUserName = email.split('@')[0];
      const userName = rawUserName.split(/\.|_/g);
      const parsedUserName = userName.join('');
      return parsedUserName || 'User';
    } catch (error) {
      this.logger.warn(
        `Failed to parse email to display name: ${email}`,
        error,
      );
      return 'User';
    }
  }

  private handleAuthError(error: any): IDataResponse<null> {
    const errorCode = error.code || 'unknown';
    const message = this.errorParser[errorCode] || defaultProblemMessage;

    this.logger.error(`Authentication error: ${errorCode}`, error);

    return sendError(message, error);
  }

  async addUserToDb(
    user: IUserWithCredentials,
  ): Promise<IUser | IResponseMetadata> {
    try {
      const userRef = this.firebaseAdminService.getDatabaseRef(
        `${this.rootDb}/${user.uid}`,
      );
      const snapshot = await userRef.get();

      if (!snapshot.exists()) {
        const newUser: IUser = {
          email: user.email,
          displayName:
            user.displayName || this.parseUserEmailToDisplayName(user.email),
          photoURL: user.photoURL || null,
          googleCredentials: user.googleCredentials || null,
        };

        await userRef.set(newUser);
        this.logger.log(`User added to database: ${user.uid}`);

        return newUser;
      } else {
        return {
          status: ResStatusEnum.error,
          message: 'User already exists!',
          error: null,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to add user to database: ${user.uid}`, error);
      throw new BadRequestException('Failed to create user profile');
    }
  }

  async getUserData(uid: string): Promise<IDataResponse> {
    try {
      const userRef = this.firebaseAdminService.getDatabaseRef(
        `${this.rootDb}/${uid}`,
      );
      const userSnap = await userRef.get();
      const userVal = userSnap.val();

      if (!userVal) {
        return sendError('User does not exist!');
      }

      return sendResponse({
        id: uid,
        email: userVal?.email,
        photoURL: userVal?.photoURL,
        displayName: userVal?.displayName,
        isSlackIntegrate: userVal?.isSlackIntegrate,
        favoriteFolders: userVal?.favoriteFolders,
        dropbox: {
          isDropBoxIntegrated: !!(
            userVal?.dropboxAPISCredentials &&
            userVal.dropboxAPISCredentials.credentials &&
            userVal.dropboxAPISCredentials.credentials.access_token
          ),
          email: userVal?.dropboxAPISCredentials
            ? userVal.dropboxAPISCredentials.email
            : null,
        },
        jira: {
          isIntegrated: !!(
            userVal?.jiraAPISCredentials &&
            userVal.jiraAPISCredentials.credentials &&
            userVal.jiraAPISCredentials.credentials.access_token
          ),
          email: userVal?.jiraAPISCredentials
            ? userVal.jiraAPISCredentials.email
            : null,
        },
        trello: {
          isIntegrated: !!(
            userVal?.trelloAPISCredentials &&
            userVal.trelloAPISCredentials.credentials &&
            userVal.trelloAPISCredentials.credentials.access_token
          ),
          email: userVal?.trelloAPISCredentials
            ? userVal.trelloAPISCredentials.email
            : null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get user data: ${uid}`, error);
      return sendError('Failed to retrieve user data');
    }
  }

  async register({
    email,
    password,
    username,
  }: IRegisterProps): Promise<IDataResponse> {
    try {
      // Use Firebase Admin SDK to create user
      const userRecord = await this.firebaseAdminService.createUser({
        email,
        password,
        displayName: username,
      });

      let newDbUser;
      if (userRecord) {
        newDbUser = await this.addUserToDb({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: username || userRecord.displayName,
          photoURL: userRecord.photoURL,
          emailVerified: userRecord.emailVerified,
          googleCredentials: undefined,
        });
      }

      // Generate custom token for the new user
      const customToken = await this.firebaseAdminService.createCustomToken(
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

      return sendResponse({
        id: userRecord.uid,
        customToken,
        isVerified: false,
        photoURL,
        displayName,
        email,
      });
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  private async getUserMetadata(uid: string) {
    try {
      const db = this.firebaseAdminService.getDatabase();
      const userRef = db.ref(`${this.rootDb}/${uid}`);
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

  async login({ email, password }: ILoginProps): Promise<IDataResponse> {
    try {
      // Check sign-in methods using Firebase Auth Service
      const signInMethodsResult =
        await this.firebaseAuthService.fetchSignInMethodsForEmail(email);

      if (!signInMethodsResult.success) {
        throw new BadRequestException('Failed to check sign-in methods');
      }

      const signInMethods = signInMethodsResult.data?.signinMethods || [];
      if (signInMethods.includes('google.com')) {
        throw { code: 'custom/user-uses-google-auth' };
      }

      // Use Firebase Auth Service for login
      const loginResult = await this.firebaseAuthService.login(email, password);

      if (!loginResult) {
        throw new BadRequestException('Login failed');
      }

      // Get user record to check email verification status
      const userRecord = await this.firebaseAdminService.getUser(loginResult.localId);

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

      return sendResponse({
        id: loginResult.localId,
        refreshToken: loginResult.refreshToken,
        expiresAt: loginResult.expiresIn,
        idToken: loginResult.idToken,
        photoURL,
        displayName,
        email,
        isVerified: userRecord.emailVerified,
        isSlackIntegrate,
        dropbox,
        trello,
        jira,
      });
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  async processGoogleLogin(credentials: string): Promise<IDataResponse> {
    try {
      // Verify the Google ID token using Firebase Admin SDK
      const decodedToken =
        await this.firebaseAdminService.verifyIdToken(credentials);

      // Check if user exists, if not create them
      let userRecord: admin.auth.UserRecord;
      try {
        userRecord = await this.firebaseAdminService.getUser(decodedToken.uid);
      } catch (error) {
        // User doesn't exist, create them
        userRecord = await this.firebaseAdminService.createUser({
          email: decodedToken.email,
          displayName: decodedToken.name || decodedToken.display_name,
          photoURL: decodedToken.picture,
        });
      }

      // Add user to database if needed
      await this.addUserToDb({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        googleCredentials: { provider: 'google.com' },
      });

      const email = userRecord.email;
      const { displayName, photoURL, isSlackIntegrate, dropbox, jira, trello } =
        await this.getUserMetadata(userRecord.uid);

      // Generate custom token
      const customToken = await this.firebaseAdminService.createCustomToken(
        userRecord.uid,
      );

      // Emit analytics events
      this.eventEmitter.emit('analytics.identify', userRecord.uid, {
        email: email,
        name: displayName,
        avatar: photoURL,
      });

      this.eventEmitter.emit('analytics.track', 'User Logged', {
        userId: userRecord.uid,
        accountType: 'Google',
      });

      return sendResponse({
        id: userRecord.uid,
        customToken,
        isVerified: userRecord.emailVerified,
        photoURL,
        displayName,
        email,
        isSlackIntegrate,
        dropbox,
        jira,
        isNewUser: !userRecord.metadata.lastSignInTime,
        trello,
      });
    } catch (error: any) {
      this.logger.error('Google login failed', error);
      return sendError('Google login failed', error);
    }
  }

  async updateUserData(
    uid: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<IDataResponse> {
    try {
      const userRef = this.firebaseAdminService.getDatabaseRef(
        `${this.rootDb}/${uid}`,
      );
      let snapshot = await userRef.get();

      if (!snapshot.exists()) {
        throw new BadRequestException(
          `Could not get user reference with uid: ${uid}`,
        );
      }

      const updates = {
        displayName: displayName || snapshot.val().displayName || null,
        photoURL: photoURL || snapshot.val().photoURL || null,
      };

      await userRef.update(updates);

      const updatedUser = snapshot.val();
      this.eventEmitter.emit('analytics.identify', uid, {
        name: displayName,
        avatar: photoURL,
      });

      return sendResponse(updatedUser);
    } catch (error: any) {
      this.logger.error(`Failed to update user data: ${uid}`, error);
      return sendError(error.message || defaultProblemMessage, error);
    }
  }

  async uploadAvatar(
    uid: string,
    avatar: Express.Multer.File,
  ): Promise<IDataResponse> {
    try {
      const bucket = this.firebaseAdminService.getStorageBucket();
      const avaRef = bucket.file(`users/${uid}/tools/avatar`);

      await avaRef.save(avatar.buffer);

      const photoURL = (
        await avaRef.getSignedUrl({
          action: 'read',
          expires: Date.now() + this.expirationTime500years,
        })
      )[0];

      await this.updateUserData(uid, undefined, photoURL);
      this.eventEmitter.emit('analytics.identify', uid, {
        avatar: photoURL,
      });

      return sendResponse({ photoURL });
    } catch (error: any) {
      this.logger.error(`Failed to upload avatar: ${uid}`, error);
      return sendError(error.message || defaultProblemMessage, error);
    }
  }

  async changeUserEmail(uid: string, newEmail: string): Promise<IDataResponse> {
    try {
      await this.firebaseAdminService.updateUser(uid, { email: newEmail });

      const userRef = this.firebaseAdminService.getDatabaseRef(
        `${this.rootDb}/${uid}`,
      );
      await userRef.update({ email: newEmail });

      this.eventEmitter.emit('analytics.identify', uid, {
        email: newEmail,
      });
      this.eventEmitter.emit('analytics.track', 'User Email Changed.', {
        userId: uid,
        newEmail: newEmail,
      });

      return sendResponse({ email: newEmail });
    } catch (error: any) {
      this.logger.error(`Failed to change user email: ${uid}`, error);
      return sendError(error.message || defaultProblemMessage, error);
    }
  }

  async changeUserPassword(
    uid: string,
    email: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<IDataResponse> {
    try {
      // Check if user uses Google auth
      const signInMethodsResult =
        await this.firebaseAuthService.fetchSignInMethodsForEmail(email);

      if (!signInMethodsResult.success) {
        throw new BadRequestException('Failed to check sign-in methods');
      }

      const signInMethods = signInMethodsResult.data?.signinMethods || [];
      if (signInMethods.includes('google.com')) {
        throw { code: 'custom/user-uses-google-auth' };
      }

      // Verify old password using Firebase Auth Service
      const loginResult = await this.firebaseAuthService.login(
        email,
        oldPassword,
      );
      if (!loginResult) {
        throw new BadRequestException('Invalid old password');
      }

      // Update password using admin service
      await this.firebaseAdminService.updateUser(uid, {
        password: newPassword,
      });

      return sendResponse('Password changed successfully!');
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  async deleteUser(uid: string): Promise<IDataResponse> {
    try {
      const userRef = this.firebaseAdminService.getDatabaseRef(
        `${this.rootDb}/${uid}`,
      );

      await Promise.all([
        this.sharedService.removeShared(uid),
        this.deleteUserFiles(uid),
        userRef.remove(),
        this.firebaseAdminService.deleteUser(uid),
      ]);

      this.eventEmitter.emit(
        'analytics.track',
        'User deleted! All user files deleted!',
        { userId: uid },
      );

      return sendResponse(null);
    } catch (error: any) {
      this.logger.error(`Failed to delete user: ${uid}`, error);
      return sendError(
        'Error while trying to delete user or user files!',
        error,
      );
    }
  }

  async deleteUserFiles(userId: string): Promise<void> {
    try {
      const bucket = this.firebaseAdminService.getStorageBucket();
      const userFolder = `users/${userId}`;

      await bucket.deleteFiles({ prefix: userFolder });
      this.logger.log(
        `All user files deleted successfully for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting user files: ${userId}`, error);
      throw error;
    }
  }

  async generateEmailVerificationLink(email: string): Promise<IDataResponse> {
    try {
      const user = await this.firebaseAdminService.getUserByEmail(email);

      if (user.emailVerified) {
        throw new ConflictException('Email already verified');
      }

      const link =
        await this.firebaseAdminService.generateEmailVerificationLink(email);

      return sendResponse({ link });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate email verification link: ${email}`,
        error,
      );
      if (error instanceof ConflictException) {
        throw error;
      }
      return sendError('Failed to generate verification link', error);
    }
  }

  async getUserById(uid: string) {
    try {
      return await this.firebaseAdminService.getUser(uid);
    } catch (error) {
      this.logger.error(`Failed to get user by ID: ${uid}`, error);
      throw new BadRequestException('User not found');
    }
  }

  async reauthenticate(
    email: string,
    password: string,
  ): Promise<IDataResponse> {
    try {
      const loginResult = await this.firebaseAuthService.login(email, password);

      if (!loginResult) {
        throw new BadRequestException('Invalid credentials');
      }

      // Get user record to check email verification status
      const userRecord = await this.firebaseAdminService.getUser(loginResult.localId);

      return sendResponse({
        refreshToken: loginResult.refreshToken,
        expiresAt: loginResult.expiresIn,
        idToken: loginResult.idToken,
        isVerified: userRecord.emailVerified,
      });
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  // New methods for enhanced functionality
  async sendPasswordResetEmail(email: string): Promise<IDataResponse> {
    try {
      const result =
        await this.firebaseAuthService.sendPasswordResetEmail(email);

      if (result.success) {
        return sendResponse({
          message: 'Password reset email sent successfully',
        });
      } else {
        return sendError(
          result.error?.message || 'Failed to send password reset email',
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email: ${email}`, error);
      return sendError('Failed to send password reset email', error);
    }
  }

  async sendEmailVerification(idToken: string): Promise<IDataResponse> {
    try {
      const result =
        await this.firebaseAuthService.sendVerificationEmail(idToken);

      if (result.success) {
        return sendResponse({
          message: 'Verification email sent successfully',
        });
      } else {
        return sendError(
          result.error?.message || 'Failed to send verification email',
        );
      }
    } catch (error: any) {
      this.logger.error('Failed to send verification email', error);
      return sendError('Failed to send verification email', error);
    }
  }

  async setUserCustomClaims(uid: string, claims: any): Promise<IDataResponse> {
    try {
      await this.firebaseAdminService.setCustomClaims(uid, claims);
      return sendResponse({ message: 'Custom claims updated successfully' });
    } catch (error: any) {
      this.logger.error(`Failed to set custom claims: ${uid}`, error);
      return sendError('Failed to update custom claims', error);
    }
  }
}
