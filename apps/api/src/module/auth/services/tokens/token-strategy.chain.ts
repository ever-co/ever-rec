import { Injectable } from '@nestjs/common';
import { TokenRefreshResponse, TokenState } from './interfaces/token.interface';
import { RefreshTokenContext } from './refresh/refresh-token.context';
import { MergeTokenPolicy } from './policies/merge-token.policy';
import { FirebaseRefreshStrategy } from './refresh/firebase-refresh.strategy';
import { FirebaseValidateStrategy } from './refresh/validations/firebase-validate.strategy';

@Injectable()
export class TokenStrategyChain {
  private refreshHead: TokenState<TokenRefreshResponse>;
  private validateHead: TokenState<void>;

  constructor(
    private readonly firebaseRefreshStrategy: FirebaseRefreshStrategy,
    private readonly firebaseValidateStrategy: FirebaseValidateStrategy,
    private readonly mergeTokenPolicy: MergeTokenPolicy) {
    this.refreshHead = this.firebaseRefreshStrategy;
    this.validateHead = this.firebaseValidateStrategy;
  }

  public async resolveRefresh(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    const context = new RefreshTokenContext(refreshToken, request, this.mergeTokenPolicy);
    return this.refreshHead.resolve(context);
  }

  public async resolveValidation(token: string, request: any): Promise<void> {
    const context = new RefreshTokenContext(token, request, this.mergeTokenPolicy);
    return this.validateHead.resolve(context);
  }
}
