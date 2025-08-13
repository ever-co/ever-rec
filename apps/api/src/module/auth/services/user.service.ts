import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { IResponseMetadata } from '../../../interfaces/IResponseMetadata';
import { IUser } from '../../../interfaces/IUser';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';

export interface IUserWithCredentials {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  googleCredentials?: any;
}

export interface ICreateUserData {
  email: string;
  password?: string;
  displayName?: string;
  photoURL?: string;
  customClaims?: any;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly rootDb = 'users';

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  /**
   * Parse email to display name
   */
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

  /**
   * Create a new user in Firebase Auth
   */
  async createUser(userData: ICreateUserData): Promise<admin.auth.UserRecord> {
    try {
      this.logger.log(`Creating user with email: ${userData.email}`);

      const userRecord = await this.firebaseAdminService.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        customClaims: userData.customClaims,
      });

      this.logger.log(`User created successfully: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      this.logger.error(`Failed to create user: ${userData.email}`, error);
      throw new BadRequestException('Failed to create user account');
    }
  }

  /**
   * Add user to database
   */
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

  /**
   * Get user by UID
   */
  async getUserById(uid: string): Promise<admin.auth.UserRecord> {
    try {
      this.logger.debug(`Getting user by ID: ${uid}`);
      return await this.firebaseAdminService.getUser(uid);
    } catch (error) {
      this.logger.error(`Failed to get user by ID: ${uid}`, error);
      throw new BadRequestException('User not found');
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      this.logger.debug(`Getting user by email: ${email}`);
      return await this.firebaseAdminService.getUserByEmail(email);
    } catch (error) {
      this.logger.error(`Failed to get user by email: ${email}`, error);
      throw new BadRequestException('User not found');
    }
  }

  /**
   * Update user data
   */
  async updateUser(
    uid: string,
    userData: {
      email?: string;
      displayName?: string;
      photoURL?: string;
      password?: string;
      customClaims?: any;
    },
  ): Promise<admin.auth.UserRecord> {
    try {
      this.logger.log(`Updating user: ${uid}`);
      return await this.firebaseAdminService.updateUser(uid, userData);
    } catch (error) {
      this.logger.error(`Failed to update user: ${uid}`, error);
      throw new BadRequestException('Failed to update user');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      this.logger.log(`Deleting user: ${uid}`);
      await this.firebaseAdminService.deleteUser(uid);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${uid}`, error);
      throw new BadRequestException('Failed to delete user');
    }
  }

  /**
   * Set custom claims for user
   */
  async setCustomClaims(uid: string, claims: any): Promise<void> {
    try {
      this.logger.log(`Setting custom claims for user: ${uid}`);
      await this.firebaseAdminService.setCustomClaims(uid, claims);
    } catch (error) {
      this.logger.error(`Failed to set custom claims for user: ${uid}`, error);
      throw new BadRequestException('Failed to update custom claims');
    }
  }

  /**
   * Generate custom token for user
   */
  async generateCustomToken(uid: string): Promise<string> {
    try {
      this.logger.debug(`Generating custom token for user: ${uid}`);
      return await this.firebaseAdminService.createCustomToken(uid);
    } catch (error) {
      this.logger.error(
        `Failed to generate custom token for user: ${uid}`,
        error,
      );
      throw new BadRequestException('Failed to generate authentication token');
    }
  }

  /**
   * Verify ID token
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      this.logger.debug('Verifying ID token');
      return await this.firebaseAdminService.verifyIdToken(idToken);
    } catch (error) {
      this.logger.error('Failed to verify ID token', error);
      throw new BadRequestException('Invalid authentication token');
    }
  }
}
