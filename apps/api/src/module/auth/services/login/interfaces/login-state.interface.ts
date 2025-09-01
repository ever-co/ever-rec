import { ILoginProps } from "../../authentication.service";
import type { LoginContext } from "../login.context";
import { AuthStateResult, AuthState } from '../../../interfaces/auth.interface';

export enum StateId {
  FIREBASE = 'firebase',
  GAUZY = 'gauzy'
}

export type LoginState = AuthState<LoginContext, ILoginProps>;

export type LoginStateResult<T = any> = AuthStateResult<T>

export type ContextResult<U = any> = Map<StateId, LoginStateResult<U>>;
