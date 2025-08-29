export interface AuthState<T = any, U = any> {
  handle(context: T, payload: U): Promise<void>;
}

export interface AuthStateResult<T = any> {
  accessToken: string,
  refreshToken: string,
  data: T
}
