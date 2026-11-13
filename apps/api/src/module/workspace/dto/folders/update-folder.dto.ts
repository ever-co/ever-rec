import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// The only folder fields `PUT folders/:folderId` writes: what the portal and the extension change
// (rename, colour, item count). Everything else the clients send back with the folder (`id`,
// `access`, `parentId`, ...) is dropped by the whitelist; permissions are changed on
// `POST folders/:folderId/permissions`.
export class UpdateFolderFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  items?: number;
}

export class UpdateFolderDto {
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateFolderFieldsDto)
  folder: UpdateFolderFieldsDto;
}
