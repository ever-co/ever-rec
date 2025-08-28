import { Injectable } from '@nestjs/common';
import { TokenRefreshResponse, TokenState } from './interfaces/token.interface';
import { RefreshTokenContext } from './refresh/refresh-token.context';
import { MergeTokenPolicy } from './policies/merge-token.policy';

@Injectable()
export class TokenStrategyChain {
  private refreshHead?: TokenState<TokenRefreshResponse>;
  private validateHead?: TokenState<void>;

  constructor(private readonly mergeTokenPolicy: MergeTokenPolicy) { }

  public setInitialRefreshStrategy(strategy: TokenState<TokenRefreshResponse>) {
    this.refreshHead = strategy;
  }

  public setInitialValidateStrategy(strategy: TokenState<void>) {
    this.validateHead = strategy;
  }

  async resolveRefresh(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    if (!this.refreshHead) throw new Error('No refresh strategy linked');
    const context = new RefreshTokenContext(refreshToken, request, this.mergeTokenPolicy);
    return this.refreshHead.resolve(context);
  }

  async resolveValidation(token: string, request: any): Promise<void> {
    if (!this.validateHead) throw new Error('No validate strategy linked');
    const context = new RefreshTokenContext(token, request, this.mergeTokenPolicy);
    return this.validateHead.resolve(context);
  }
}
