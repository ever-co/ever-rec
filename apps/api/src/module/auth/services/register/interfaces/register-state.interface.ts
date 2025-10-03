import { AuthState, TokenContainer } from "../../../interfaces/auth.interface";
import { AuthContext } from "../../auth.context";
import { IRegisterProps } from "../../authentication.service";
import { IUser } from '../../../../../interfaces/IUser';

export type Register = TokenContainer<IUser>;

export type RegisterState = AuthState<AuthContext<Register>, IRegisterProps>;
