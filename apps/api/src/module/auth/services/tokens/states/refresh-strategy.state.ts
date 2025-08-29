import { IRefreshTokenContext, TokenRefreshResponse } from '../interfaces/token.interface';
import { BaseStrategyState } from './base-strategy.state';

export abstract class RefreshStrategyState extends BaseStrategyState<TokenRefreshResponse> {
  protected async getToken(context: IRefreshTokenContext): Promise<string> {
    if (!this.tokenId) {
      return context.token;
    }

    const currentCtx = await context.current();
    const ctx = currentCtx?.get(this.tokenId);

    return ctx?.refreshToken ?? context.token;
  }
}
