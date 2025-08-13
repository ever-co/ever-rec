import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IDataResponse } from '../../../interfaces/_types';
import { sendError, sendResponse } from '../../../services/utils/sendResponse';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';

export interface IUserMetadata {
  displayName: string | null;
  photoURL: string | null;
  isSlackIntegrate: boolean;
  dropbox: {
    isDropBoxIntegrated: boolean;
    email: string | null;
  };
  jira: {
    isIntegrated: boolean;
    email: string | null;
  };
  trello: {
    isIntegrated: boolean;
    email: string | null;
  };
}

export interface IUserData {
  id: string;
  email: string | null;
  photoURL: string | null;
  displayName: string | null;
  isSlackIntegrate: boolean;
  favoriteFolders: any;
  dropbox: {
    isDropBoxIntegrated: boolean;
    email: string | null;
  };
  jira: {
    isIntegrated: boolean;
    email: string | null;
  };
  trello: {
    isIntegrated: boolean;
    email: string | null;
  };
}

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);
  private readonly rootDb = 'users';
  private readonly expirationTime500years: number;

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.expirationTime500years = 1000 * 15778476000;
  }

  /**
   * Get user data from database
   */
  async getUserData(uid: string): Promise<IDataResponse> {
    try {
      this.logger.debug(`Getting user data for: ${uid}`);

      const userRef = this.firebaseAdminService.getDatabaseRef(
        `${this.rootDb}/${uid}`,
      );
      const userSnap = await userRef.get();
      const userVal = userSnap.val();

      if (!userVal) {
        return sendError('User does not exist!');
      }

      const userData: IUserData = {
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
      };

      this.logger.debug(`User data retrieved successfully for: ${uid}`);

      return sendResponse(userData);
    } catch (error) {
      this.logger.error(`Failed to get user data: ${uid}`, error);
      return sendError('Failed to retrieve user data');
    }
  }

  /**
   * Get user metadata from database
   */
  async getUserMetadata(uid: string): Promise<IUserMetadata> {
    try {
      this.logger.debug(`Getting user metadata for: ${uid}`);

      const db = this.firebaseAdminService.getDatabase();
      const userRef = db.ref(`${this.rootDb}/${uid}`);
      const snapshot = await userRef.get();
      const userData = snapshot.val();

      if (!userData) {
        throw new Error('User not found in database');
      }

      const metadata: IUserMetadata = {
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

      this.logger.debug(`User metadata retrieved successfully for: ${uid}`);

      return metadata;
    } catch (error) {
      this.logger.error(`Failed to get user metadata: ${uid}`, error);
      throw new BadRequestException('Failed to retrieve user metadata');
    }
  }

  /**
   * Update user data in database
   */
  async updateUserData(
    uid: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<IDataResponse> {
    try {
      this.logger.log(`Updating user data for: ${uid}`);

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

      // Emit analytics event
      this.eventEmitter.emit('analytics.identify', uid, {
        name: displayName,
        avatar: photoURL,
      });

      this.logger.log(`User data updated successfully for: ${uid}`);

      return sendResponse(updatedUser);
    } catch (error: any) {
      this.logger.error(`Failed to update user data: ${uid}`, error);
      return sendError(error.message || 'Failed to update user data', error);
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(
    uid: string,
    avatar: Express.Multer.File,
  ): Promise<IDataResponse> {
    try {
      this.logger.log(`Uploading avatar for user: ${uid}`);

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

      this.logger.log(`Avatar uploaded successfully for user: ${uid}`);

      return sendResponse({ photoURL });
    } catch (error: any) {
      this.logger.error(`Failed to upload avatar: ${uid}`, error);
      return sendError(error.message || 'Failed to upload avatar', error);
    }
  }

  /**
   * Delete user files
   */
  async deleteUserFiles(userId: string): Promise<void> {
    try {
      this.logger.log(`Deleting user files for: ${userId}`);

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

  /**
   * Change user email
   */
  async changeUserEmail(uid: string, newEmail: string): Promise<IDataResponse> {
    try {
      this.logger.log(`Changing email for user: ${uid} to: ${newEmail}`);

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

      this.logger.log(`Email changed successfully for user: ${uid}`);

      return sendResponse({ email: newEmail });
    } catch (error: any) {
      this.logger.error(`Failed to change user email: ${uid}`, error);
      return sendError(error.message || 'Failed to change user email', error);
    }
  }
}
