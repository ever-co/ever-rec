import { IsNumber, IsString, MaxLength } from 'class-validator';
import { IsOptionalId } from '../../validators/id.validator';

export class CreateFolderDto {
  @IsString()
  @MaxLength(256)
  name: string;

  @IsString()
  color: string;

  @IsNumber()
  nestLevel: number;

  @IsOptionalId()
  parentId: string | false = false;
}
