import { AuthContextResult, AuthProviderId } from "../../../interfaces/auth.interface";
import { MergeTokenPolicy } from "../policies/merge-token.policy";

export interface TokenRefreshResponse {
  idToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface IRefreshTokenContext<T = unknown> {
  readonly token: string;
  readonly request: any;
  readonly result: AuthContextResult<TokenRefreshResponse>;
  readonly mergeTokenPolicy: MergeTokenPolicy;
  current(): Promise<AuthContextResult<T>>
}

export interface TokenState<T> {
  providerId: AuthProviderId,
  setNext(next: TokenState<T>): TokenState<T>;
  resolve(context: IRefreshTokenContext): Promise<T>;
}
