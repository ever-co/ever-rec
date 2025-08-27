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
