import { ResStatusEnum } from "src/enums/ResStatusEnum";
import { AuthState } from "../../../interfaces/auth.interface";
import { AuthContext } from "../../auth.context";

export interface PasswordRequest {
  message: string;
  status: ResStatusEnum,
  data: string
}

export type PasswordRequestState = AuthState<AuthContext<PasswordRequest>, string>;
