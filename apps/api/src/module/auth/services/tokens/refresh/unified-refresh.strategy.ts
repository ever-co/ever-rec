import { Injectable } from '@nestjs/common';
import { MergeTokenPolicy } from '../policies/merge-token.policy';
import { RefreshStrategyState } from '../states/refresh-strategy.state';
import { TokenRefreshResponse } from '../interfaces/token.interface';
import { FirebaseRefreshStrategy } from './firebase-refresh.strategy';
import { GauzyRefreshStrategy } from './gauzy-refresh.strategy';
import { TokenStrategyChain } from '../token-strategy.chain';
import { LoginStateResult, StateId } from '../../login/interfaces/login-state.interface';

@Injectable()
export class UnifiedRefreshStrategy extends RefreshStrategyState {
  constructor(
    private readonly mergeTokenPolicy: MergeTokenPolicy,
    private readonly firebaseStrategy: FirebaseRefreshStrategy,
    private readonly gauzyRefreshStrategy: GauzyRefreshStrategy,
    private readonly tokenStrategyChain: TokenStrategyChain,
  ) {
    super();

    // Set chain head
    this.tokenStrategyChain.setInitialRefreshStrategy(this);

    // Proper delegation
    this.setNext(this.firebaseStrategy); // fallback if not unified
  }

  protected async supports(refreshToken: string): Promise<boolean> {
    return this.mergeTokenPolicy.isValid(refreshToken);
  }

  protected async handle(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    const context = await this.mergeTokenPolicy.decode(refreshToken);
    const firebaseRefreshToken = context.get(StateId.FIREBASE).refreshToken;
    const gauzyRefreshToken = context.get(StateId.GAUZY).refreshToken;

    await this.mergeTokenPolicy.revokeToken(refreshToken);

    const [firebaseResponse, gauzyResponse] = await Promise.all([
      this.firebaseStrategy.handle(firebaseRefreshToken, request),
      this.gauzyRefreshStrategy.handle(gauzyRefreshToken, request),
    ]);

    const mergedToken = await this.mergeTokenPolicy.encode(
      new Map<StateId, LoginStateResult>([
        [
          StateId.FIREBASE,
          { ...context.get(StateId.FIREBASE), accessToken: firebaseResponse.idToken, refreshToken: firebaseResponse.refreshToken },
        ],
        [
          StateId.GAUZY,
          { ...context.get(StateId.GAUZY), accessToken: gauzyResponse.idToken, refreshToken: gauzyResponse.refreshToken },
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
