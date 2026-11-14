import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TokenService } from '../services/tokens';

/**
 * Sign-in is optional: a request with a valid session gets `request.user` the same way
 * `AuthGuard` sets it (every supported sign-in provider, and an expired token is renewed with the
 * refresh token), and a request without one, or with one that cannot be used, gets
 * `request.user = null`. It never rejects the request.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    request.user = null;

    const authHeader = request.headers['authorization'];
    const idToken = request.headers.idtoken || authHeader?.split(' ')[1];
    const refreshToken =
      request.headers.refreshtoken || request.headers['x-refresh-token'];

    if (idToken) {
      try {
        await this.tokenService.processToken(idToken, request);
        return true;
      } catch {
        request.user = null;
      }
    }

    if (refreshToken) {
      try {
        await this.tokenService.refreshToken(refreshToken, request);
      } catch {
        request.user = null;
      }
    }

    return true;
  }
}
