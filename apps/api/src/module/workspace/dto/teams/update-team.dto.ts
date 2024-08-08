import { IsString, MaxLength } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @MaxLength(256)
  name: string;
}
