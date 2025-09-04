import { Injectable } from '@nestjs/common';
import { RefreshResponse, TokenState } from './interfaces/token.interface';
import { RefreshTokenContext } from './refresh/refresh-token.context';
import { MergeTokenPolicy } from './policies/merge-token.policy';
import { FirebaseRefreshStrategy } from './refresh/firebase-refresh.strategy';
import { FirebaseValidateStrategy } from './refresh/validations/firebase-validate.strategy';

@Injectable()
export class TokenStrategyChain {
  private readonly refresh: TokenState<RefreshResponse>;
  private readonly validate: TokenState<void>;

  constructor(
    private readonly firebaseRefreshStrategy: FirebaseRefreshStrategy,
    private readonly firebaseValidateStrategy: FirebaseValidateStrategy,
    private readonly mergeTokenPolicy: MergeTokenPolicy) {
    this.refresh = this.firebaseRefreshStrategy;
    this.validate = this.firebaseValidateStrategy;
  }

  public async resolveRefresh(refreshToken: string, request: any): Promise<RefreshResponse> {
    const context = new RefreshTokenContext(refreshToken, request, this.mergeTokenPolicy);
    return this.refresh.resolve(context);
  }

  public async resolveValidation(token: string, request: any): Promise<void> {
    const context = new RefreshTokenContext(token, request, this.mergeTokenPolicy);
    return this.validate.resolve(context);
  }
}
