import { IsString, MaxLength } from 'class-validator';

export class AddTeamDto {
  @IsString()
  @MaxLength(256)
  teamName: string;
}
