import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** One-time handles are 32 random bytes, base64url. */
const HANDLE = /^[A-Za-z0-9_-]{32,128}$/;

export class EverIdExchangeDto {
  @ApiProperty({
    description: 'One-time hand-off code from the sign-in redirect',
  })
  @IsString()
  @Matches(HANDLE)
  code: string;

  @ApiPropertyOptional({
    description: 'The value the portal tab that started the sign-in keeps',
  })
  @IsOptional()
  @IsString()
  @Matches(HANDLE)
  binding?: string;
}

export class EverIdPendingDto {
  @ApiProperty({ description: 'One-time key of the confirmation screen' })
  @IsString()
  @Matches(HANDLE)
  pending: string;

  @ApiPropertyOptional({
    description: 'The value the portal tab that started the sign-in keeps',
  })
  @IsOptional()
  @IsString()
  @Matches(HANDLE)
  binding?: string;
}

/** A legal document the confirmation screen displayed (same shape as the sign-up form's). */
export class EverIdTermsClaimDto {
  @IsString()
  @MaxLength(200)
  documentId: string;

  @IsString()
  @MaxLength(50)
  version: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  sha256: string;

  @IsString()
  @MaxLength(20)
  locale: string;
}

export class EverIdSignUpConfirmDto extends EverIdPendingDto {
  @ApiProperty({ description: 'The person ticked the terms checkbox' })
  @Equals(true)
  termsAccepted: boolean;

  @ApiPropertyOptional({ type: [EverIdTermsClaimDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => EverIdTermsClaimDto)
  terms?: EverIdTermsClaimDto[];
}

export class EverIdUnlinkDto {
  @ApiProperty()
  @IsString()
  @MaxLength(512)
  issuer: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  subject: string;
}
