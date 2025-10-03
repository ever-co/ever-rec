import { IRefreshTokenContext } from '../interfaces/token.interface';
import { BaseStrategyState } from './base-strategy.state';

export abstract class ValidateStrategyState extends BaseStrategyState<void> {
  protected async getToken(context: IRefreshTokenContext): Promise<string> {
    if (!this.providerId) {
      return context.token;
    }

    const currentCtx = await context.current();
    const provider = currentCtx?.get(this.providerId);

    return provider?.accessToken ?? context.token;
  }
}
