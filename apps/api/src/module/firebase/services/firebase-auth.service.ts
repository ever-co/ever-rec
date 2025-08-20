import { Injectable } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import {
  IFirebaseLogin,
  IVerifyAssertionResponse,
} from '../interfaces/firebase.model';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseRestService } from './firebase-rest.service';
import { ConfigService } from '@nestjs/config';

export interface IAuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface IUserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  customClaims?: any;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
}

@Injectable()
export class FirebaseAuthService {
  constructor(
    private readonly firebaseRestService: FirebaseRestService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly configService: ConfigService
  ) { }

  // Client-side operations using Identity Toolkit API
  public async sendVerificationEmail(idToken: string): Promise<IAuthResponse> {
    try {
      const { data } = await this.firebaseRestService.post(
        'accounts:sendOobCode',
        {
          requestType: 'VERIFY_EMAIL',
          idToken,
        },
      );
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VERIFICATION_EMAIL_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async sendPasswordResetEmail(email: string): Promise<IAuthResponse> {
    try {
      const { data } = await this.firebaseRestService.post(
        'accounts:sendOobCode',
        {
          requestType: 'PASSWORD_RESET',
          email,
        },
      );
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async reauthenticate(idToken: string): Promise<IAuthResponse> {
    try {
      const { data } = await this.firebaseRestService.post('accounts:lookup', {
        idToken,
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REAUTHENTICATION_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async login(email: string, password: string): Promise<IFirebaseLogin> {
    const { data } = await this.firebaseRestService.post(
      'accounts:signInWithPassword',
      {
        email,
        password,
        returnSecureToken: true,
      },
    );
    return data;
  }

  public async signup(email: string, password: string): Promise<IAuthResponse> {
    try {
      const { data } = await this.firebaseRestService.post('accounts:signUp', {
        email,
        password,
        returnSecureToken: true,
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async updatePassword(
    idToken: string,
    newPassword: string,
  ): Promise<IAuthResponse> {
    try {
      const { data } = await this.firebaseRestService.post('accounts:update', {
        idToken,
        password: newPassword,
        returnSecureToken: true,
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_PASSWORD_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async fetchSignInMethodsForEmail(
    email: string,
  ): Promise<IAuthResponse> {
    try {
      const { data } = await this.firebaseRestService.post(
        'accounts:createAuthUri',
        {
          identifier: email,
          continueUri: this.configService.getOrThrow<string>('firebase.identityToolkit.requestUri'),
        },
      );
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SIGNIN_METHODS_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  // Server-side operations using Admin SDK
  public async verifyToken(idToken: string): Promise<DecodedIdToken | null> {
    try {
      return await this.firebaseAdminService.verifyIdToken(idToken);
    } catch (error) {
      return null;
    }
  }

  public async getUserProfile(uid: string): Promise<IUserProfile | null> {
    try {
      const userRecord = await this.firebaseAdminService.getUser(uid);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        customClaims: userRecord.customClaims,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        },
      };
    } catch (error) {
      return null;
    }
  }

  public async getUserByEmail(email: string): Promise<IUserProfile | null> {
    try {
      const userRecord = await this.firebaseAdminService.getUserByEmail(email);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        customClaims: userRecord.customClaims,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        },
      };
    } catch (error) {
      return null;
    }
  }

  public async createUser(userData: {
    email: string;
    password: string;
    displayName?: string;
    customClaims?: any;
  }): Promise<IAuthResponse> {
    try {
      const userRecord = await this.firebaseAdminService.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        customClaims: userData.customClaims,
      });
      return { success: true, data: userRecord };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_USER_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async updateUser(
    uid: string,
    userData: {
      email?: string;
      displayName?: string;
      photoURL?: string;
      customClaims?: any;
    },
  ): Promise<IAuthResponse> {
    try {
      const userRecord = await this.firebaseAdminService.updateUser(
        uid,
        userData,
      );
      return { success: true, data: userRecord };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_USER_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async deleteUser(uid: string): Promise<IAuthResponse> {
    try {
      await this.firebaseAdminService.deleteUser(uid);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_USER_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async setCustomClaims(
    uid: string,
    customClaims: any,
  ): Promise<IAuthResponse> {
    try {
      await this.firebaseAdminService.setCustomClaims(uid, customClaims);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SET_CUSTOM_CLAIMS_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async getCustomClaims(uid: string): Promise<IAuthResponse> {
    try {
      const claims = await this.firebaseAdminService.getCustomClaims(uid);
      return { success: true, data: claims };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_CUSTOM_CLAIMS_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async createCustomToken(
    uid: string,
    additionalClaims?: object,
  ): Promise<IAuthResponse> {
    try {
      const customToken = await this.firebaseAdminService.createCustomToken(
        uid,
        additionalClaims,
      );
      return { success: true, data: { customToken } };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_CUSTOM_TOKEN_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async revokeUserSessions(uid: string): Promise<IAuthResponse> {
    try {
      await this.firebaseAdminService.revokeUserSessions(uid);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVOKE_SESSIONS_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async generateEmailVerificationLink(
    email: string,
    actionCodeSettings?: any,
  ): Promise<IAuthResponse> {
    try {
      const link =
        await this.firebaseAdminService.generateEmailVerificationLink(
          email,
          actionCodeSettings,
        );
      return { success: true, data: { link } };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATE_VERIFICATION_LINK_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async generatePasswordResetLink(
    email: string,
    actionCodeSettings?: any,
  ): Promise<IAuthResponse> {
    try {
      const link = await this.firebaseAdminService.generatePasswordResetLink(
        email,
        actionCodeSettings,
      );
      return { success: true, data: { link } };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATE_PASSWORD_RESET_LINK_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async generateSignInWithEmailLink(
    email: string,
    actionCodeSettings?: any,
  ): Promise<IAuthResponse> {
    try {
      const link = await this.firebaseAdminService.generateSignInWithEmailLink(
        email,
        actionCodeSettings,
      );
      return { success: true, data: { link } };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATE_SIGNIN_LINK_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  public async exchangeGoogleIdTokenWithFirebase(
    idToken: string,
  ): Promise<IAuthResponse<IVerifyAssertionResponse>> {
    try {
      const { data } = await this.firebaseRestService.post(
        'accounts:signInWithIdp',
        {
          postBody: `id_token=${idToken}&providerId=google.com`,
          requestUri: this.configService.getOrThrow<string>('firebase.identityToolkit.requestUri'),
          returnIdpCredential: true,
          returnSecureToken: true,
        },
      );
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXCHANGE_GOOGLE_ID_TOKEN_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }
}
