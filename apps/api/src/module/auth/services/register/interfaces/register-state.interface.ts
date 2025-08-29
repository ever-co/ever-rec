import { AuthState, AuthStateResult } from "src/module/auth/interfaces/auth.interface";
import { IRegisterProps } from "../../authentication.service";
import { StateId } from "../../login/interfaces/login-state.interface";
import { RegisterContext } from "../register.context";

export type RegisterState = AuthState<RegisterContext, IRegisterProps>

export type RegisterStateResult<T = any> = AuthStateResult<T>

export type ContextResult<U = any> = Map<StateId, RegisterStateResult<U>>;
