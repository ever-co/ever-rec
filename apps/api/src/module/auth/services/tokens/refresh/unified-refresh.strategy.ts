import { Injectable } from '@nestjs/common';
import { ITokenRefreshStrategy, StrategyPosition, TokenRefreshResponse } from '../interfaces/token.interface';
import { MergeTokenPolicy } from '../policies/merge-token.policy';
import { FirebaseRefreshStrategy } from './firebase-refresh.strategy';
import { LoginStateResult, StateId } from '../../login/interfaces/login-state.interface';
import { TokenStrategyChain } from '../token-strategy.chain';
import { GauzyRefreshStrategy } from './gauzy-refresh.strategy';


@Injectable()
export class UnifiedRefreshStrategy implements ITokenRefreshStrategy {
  constructor(
    private readonly mergeTokenPolicy: MergeTokenPolicy,
    private readonly firebaseStrategy: FirebaseRefreshStrategy,
    private readonly gauzyRefreshStrategy: GauzyRefreshStrategy,
    private readonly tokenStrategyChain: TokenStrategyChain,
  ) {
    this.tokenStrategyChain.linkRefreshStrategy(this, StrategyPosition.HEAD);
  }

  async supports(refreshToken: string): Promise<boolean> {
    return this.mergeTokenPolicy.isValid(refreshToken);
  }

  async execute(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    const context = await this.mergeTokenPolicy.decode(refreshToken);
    const firebaseRefreshToken = context.get(StateId.FIREBASE).refreshToken;
    const gauzyRefreshToken = context.get(StateId.GAUZY).refreshToken;

    await this.mergeTokenPolicy.revokeToken(refreshToken);

    const [firebaseResponse, gauzyResponse] = await Promise.all([this.firebaseStrategy.execute(firebaseRefreshToken, request), this.gauzyRefreshStrategy.execute(gauzyRefreshToken, request)]);

    const mergedToken = await this.mergeTokenPolicy.encode(
      new Map<StateId, LoginStateResult>([
        [
          StateId.FIREBASE,
          {
            data: context.get(StateId.FIREBASE).data,
            accessToken: firebaseResponse.idToken,
            refreshToken: firebaseResponse.refreshToken,
          },
        ],
        [
          StateId.GAUZY, {
            data: context.get(StateId.GAUZY).data,
            accessToken: gauzyResponse.idToken,
            refreshToken: gauzyResponse.refreshToken
          }
        ],
      ]),
    );

    return {
      idToken: firebaseResponse.idToken,
      refreshToken: mergedToken,
      expiresAt: firebaseResponse.expiresAt,
    };
  }
}
