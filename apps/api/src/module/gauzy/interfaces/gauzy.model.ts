import { IUser } from '../../../interfaces/IUser';
import { IRegisterProps } from "../../auth/services/auth-orchestrator.service";

export interface IAuthResponse {
  user: IGauzyUser;
  token: string;
  refresh_token?: string;
}

export interface IGauzyUser {
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
}

export interface IGauzyRegisterProps {
  password: string;
  confirmPassword: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    preferredLanguage: string;
  };
}

export interface IRefreshTokenResponse {
  token: string;
  refresh_token?: string;
}

export class NameParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NameParseError';
  }
}

export class GauzyMapper {
  public static toPersistence(input: IRegisterProps): IGauzyRegisterProps {
    const { firstName, lastName } = this.parseFullName(input.username);

    return {
      password: input.password,
      confirmPassword: input.password,
      user: {
        email: input.email,
        firstName,
        lastName,
        preferredLanguage: "en"
      }
    };
  }

  public static toUser(user: IGauzyUser): IUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.fullName || user.name,
      isVerified: user.isEmailVerified ?? false,
      photoURL: user.imageUrl
    }
  }

  private static parseFullName(fullName: string): { firstName: string; lastName: string } {
    if (!fullName?.trim()) {
      return { firstName: '', lastName: '' };
    }

    const names = fullName.trim().split(/\s+/);

    if (names.length === 1) {
      return { firstName: names[0], lastName: '' };
    }

    const firstName = names[0];
    const lastName = names.slice(1).join(' ');

    return { firstName, lastName };
  }
}
