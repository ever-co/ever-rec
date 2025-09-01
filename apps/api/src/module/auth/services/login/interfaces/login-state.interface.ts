import { ILoginProps } from "../../authentication.service";
import type { LoginContext } from "../login.context";
import { AuthStateResult, AuthState, AuthProviderId } from '../../../interfaces/auth.interface';


export type LoginState = AuthState<LoginContext, ILoginProps>;

export type LoginStateResult<T = any> = AuthStateResult<T>

export type ContextResult<U = any> = Map<AuthProviderId, LoginStateResult<U>>;
