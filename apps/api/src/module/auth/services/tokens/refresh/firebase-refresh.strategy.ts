import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ITokenRefreshStrategy, TokenRefreshResponse } from '../interfaces/token.interface';
import { FirebaseRestService } from 'src/module/firebase/services/firebase-rest.service';
import { FirebaseAdminService } from 'src/module/firebase/services/firebase-admin.service';
import { UserFactory } from '../user.factory';
import { TokenStrategyChain } from '../token-strategy.chain';


@Injectable()
export class FirebaseRefreshStrategy implements ITokenRefreshStrategy {
  constructor(
    private readonly firebaseRest: FirebaseRestService,
    private readonly userFactory: UserFactory,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly tokenStrategyChain: TokenStrategyChain,
  ) {
    this.tokenStrategyChain.linkRefreshStrategy(this);
  }

  async supports(refreshToken: string): Promise<boolean> {
    // default to true if no other strategy matched
    return true;
  }

  async execute(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    const { data } = await this.firebaseRest.post('token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    this.validateResponse(data);

    const expiresIn = parseInt(data.expires_in, 10);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // validate new token and set request.user
    const decoded = await this.firebaseAdmin.verifyIdToken(data.id_token);
    request.user = this.userFactory.create(decoded);

    return {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  private validateResponse(data: any): void {
    if (!data?.id_token || !data?.refresh_token) {
      throw new UnauthorizedException('Invalid Firebase refresh response');
    }
  }
}
