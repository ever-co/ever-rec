import { AuthProviderId } from "../../../interfaces/auth.interface";
import { ContextResult } from "../../login/interfaces/login-state.interface";
import { MergeTokenPolicy } from "../policies/merge-token.policy";

export interface TokenRefreshResponse {
  idToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface IRefreshTokenContext {
  readonly token: string;
  readonly request: any;
  readonly result: ContextResult<TokenRefreshResponse>;
  readonly mergeTokenPolicy: MergeTokenPolicy;
  current(): Promise<ContextResult>
}

export interface TokenState<T> {
  providerId: AuthProviderId,
  setNext(next: TokenState<T>): TokenState<T>;
  resolve(context: IRefreshTokenContext): Promise<T>;
}
