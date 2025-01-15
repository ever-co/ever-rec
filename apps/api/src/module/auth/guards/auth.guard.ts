import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAuth } from 'firebase-admin/auth';
import { HttpService } from 'nestjs-http-promise';

export interface IRequestUser {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async processToken(token: string, request: any): Promise<void> {
    if (!token) {
      console.log('No token - At processToken(), auth.guard.ts');
      return;
    }

    const user = await getAuth().verifyIdToken(token);
    const newUser: IRequestUser = {
      id: user.uid,
      email: user.email,
      photoURL: user.picture, //? this sometimes gives us wrong reference
      name: user.name || user.displayName, //? not sure about this field - we have displayName
    };

    request.user = newUser;
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
    // const idToken = request.headers.cookie.split('; ')[0].split('=')[1]
    // const refreshToken = request.headers.cookie.split('; ')[1].split('=')[1]

    try {
      const idToken = request.headers.idtoken;

      if (!idToken) {
        throw new UnauthorizedException('Unauthorized user');
      }

      await this.processToken(idToken, request);

      return true;
    } catch (e) {
      if (e.code === 'auth/id-token-expired') {
        try {
          const refreshToken = request.headers.refreshtoken;

          if (!refreshToken) {
            throw new UnauthorizedException('Unauthorized user');
          }

          await this.refreshToken(refreshToken, request);

          return true;
        } catch {
          throw new UnauthorizedException('Unauthorized user');
        }
      }

      throw new UnauthorizedException('Unauthorized user');
    }
  }
}
