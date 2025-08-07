import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthDto {
  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  photoURL?: string;

  @ApiProperty({
    description: 'Firebase ID token for authentication',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  idToken: string;

  @ApiProperty({
    description: 'Firebase refresh token',
    example: 'AEu4IL3m...',
  })
  refreshToken: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User password (min 6 characters)',
    example: 'strongPassword123',
    minLength: 6,
  })
  password: string;

  @ApiProperty({
    description: 'Username for display',
    example: 'john_doe',
  })
  username: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'New email address',
    example: 'new.email@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe',
  })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'URL to user profile photo',
    example: 'https://example.com/photo.jpg',
  })
  photoURL?: string;
}

export class UpdateEmailDto {
  @ApiProperty({
    description: 'New email address',
    example: 'new.email@example.com',
  })
  email: string;
}

export class UpdatePasswordDto extends UpdateEmailDto {
  @ApiProperty({
    description: 'Current password',
    example: 'oldPassword123',
  })
  oldPassword: string;

  @ApiProperty({
    description: 'New password (min 6 characters)',
    example: 'newStrongPassword456',
    minLength: 6,
  })
  newPassword: string;
}
