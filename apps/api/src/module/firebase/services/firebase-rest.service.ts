import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from 'nestjs-http-promise';

export interface IFirebaseRestError {
  error: {
    code: number;
    message: string;
    errors?: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

@Injectable()
export class FirebaseRestService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(FirebaseRestService.name);

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.baseUrl = 'https://identitytoolkit.googleapis.com/v1';
    this.apiKey = configService.get<string>('firebase.apiKey');
  }

  private url(path: string) {
    return `${this.baseUrl}/${path}?key=${this.apiKey}`;
  }



  public async post<U = any, T = any>(path: string, data: U): Promise<{ data: T }> {
    try {
      return this.httpService.post<T>(this.url(path), data);
    } catch (error) {
      this.logger.error(`Firebase REST API error: ${error.message}`, error.stack);

      if (error.response?.data) {
        const firebaseError = error.response.data as IFirebaseRestError;
        throw new Error(firebaseError.error.message || 'Firebase API error');
      }

      throw error;
    }
  }

  public async put<U = any, T = any>(path: string, data: U): Promise<{ data: T }> {
    try {
      return this.httpService.put<T>(this.url(path), data);
    } catch (error) {
      this.logger.error(`Firebase REST API error: ${error.message}`, error.stack);

      if (error.response?.data) {
        const firebaseError = error.response.data as IFirebaseRestError;
        throw new Error(firebaseError.error.message || 'Firebase API error');
      }

      throw error;
    }
  }

  public async get<T = any>(path: string): Promise<{ data: T }> {
    try {
      return this.httpService.get<T>(this.url(path));
    } catch (error) {
      this.logger.error(`Firebase REST API error: ${error.message}`, error.stack);

      if (error.response?.data) {
        const firebaseError = error.response.data as IFirebaseRestError;
        throw new Error(firebaseError.error.message || 'Firebase API error');
      }

      throw error;
    }
  }

  public async delete<T = any>(path: string): Promise<{ data: T }> {
    try {
      return this.httpService.delete<T>(this.url(path));
    } catch (error) {
      this.logger.error(`Firebase REST API error: ${error.message}`, error.stack);

      if (error.response?.data) {
        const firebaseError = error.response.data as IFirebaseRestError;
        throw new Error(firebaseError.error.message || 'Firebase API error');
      }

      throw error;
    }
  }

  public async patch<U = any, T = any>(path: string, data: U): Promise<{ data: T }> {
    try {
      return this.httpService.patch<T>(this.url(path), data);
    } catch (error) {
      this.logger.error(`Firebase REST API error: ${error.message}`, error.stack);

      if (error.response?.data) {
        const firebaseError = error.response.data as IFirebaseRestError;
        throw new Error(firebaseError.error.message || 'Firebase API error');
      }

      throw error;
    }
  }

  // Identity Toolkit API specific methods
  public async signInWithCustomToken(customToken: string) {
    return this.post('accounts:signInWithCustomToken', {
      token: customToken,
      returnSecureToken: true,
    });
  }

  public async signInWithIdp(idToken: string, postBody: any) {
    return this.post('accounts:signInWithIdp', {
      idToken,
      postBody,
      returnSecureToken: true,
    });
  }

  public async signInAnonymously() {
    return this.post('accounts:signUp', {
      returnSecureToken: true,
    });
  }

  public async linkWithIdp(idToken: string, postBody: any) {
    return this.post('accounts:signInWithIdp', {
      idToken,
      postBody,
      returnSecureToken: true,
    });
  }

  public async unlinkProvider(idToken: string, deleteProvider: string[]) {
    return this.post('accounts:update', {
      idToken,
      deleteProvider,
      returnSecureToken: true,
    });
  }

  public async getAccountInfo(idToken: string) {
    return this.post('accounts:lookup', {
      idToken,
    });
  }

  public async updateProfile(idToken: string, displayName?: string, photoURL?: string) {
    return this.post('accounts:update', {
      idToken,
      displayName,
      photoURL,
      returnSecureToken: true,
    });
  }

  public async deleteAccount(idToken: string) {
    return this.post('accounts:delete', {
      idToken,
    });
  }

  public async confirmPasswordReset(oobCode: string, newPassword: string) {
    return this.post('accounts:confirm', {
      oobCode,
      newPassword,
    });
  }

  public async verifyPasswordResetCode(oobCode: string) {
    return this.post('accounts:confirm', {
      oobCode,
    });
  }

  public async applyActionCode(oobCode: string) {
    return this.post('accounts:confirm', {
      oobCode,
    });
  }

  public async getOobConfirmationCode(email: string, requestType: string, actionCodeSettings?: any) {
    return this.post('accounts:sendOobCode', {
      email,
      requestType,
      actionCodeSettings,
    });
  }

  public async getRecaptchaParams() {
    return this.get('recaptchaParams');
  }

  public async getProjectConfig() {
    return this.get('projectConfig');
  }

  public async getSessionInfo(idToken: string) {
    return this.post('accounts:lookup', {
      idToken,
    });
  }

  public async createSessionCookie(idToken: string, validDuration: number) {
    return this.post('accounts:createSessionCookie', {
      idToken,
      validDuration,
    });
  }

  public async exchangeCustomTokenForIdToken(customToken: string) {
    return this.post('accounts:signInWithCustomToken', {
      token: customToken,
      returnSecureToken: true,
    });
  }

  public async exchangeRefreshTokenForIdToken(refreshToken: string) {
    return this.post('token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  public async exchangeCodeForIdToken(code: string, redirectUri: string) {
    return this.post('token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
  }
}
