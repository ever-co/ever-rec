import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class AuthDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  photoURL?: string;

  @ApiProperty({
    description: 'Firebase ID token for authentication',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsNotEmpty()
  @IsString()
  idToken: string;

  @ApiProperty({
    description: 'Firebase refresh token',
    example: 'AEu4IL3m...',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (min 6 characters)',
    example: 'strongPassword123',
    minLength: 6,
  })
  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Username for display',
    example: 'john_doe',
  })
  @IsNotEmpty()
  @IsString()
  username: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'New email address',
    example: 'new.email@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'URL to user profile photo',
    example: 'https://example.com/photo.jpg',
  })
  @IsOptional()
  @IsUrl()
  photoURL?: string;
}

export class UpdateEmailDto {
  @ApiProperty({
    description: 'New email address',
    example: 'new.email@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class UpdatePasswordDto extends UpdateEmailDto {
  @ApiProperty({
    description: 'Current password',
    example: 'oldPassword123',
  })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: 'New password (min 6 characters)',
    example: 'newStrongPassword456',
    minLength: 6,
  })
  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;
}
