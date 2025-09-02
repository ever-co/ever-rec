export interface AuthState<T = unknown, U = unknown> {
  handle(context: T, payload: U): Promise<void>;
}

export type AuthStateResult<T = unknown> = T;

export type TokenContainer<T> = {
  accessToken: string;
  refreshToken: string;
  data: T;
}

export type AuthContextResult<U = unknown> = Map<AuthProviderId, AuthStateResult<U>>;

export enum AuthProviderId {
  FIREBASE = 'firebase',
  GAUZY = 'gauzy'
}
