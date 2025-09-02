export interface AuthState<T = unknown, U = unknown> {
  handle(context: T, payload: U): Promise<void>;
}

export interface AuthStateResult<T = unknown> {
  accessToken: string;
  refreshToken: string;
  data: T;
}

export type AuthContextResult<U = unknown> = Map<AuthProviderId, AuthStateResult<U>>;

export enum AuthProviderId {
  FIREBASE = 'firebase',
  GAUZY = 'gauzy'
}
