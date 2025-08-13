import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  CreateRequest,
  DecodedIdToken,
  UpdateRequest,
  UserRecord
} from 'firebase-admin/auth';
import { FIREBASE_ADMIN } from '../firebase.constants';

export interface IUserCustomClaims {
  role?: string;
  permissions?: string[];
  subscription?: {
    plan: string;
    expiresAt: number;
  };
  [key: string]: any;
}

export interface ICreateUserRequest extends CreateRequest {
  customClaims?: IUserCustomClaims;
}

export interface IUpdateUserRequest extends UpdateRequest {
  customClaims?: IUserCustomClaims;
}

@Injectable()
export class FirebaseAdminService {
  private readonly auth: admin.auth.Auth;
  private readonly database: admin.database.Database;

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly app: admin.app.App
  ) {
    this.auth = this.app.auth();
    this.database = this.app.database();
  }

  /**
   * Get auth instance
   */
  getAuth(): admin.auth.Auth {
    return this.auth;
  }

  /**
   * Get database instance
   */
  getDatabase(): admin.database.Database {
    return this.database;
  }

  /**
   * Get database reference
   */
  getDatabaseRef(path: string): admin.database.Reference {
    return this.database.ref(path);
  }

  /**
   * Create a new user with optional custom claims
   */
  async createUser(userData: ICreateUserRequest): Promise<UserRecord> {
    const { customClaims, ...userRequest } = userData;

    const userRecord = await this.auth.createUser(userRequest);

    if (customClaims) {
      await this.auth.setCustomUserClaims(userRecord.uid, customClaims);
    }

    return userRecord;
  }

  /**
   * Get user by UID
   */
  async getUser(uid: string): Promise<UserRecord> {
    return this.auth.getUser(uid);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserRecord> {
    return this.auth.getUserByEmail(email);
  }

  /**
   * Update user data
   */
  async updateUser(
    uid: string,
    userData: IUpdateUserRequest,
  ): Promise<UserRecord> {
    const { customClaims, ...userRequest } = userData;

    const userRecord = await this.auth.updateUser(uid, userRequest);

    if (customClaims) {
      await this.auth.setCustomUserClaims(uid, customClaims);
    }

    return userRecord;
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<void> {
    return this.auth.deleteUser(uid);
  }

  /**
   * Set custom claims for a user
   */
  async setCustomClaims(
    uid: string,
    customClaims: IUserCustomClaims,
  ): Promise<void> {
    return this.auth.setCustomUserClaims(uid, customClaims);
  }

  /**
   * Get custom claims for a user
   */
  async getCustomClaims(uid: string): Promise<IUserCustomClaims | null> {
    const userRecord = await this.auth.getUser(uid);
    return (userRecord.customClaims as IUserCustomClaims) || null;
  }

  /**
   * Verify ID token
   */
  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    return this.auth.verifyIdToken(idToken);
  }

  /**
   * Create custom token
   */
  async createCustomToken(
    uid: string,
    additionalClaims?: object,
  ): Promise<string> {
    return this.auth.createCustomToken(uid, additionalClaims);
  }

  /**
   * Revoke refresh tokens for a user
   */
  async revokeRefreshTokens(uid: string): Promise<void> {
    return this.auth.revokeRefreshTokens(uid);
  }

  /**
   * Revoke user sessions (alias for revokeRefreshTokens)
   */
  async revokeUserSessions(uid: string): Promise<void> {
    return this.auth.revokeRefreshTokens(uid);
  }

  /**
   * Generate email verification link
   */
  async generateEmailVerificationLink(
    email: string,
    actionCodeSettings?: admin.auth.ActionCodeSettings,
  ): Promise<string> {
    return this.auth.generateEmailVerificationLink(email, actionCodeSettings);
  }

  /**
   * Generate password reset link
   */
  async generatePasswordResetLink(
    email: string,
    actionCodeSettings?: admin.auth.ActionCodeSettings,
  ): Promise<string> {
    return this.auth.generatePasswordResetLink(email, actionCodeSettings);
  }

  /**
   * Generate email sign-in link
   */
  async generateSignInWithEmailLink(
    email: string,
    actionCodeSettings?: admin.auth.ActionCodeSettings,
  ): Promise<string> {
    return this.auth.generateSignInWithEmailLink(email, actionCodeSettings);
  }

  /**
   * Check if user exists
   */
  async userExists(uid: string): Promise<boolean> {
    try {
      await this.auth.getUser(uid);
      return true;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get storage bucket
   */
  getStorageBucket(): any {
    return this.app.storage().bucket();
  }
}
