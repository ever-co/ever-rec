import { IsObject } from 'class-validator';

export class UpdateFolderDto {
  @IsObject()
  folder: any; // TODO add dto for validation
}
