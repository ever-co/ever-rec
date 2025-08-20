import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseAdminService } from '../firebase/services/firebase-admin.service';
import { IRequestUser } from './guards/auth.guard';
import { FirebaseRestService } from '../firebase/services/firebase-rest.service';

export interface TokenRefreshResponse {
  idToken: string;
  refreshToken: string;
  expiresAt: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private eventEmitter: EventEmitter2,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly firebaseRestService: FirebaseRestService
  ) { }

  /**
   * Process and validate token with enhanced security
   */
  async processToken(token: string, request: any): Promise<void> {
    if (!token) {
      this.logger.warn('No token provided for authentication');
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      const decodedToken: DecodedIdToken =
        await this.firebaseAdminService.verifyIdToken(token);

      // Additional token validation
      if (!decodedToken.uid || !decodedToken.email) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user: IRequestUser = {
        id: decodedToken.uid,
        email: decodedToken.email,
        photoURL: decodedToken.picture || null,
        name:
          decodedToken.name ||
          decodedToken.display_name ||
          this.parseEmailToDisplayName(decodedToken.email),
        isVerified: decodedToken.email_verified || false,
      };

      request.user = user;

      // Log successful authentication (without sensitive data)
      this.logger.debug(
        `Token processed successfully for user: ${decodedToken.uid}`,
      );
    } catch (error: any) {
      this.logger.error('Token processing failed:', error);

      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Authentication token has expired');
      } else if (error.code === 'auth/id-token-revoked') {
        throw new UnauthorizedException(
          'Authentication token has been revoked',
        );
      } else if (error.code === 'auth/invalid-id-token') {
        throw new UnauthorizedException('Invalid authentication token');
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Refresh authentication token with enhanced error handling
   */
  async refreshToken(
    refreshToken: string,
    request: any,
  ): Promise<TokenRefreshResponse> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {

      const response = await this.firebaseRestService.post('token',
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }
      );

      const { data } = response;

      if (!data?.id_token || !data?.refresh_token) {
        throw new UnauthorizedException('Invalid refresh token response');
      }

      const expiresIn = parseInt(data.expires_in, 10);
      if (isNaN(expiresIn) || expiresIn <= 0) {
        throw new UnauthorizedException('Invalid token expiration time');
      }

      // Process the new token to validate and set user context
      await this.processToken(data.id_token, request);

      // Emit analytics event
      if (request.user?.id) {
        this.eventEmitter.emit('analytics.track', 'Token Refreshed', {
          userId: request.user.id,
        });
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      this.logger.log(
        `Token refreshed successfully for user: ${request.user?.id || 'unknown'}`,
      );

      return {
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresAt,
      };
    } catch (error: any) {
      this.logger.error('Token refresh failed:', error);

      if (error.response?.status === 400) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new InternalServerErrorException(
          'Authentication service timeout',
        );
      }

      throw new UnauthorizedException('Failed to refresh authentication token');
    }
  }

  private parseEmailToDisplayName(email: string): string {
    try {
      const [localPart] = email.split('@');
      if (!localPart) return 'User';

      // Remove common separators and capitalize first letter
      const cleanName = localPart
        .split(/[._-]/)
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join(' ');

      return cleanName || 'User';
    } catch (error) {
      this.logger.warn(
        `Failed to parse email to display name: ${email}`,
        error,
      );
      return 'User';
    }
  }
}
