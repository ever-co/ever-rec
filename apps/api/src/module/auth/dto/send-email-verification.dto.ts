import { IsEmail, IsNotEmpty } from 'class-validator';

export class GenerateEmailVerificationLinkDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
