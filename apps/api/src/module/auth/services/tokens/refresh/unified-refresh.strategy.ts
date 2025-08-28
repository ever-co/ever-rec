import { Injectable, Logger } from '@nestjs/common';
import { LoginStateResult, StateId } from '../../login/interfaces/login-state.interface';
import { IRefreshTokenContext, TokenRefreshResponse } from '../interfaces/token.interface';
import { MergeTokenPolicy } from '../policies/merge-token.policy';
import { RefreshStrategyState } from '../states/refresh-strategy.state';

@Injectable()
export class UnifiedRefreshStrategy extends RefreshStrategyState {
  private readonly logger = new Logger(UnifiedRefreshStrategy.name);
  constructor(
    private readonly mergeTokenPolicy: MergeTokenPolicy,
  ) {
    super();
  }

  protected async supports(refreshToken: string): Promise<boolean> {
    return this.mergeTokenPolicy.isValid(refreshToken);
  }

  protected async handle(ctx: IRefreshTokenContext): Promise<TokenRefreshResponse> {
    const { token, result } = ctx
    // Decode existing merged token
    const context = await ctx.current();

    // Revoke old token
    await this.mergeTokenPolicy.revokeToken(token);

    // Merge all states automatically
    const mergedMap = new Map<StateId, LoginStateResult<TokenRefreshResponse>>();

    for (const [stateId, stateResult] of result.entries()) {
      const decodedData = context.get(stateId)?.data;
      mergedMap.set(stateId, { ...stateResult, data: decodedData });
    }

    const mergedToken = await this.mergeTokenPolicy.encode(mergedMap);

    // Use one of the state results as primary for response (e.g., FIREBASE)
    const primary = result.get(StateId.FIREBASE) ?? result.values().next().value;

    this.logger.log('Unified tokens refreshed.');

    return {
      idToken: primary.accessToken,
      refreshToken: mergedToken,
      expiresAt: primary.data.expiresAt,
    };
  }
}
