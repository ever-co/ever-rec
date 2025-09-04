import { AuthContextResult, AuthProviderId, TokenContainer } from "../../../interfaces/auth.interface";
import { MergeTokenPolicy } from "../policies/merge-token.policy";

export interface RefreshResponse {
  idToken: string;
  refreshToken: string;
  expiresAt: string;
};

export type TokenRefreshResponse = TokenContainer<RefreshResponse>;

export interface IRefreshTokenContext {
  readonly token: string;
  readonly request: any;
  readonly result: AuthContextResult<TokenRefreshResponse>;
  readonly mergeTokenPolicy: MergeTokenPolicy;
  current(): Promise<AuthContextResult<TokenRefreshResponse>>
}

export interface TokenState<T> {
  providerId: AuthProviderId,
  setNext(next: TokenState<T>): TokenState<T>;
  resolve(context: IRefreshTokenContext): Promise<T>;
}
