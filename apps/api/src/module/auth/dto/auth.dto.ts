export class AuthDto {
  email?: string;
  displayName?: string;
  photoURL?: string;
  idToken: string;
  refreshToken: string;
}

export class RegisterDto {
  email: string;
  password: string;
  username: string;
}

export class UpdateUserDto {
  email?: string;
  displayName?: string;
  photoURL?: string;
}

export class UpdateEmailDto {
  email: string;
}

export class UpdatePasswordDto extends UpdateEmailDto {
  oldPassword: string;
  newPassword: string;
}
