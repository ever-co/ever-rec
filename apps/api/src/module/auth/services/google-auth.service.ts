import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import { IDataResponse } from '../../../interfaces/_types';
import { sendError, sendResponse } from '../../../services/utils/sendResponse';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { UserService } from './user.service';

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process Google login with ID token
   */
  async processGoogleLogin(credentials: string): Promise<IDataResponse> {
    try {
      this.logger.log('Processing Google login');

      // Verify the Google ID token using Firebase Admin SDK
      const decodedToken = await this.userService.verifyIdToken(credentials);

      // Check if user exists, if not create them
      let userRecord: admin.auth.UserRecord;
      try {
        userRecord = await this.userService.getUserById(decodedToken.uid);
        this.logger.log(`Existing user found: ${userRecord.uid}`);
      } catch (error) {
        // User doesn't exist, create them
        this.logger.log(
          `Creating new user from Google token: ${decodedToken.uid}`,
        );
        userRecord = await this.userService.createUser({
          email: decodedToken.email,
          displayName: decodedToken.name || decodedToken.display_name,
          photoURL: decodedToken.picture,
        });
      }

      // Add user to database if needed
      await this.userService.addUserToDb({
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
      const customToken = await this.userService.generateCustomToken(
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

      this.logger.log(`Google login successful: ${userRecord.uid}`);

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

  /**
   * Check if user uses Google authentication
   */
  async checkGoogleAuth(email: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking Google auth for email: ${email}`);

      // This would typically check the user's sign-in methods
      // For now, we'll check if the user exists and has Google credentials
      const userRecord = await this.userService.getUserByEmail(email);

      // Check if user has Google provider data
      const hasGoogleProvider = userRecord.providerData.some(
        (provider) => provider.providerId === 'google.com',
      );

      return hasGoogleProvider;
    } catch (error) {
      this.logger.error(
        `Failed to check Google auth for email: ${email}`,
        error,
      );
      return false;
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
      throw new Error('Failed to retrieve user metadata');
    }
  }
}
