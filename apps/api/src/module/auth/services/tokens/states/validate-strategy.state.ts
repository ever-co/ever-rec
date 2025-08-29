import { IRefreshTokenContext } from '../interfaces/token.interface';
import { BaseStrategyState } from './base-strategy.state';

export abstract class ValidateStrategyState extends BaseStrategyState<void> {
  protected async getToken(context: IRefreshTokenContext): Promise<string> {
    if (!this.tokenId) {
      return context.token;
    }

    const currentCtx = await context.current();
    const ctx = currentCtx?.get(this.tokenId);

    return ctx?.accessToken ?? context.token;
  }
}
