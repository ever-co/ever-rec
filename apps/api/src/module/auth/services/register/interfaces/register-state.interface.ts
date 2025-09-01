import { AuthState } from "../../../interfaces/auth.interface";
import { AuthContext } from "../../auth.context";
import { IRegisterProps } from "../../authentication.service";

export type RegisterState = AuthState<AuthContext, IRegisterProps>
