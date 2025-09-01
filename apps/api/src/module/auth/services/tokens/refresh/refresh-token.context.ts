import { IRefreshTokenContext, TokenRefreshResponse } from "../interfaces/token.interface";
import { MergeTokenPolicy } from '../policies/merge-token.policy';
import { AuthContextResult, AuthProviderId, AuthStateResult } from '../../../interfaces/auth.interface';

export class RefreshTokenContext implements IRefreshTokenContext {
  public readonly result: AuthContextResult<TokenRefreshResponse>;

  constructor(readonly token: string, readonly request: any, readonly mergeTokenPolicy: MergeTokenPolicy) {
    this.result = new Map<AuthProviderId, AuthStateResult<TokenRefreshResponse>>();
  }

  public async current(): Promise<AuthContextResult> {
    const isValid = await this.mergeTokenPolicy.isValid(this.token);

    if (!isValid) {
      return null;
    }

    return this.mergeTokenPolicy.decode(this.token);
  }
}
