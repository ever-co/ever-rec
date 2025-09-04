import { AuthState, TokenContainer } from "../../../interfaces/auth.interface";
import { AuthContext } from "../../auth.context";
import { IChangePasswordProps } from "../../authentication.service";
import { RefreshResponse } from "../../tokens";

export interface PasswordUpdateResponse extends RefreshResponse {
  message: string;
};

export type PasswordUpdate = TokenContainer<PasswordUpdateResponse>;

export type PasswordUpdateState = AuthState<AuthContext<PasswordUpdate>, IChangePasswordProps>;
