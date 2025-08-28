import { ContextResult, StateId } from "../../login/interfaces/login-state.interface";
import { MergeTokenPolicy } from "../policies/merge-token.policy";


export interface ITokenRefreshStrategy {
  supports(refreshToken: string): Promise<boolean>;
  handle(context: IRefreshTokenContext): Promise<TokenRefreshResponse>;
}

export interface ITokenValidateStrategy {
  supports(token: string): Promise<boolean>;
  validate(context: IRefreshTokenContext): Promise<void>;
}

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
  tokenId: StateId,
  setNext(next: TokenState<T>): TokenState<T>;
  resolve(context: IRefreshTokenContext): Promise<T>;
}
