import { IsString, MaxLength } from 'class-validator';

export class RenameWorkspaceDto {
  @IsString()
  @MaxLength(256)
  newName: string;
}
