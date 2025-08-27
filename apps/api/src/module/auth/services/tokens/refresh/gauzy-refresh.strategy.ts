import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GauzyAuthService } from 'src/module/gauzy';
import { TokenRefreshResponse } from '../interfaces/token.interface';
import { RefreshStrategyState } from '../states/refresh-strategy.state';


@Injectable()
export class GauzyRefreshStrategy extends RefreshStrategyState {
  constructor(
    private readonly gauzyAuthService: GauzyAuthService
  ) {
    super()
  }

  async supports(refreshToken: string): Promise<boolean> {
    // default to true if no other strategy matched
    return !!refreshToken;
  }

  async handle(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    const { data: { token } } = await this.gauzyAuthService.refreshToken(refreshToken);

    this.validateResponse(token);

    const expiresIn = 3000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      idToken: token,
      refreshToken,
      expiresAt,
    };
  }

  private validateResponse(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Invalid gaauzy refresh response');
    }
  }
}
