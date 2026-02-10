import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GauzyAuthService } from '../../../../gauzy';
import { IRefreshTokenContext, RefreshResponse } from '../interfaces/token.interface';
import { RefreshStrategyState } from '../states/refresh-strategy.state';
import { UnifiedRefreshStrategy } from './unified-refresh.strategy';
import { AuthProviderId } from '../../../interfaces/auth.interface';


@Injectable()
export class GauzyRefreshStrategy extends RefreshStrategyState {
  private readonly logger = new Logger(GauzyRefreshStrategy.name);
  constructor(
    private readonly gauzyAuthService: GauzyAuthService,
    private readonly unifiedRefreshStrategy: UnifiedRefreshStrategy
  ) {
    super();

    this.providerId = AuthProviderId.GAUZY;
  }

  async supports(refreshToken: string): Promise<boolean> {
    // default to true if no other strategy matched
    return !!refreshToken;
  }

  async handle({ result }: IRefreshTokenContext, refreshToken: string): Promise<RefreshResponse> {
    const { data: { token, refresh_token } } = await this.gauzyAuthService.refreshToken(refreshToken);

    this.validateResponse(token);
    this.validateResponse(refresh_token);

    const expiresIn = 3000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const response = {
      idToken: token,
      refreshToken: refresh_token,
      expiresAt,
    };

    result.set(this.providerId, {
      accessToken: token,
      refreshToken: refresh_token,
      data: response
    });

    this.setNext(this.unifiedRefreshStrategy);

    this.logger.log('Gauzy tokens refreshed.');

    return result.get(this.providerId).data;
  }

  private validateResponse(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Invalid gauzy refresh response');
    }
  }
}
