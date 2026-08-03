import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
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

/**
 * One legal document the signup form says it displayed next to the TOS
 * checkbox.
 *
 * These values arrive from a browser, so they are a *claim*, not evidence. The
 * checks here only reject obvious rubbish; what makes a claim true is
 * `TermsAcceptanceService`, which re-checks every field against the published
 * `@ever-co/legal` corpus before a row is written. A digest the corpus never
 * published is refused — recording it would produce evidence pointing at
 * nothing.
 */
export class TermsAcceptanceClaimDto {
  @ApiProperty({ description: 'Stable document id', example: 'tos:ever-rec' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  documentId: string;

  @ApiProperty({ description: 'Published document version', example: '1.0.0' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  version: string;

  @ApiProperty({ description: 'Lowercase hex sha256 of the document source' })
  @Matches(/^[0-9a-f]{64}$/, {
    message: 'sha256 must be a 64-character lowercase hex digest',
  })
  sha256: string;

  @ApiProperty({ description: 'BCP-47 locale of the text that was shown', example: 'en' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(35)
  locale: string;
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

  /**
   * The legal documents the user ticked the box for, exactly as the form
   * displayed them.
   *
   * This is the field the register page was missing. `submitHandler` held the
   * checkbox in a `TOS` state variable, used it to compute `valid`, and then
   * called `register(email, password, username)` — the value gated the submit
   * button and was never referenced again.
   *
   * Optional so machine-driven registration paths that never showed a checkbox
   * are not forced to invent one; the portal signup always sends it, and the
   * server rejects a claim the corpus never published.
   */
  @ApiPropertyOptional({ type: () => [TermsAcceptanceClaimDto] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'Terms acceptance, when supplied, must list at least one document' })
  @ValidateNested({ each: true })
  @Type(() => TermsAcceptanceClaimDto)
  terms?: TermsAcceptanceClaimDto[];
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
