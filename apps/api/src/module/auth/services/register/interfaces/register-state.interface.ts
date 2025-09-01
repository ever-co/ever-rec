import { AuthProviderId, AuthState, AuthStateResult } from "../../../interfaces/auth.interface";
import { IRegisterProps } from "../../authentication.service";
import type { RegisterContext } from "../register.context";

export type RegisterState = AuthState<RegisterContext, IRegisterProps>

export type RegisterStateResult<T = any> = AuthStateResult<T>

export type ContextResult<U = any> = Map<AuthProviderId, RegisterStateResult<U>>;
