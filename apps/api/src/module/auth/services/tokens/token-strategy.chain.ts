import { Injectable } from '@nestjs/common';
import { TokenRefreshResponse, TokenState } from './interfaces/token.interface';

@Injectable()
export class TokenStrategyChain {
  private refreshHead?: TokenState<TokenRefreshResponse>;
  private validateHead?: TokenState<void>;

  public setInitialRefreshStrategy(strategy: TokenState<TokenRefreshResponse>) {
    this.refreshHead = strategy;
  }

  public setInitialValidateStrategy(strategy: TokenState<void>) {
    this.validateHead = strategy;
  }

  async resolveRefresh(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    if (!this.refreshHead) throw new Error('No refresh strategy linked');
    return this.refreshHead.resolve(refreshToken, request);
  }

  async resolveValidation(token: string, request: any): Promise<void> {
    if (!this.validateHead) throw new Error('No validate strategy linked');
    return this.validateHead.resolve(token, request);
  }
}
