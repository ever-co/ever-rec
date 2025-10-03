import { AuthState } from "../../../interfaces/auth.interface";
import { AuthContext } from "../../auth.context";

export interface PasswordRequest {
  message: string;
}

export type Email = string;

export type PasswordRequestState = AuthState<AuthContext<PasswordRequest>, Email>;
