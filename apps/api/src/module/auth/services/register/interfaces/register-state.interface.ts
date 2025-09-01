import { AuthProviderId, AuthState, AuthStateResult } from "../../../interfaces/auth.interface";
import { AuthContext } from "../../auth.context";
import { IRegisterProps } from "../../authentication.service";

export type RegisterState = AuthState<AuthContext, IRegisterProps>

export type RegisterStateResult<T = any> = AuthStateResult<T>

export type ContextResult<U = any> = Map<AuthProviderId, RegisterStateResult<U>>;
