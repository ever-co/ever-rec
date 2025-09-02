import { ILoginProps } from "../../authentication.service";
import { AuthState, TokenContainer } from '../../../interfaces/auth.interface';
import { AuthContext } from "../../auth.context";
import { IUser } from '../../../../../interfaces/IUser';


export type Login = TokenContainer<IUser>;

export type LoginState = AuthState<AuthContext<Login>, ILoginProps>;
