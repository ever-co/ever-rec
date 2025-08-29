import { ContextResult, LoginStateResult, StateId } from "../../login/interfaces/login-state.interface";
import { IRefreshTokenContext, TokenRefreshResponse } from "../interfaces/token.interface";
import { MergeTokenPolicy } from '../policies/merge-token.policy';

export class RefreshTokenContext implements IRefreshTokenContext {
  public readonly result: ContextResult<TokenRefreshResponse>;

  constructor(readonly token: string, readonly request: any, readonly mergeTokenPolicy: MergeTokenPolicy) {
    this.result = new Map<StateId, LoginStateResult<TokenRefreshResponse>>();
  }

  public async current(): Promise<ContextResult> {
    const isValid = await this.mergeTokenPolicy.isValid(this.token);

    if (!isValid) {
      return null;
    }

    return this.mergeTokenPolicy.decode(this.token);
  }
}
