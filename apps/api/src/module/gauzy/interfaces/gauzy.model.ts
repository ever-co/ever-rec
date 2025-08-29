import { IRegisterProps } from "src/module/auth/services/authentication.service";

export interface IAuthResponse {
  user: {
    id?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    username?: string;
    imageUrl?: string;
    employeeId?: string;
    fullName?: string;
    emailVerifiedAt?: Date;
    lastLoginAt?: Date;
    isEmailVerified?: boolean;
  };
  token: string;
  refresh_token?: string;
}

export interface IGauzyRegisterProps {
  password: string,
  confirmPassword: string,
  user: {
    email: string,
    firstName: string,
    lastName: string,
    preferredLanguage: string
  }
}

export class GauzyMapper {
  public static persitance(input: IRegisterProps): IGauzyRegisterProps {
    const firstName = input.username.split(' ')[0];
    const lastName = input.username.split(' ')[1];
    return {
      password: input.password,
      confirmPassword: input.password,
      user: {
        email: input.email,
        firstName,
        lastName,
        preferredLanguage: "en"
      }
    }
  }
}
