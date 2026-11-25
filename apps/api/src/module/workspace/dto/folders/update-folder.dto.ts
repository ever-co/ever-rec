import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// The only folder fields `PUT folders/:folderId` writes: what the portal and the extension change
// (rename, colour). Everything else the clients send back with the folder (`id`, `access`,
// `parentId`, `items`, ...) is dropped by the whitelist; permissions are changed on
// `POST folders/:folderId/permissions`, and the item count is kept by the server.
export class UpdateFolderFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  color?: string;
}

export class UpdateFolderDto {
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateFolderFieldsDto)
  folder: UpdateFolderFieldsDto;
}
