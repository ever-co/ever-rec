import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from 'src/module/firebase/services/firebase-admin.service';
import { FirebaseRestService } from 'src/module/firebase/services/firebase-rest.service';
import { IRefreshTokenContext, TokenRefreshResponse } from '../interfaces/token.interface';
import { RefreshStrategyState } from '../states/refresh-strategy.state';
import { UserFactory } from '../user.factory';
import { TokenStrategyChain } from '../token-strategy.chain';
import { GauzyRefreshStrategy } from './gauzy-refresh.strategy';
import { StateId } from '../../login/interfaces/login-state.interface';

@Injectable()
export class FirebaseRefreshStrategy extends RefreshStrategyState {
  private readonly logger = new Logger(FirebaseRefreshStrategy.name);
  constructor(
    private readonly firebaseRest: FirebaseRestService,
    private readonly userFactory: UserFactory,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly tokenStrategyChain: TokenStrategyChain,
    private readonly gauzyRefreshStrategy: GauzyRefreshStrategy
  ) {
    super();

    this.tokenId = StateId.FIREBASE;

    this.tokenStrategyChain.setInitialRefreshStrategy(this);
  }

  public async supports(refreshToken: string): Promise<boolean> {
    return !!refreshToken; // fallback strategy
  }

  public async handle({ request, result }: IRefreshTokenContext, token: string): Promise<TokenRefreshResponse> {
    const { data } = await this.firebaseRest.post('token', {
      grant_type: 'refresh_token',
      refresh_token: token,
    });

    if (!data?.id_token || !data?.refresh_token) {
      throw new UnauthorizedException('Invalid Firebase refresh response');
    }

    const expiresAt = new Date(Date.now() + parseInt(data.expires_in, 10) * 1000).toISOString();
    const decoded = await this.firebaseAdmin.verifyIdToken(data.id_token);
    request.user = this.userFactory.create(decoded);

    const response = {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt,
    }

    result.set(this.tokenId, {
      accessToken: data.id_token,
      refreshToken: data.refresh_token,
      data: response
    })

    this.setNext(this.gauzyRefreshStrategy);

    this.logger.log('Firebase tokens refreshed')

    return result.get(this.tokenId).data;
  }
}
