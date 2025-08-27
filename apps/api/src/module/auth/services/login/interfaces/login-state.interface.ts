import { ILoginProps } from "../../authentication.service";
import { LoginContext } from "../login.context";

export enum StateId {
  FIREBASE = 'firebase',
  GAUZY = 'gauzy'
}

export interface LoginState {
  handle(context: LoginContext, payload: ILoginProps): Promise<void>;
}

export interface LoginStateResult<T = any> {
  accessToken: string,
  refreshToken: string,
  data: T
}

export type ContextResult<U = any> = Map<StateId, LoginStateResult<U>>;
