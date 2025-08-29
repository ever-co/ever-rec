import { AuthState } from "src/module/auth/interfaces/auth.interface";
import { ILoginProps } from "../../authentication.service";
import { LoginContext } from "../login.context";
import { AuthStateResult } from '../../../interfaces/auth.interface';

export enum StateId {
  FIREBASE = 'firebase',
  GAUZY = 'gauzy'
}

export type LoginState = AuthState<LoginContext, ILoginProps>;

export type LoginStateResult<T = any> = AuthStateResult<T>

export type ContextResult<U = any> = Map<StateId, LoginStateResult<U>>;
