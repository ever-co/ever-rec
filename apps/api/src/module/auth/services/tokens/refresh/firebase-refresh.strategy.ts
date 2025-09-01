import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from '../../../../firebase/services/firebase-admin.service';
import { FirebaseRestService } from '../../../../firebase/services/firebase-rest.service';
import { IRefreshTokenContext, TokenRefreshResponse } from '../interfaces/token.interface';
import { RefreshStrategyState } from '../states/refresh-strategy.state';
import { UserFactory } from '../user.factory';
import { GauzyRefreshStrategy } from './gauzy-refresh.strategy';
import { StateId } from '../../login/interfaces/login-state.interface';
import { GAUZY_AVAILABLE } from '../../../../gauzy';

@Injectable()
export class FirebaseRefreshStrategy extends RefreshStrategyState {
  private readonly logger = new Logger(FirebaseRefreshStrategy.name);
  constructor(
    private readonly firebaseRest: FirebaseRestService,
    private readonly userFactory: UserFactory,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly gauzyRefreshStrategy: GauzyRefreshStrategy,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) {
    super();

    this.tokenId = StateId.FIREBASE;
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
    };

    result.set(this.tokenId, {
      accessToken: data.id_token,
      refreshToken: data.refresh_token,
      data: response
    });

    if (this.isGauzyAvailable) {
      this.setNext(this.gauzyRefreshStrategy);
    }

    this.logger.log('Firebase tokens refreshed');

    return result.get(this.tokenId).data;
  }
}
