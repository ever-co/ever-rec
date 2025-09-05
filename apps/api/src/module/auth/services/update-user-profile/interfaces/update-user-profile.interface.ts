import { IUser } from "src/interfaces/IUser";
import { AuthState } from "../../../interfaces/auth.interface";
import { IUpdateUserDataProps } from "../../auth-orchestrator.service";
import { AuthContext } from "../../auth.context";

export enum WorkflowProfileType {
  EMAIL = 'email',
  NAME = 'name',
}

export interface IUpdateUserProfileProps extends IUpdateUserDataProps {
  email?: string;
  token: string
};

export type UpdateUserProfile = IUser;


export type UpdateUserProfileState = AuthState<AuthContext<UpdateUserProfile>, IUpdateUserDataProps>;
