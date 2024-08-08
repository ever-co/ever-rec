import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAuth } from 'firebase-admin/auth';
import { HttpService } from 'nestjs-http-promise';

// TODO: This should be refactored, it is not a guard but a parser of the token, it always returns true.
// We should use something like decorator, but they are functions and I need HttpService to use the fetch.
// There is surely a way, but we needed it fast so it is a guard for now.
@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async processToken(token: string, request: any): Promise<void> {
    const user = await getAuth().verifyIdToken(token);

    request.user = {
      id: user.uid,
      email: user.email,
      photoURL: user.picture, //? this sometimes gives us wrong reference
      name: user.name, //? not sure about this field - we have displayName
    };
  }

  async refreshToken(refreshToken: string, request: any): Promise<any> {
    const { data } = await this.httpService.post<any, any>(
      `https://securetoken.googleapis.com/v1/token?key=${this.configService.get<string>(
        'FIREBASE_API_KEY',
      )}`,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
    );
    // @ts-ignore
    await this.processToken(data.id_token, request);

    return { idToken: data.id_token, refreshToken: data.refresh_token };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const idToken = request.headers.idtoken;

      await this.processToken(idToken, request);

      return true;
    } catch (e) {
      if (e.code === 'auth/id-token-expired') {
        try {
          const refreshToken = request.headers.refreshtoken;
          await this.refreshToken(refreshToken, request);

          return true;
        } catch (e) {
          console.log(e);
          request.user = null;
          return true;
        }
      }

      console.log(e);
      request.user = null;
      return true;
    }
  }
}
