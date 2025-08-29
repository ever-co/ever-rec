import { IRegisterProps } from "../../authentication.service";
import { StateId } from "../../login/interfaces/login-state.interface";
import { RegisterContext } from "../register.context";

export interface RegisterState {
  handle(context: RegisterContext, payload: IRegisterProps): Promise<void>;
}

export interface RegisterStateResult<T = any> {
  accessToken: string,
  refreshToken: string,
  data: T
}

export type ContextResult<U = any> = Map<StateId, RegisterStateResult<U>>;
