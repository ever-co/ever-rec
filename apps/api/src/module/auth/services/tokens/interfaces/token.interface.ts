export interface ITokenRefreshStrategy {
  supports(refreshToken: string): Promise<boolean>;
  execute(
    refreshToken: string,
    request: any
  ): Promise<TokenRefreshResponse>;
}

export interface ITokenValidateStrategy {
  supports(token: string): Promise<boolean>;
  validate(token: string, request: any): Promise<void>;
}

export interface TokenRefreshResponse {
  idToken: string;
  refreshToken: string;
  expiresAt: string;
}

export enum StrategyPosition {
  HEAD = "head",
  TAIL = "tail",
  INDEX = "index",
}
