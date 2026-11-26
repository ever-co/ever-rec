import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../services/tokens';

export interface IRequestUser {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
  isVerified?: boolean;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) { }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // const idToken = request.headers.cookie.split('; ')[0].split('=')[1]
    // const refreshToken = request.headers.cookie.split('; ')[1].split('=')[1]

    try {
      const authHeader = request.headers['authorization'];
      const token = authHeader?.split(' ')[1];
      const idToken = request.headers.idtoken || token;

      if (!idToken) {
        throw new UnauthorizedException('Unauthorized user');
      }

      await this.tokenService.processToken(idToken, request);

      return true;
    } catch (e) {
      try {
        const accessToken = request.headers['x-refresh-token'];
        const refreshToken = request.headers.refreshtoken || accessToken;

        if (!refreshToken) {
          throw new UnauthorizedException('Unauthorized user');
        }

        const refreshed = await this.tokenService.refreshToken(refreshToken, request);
        // The header's ID token has expired; handlers that pass the session token on (the
        // verification mail asks Firebase with it) must use the fresh one.
        if (refreshed?.idToken) {
          request.refreshedIdToken = refreshed.idToken;
        }

        return true;
      } catch {
        throw new UnauthorizedException('Unauthorized user');
      }
    }
  }
}
