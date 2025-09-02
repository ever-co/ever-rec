import { ILoginProps } from "../../authentication.service";
import { AuthState } from '../../../interfaces/auth.interface';
import { AuthContext } from "../../auth.context";


export type LoginState = AuthState<AuthContext, ILoginProps>;
