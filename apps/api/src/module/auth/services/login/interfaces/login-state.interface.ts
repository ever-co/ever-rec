import { ILoginProps } from "../../authentication.service";
import { AuthStateResult, AuthState, AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from "../../auth.context";


export type LoginState = AuthState<AuthContext, ILoginProps>;

export type LoginStateResult<T = any> = AuthStateResult<T>

export type ContextResult<U = any> = Map<AuthProviderId, LoginStateResult<U>>;
