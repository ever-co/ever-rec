import { IRefreshTokenContext, TokenRefreshResponse } from '../interfaces/token.interface';
import { BaseStrategyState } from './base-strategy.state';

export abstract class RefreshStrategyState extends BaseStrategyState<TokenRefreshResponse> {
  protected async getToken(context: IRefreshTokenContext): Promise<string> {
    if (!this.providerId) {
      return context.token;
    }

    const currentCtx = await context.current();
    const provider = currentCtx?.get(this.providerId);

    return provider?.refreshToken ?? context.token;
  }
}
