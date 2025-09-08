import { IUser } from "src/interfaces/IUser";
import { AuthState } from "../../../interfaces/auth.interface";
import { IUpdateUserDataProps } from "../../auth-orchestrator.service";
import { AuthContext } from "../../auth.context";
import { IRequestHeaders } from "src/module/gauzy/interfaces/gauzy.model";

export enum WorkflowProfileType {
  EMAIL = 'email',
  NAME = 'name',
  AVATAR = 'avatar'
};

export interface IUpdateUserProfileProps extends IUpdateUserDataProps {
  email?: string;
  token: string;
};

export type UpdateUserProfile = IUser;

export type UpdateUserProfileState = AuthState<AuthContext<UpdateUserProfile>, IUpdateUserDataProps>;

export type IHeaderRequest = IRequestHeaders & { formData?: FormData };
