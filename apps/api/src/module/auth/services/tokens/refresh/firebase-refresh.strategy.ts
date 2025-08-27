import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseRestService } from 'src/module/firebase/services/firebase-rest.service';
import { FirebaseAdminService } from 'src/module/firebase/services/firebase-admin.service';
import { UserFactory } from '../user.factory';
import { RefreshStrategyState } from '../states/refresh-strategy.state';
import { TokenRefreshResponse } from '../interfaces/token.interface';

@Injectable()
export class FirebaseRefreshStrategy extends RefreshStrategyState {
  constructor(
    private readonly firebaseRest: FirebaseRestService,
    private readonly userFactory: UserFactory,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) { super(); }

  public async supports(refreshToken: string): Promise<boolean> {
    return true; // fallback strategy
  }

  public async handle(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    const { data } = await this.firebaseRest.post('token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    if (!data?.id_token || !data?.refresh_token) {
      throw new UnauthorizedException('Invalid Firebase refresh response');
    }

    const expiresAt = new Date(Date.now() + parseInt(data.expires_in, 10) * 1000).toISOString();
    const decoded = await this.firebaseAdmin.verifyIdToken(data.id_token);
    request.user = this.userFactory.create(decoded);

    return {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }
}
