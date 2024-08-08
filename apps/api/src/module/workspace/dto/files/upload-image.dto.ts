import { IsString, MaxLength } from 'class-validator';
import { IsImageFilename } from '../../validators/image-filename.validator';
import { IsOptionalId } from '../../validators/id.validator';

export class UploadImageDto {
  @IsString()
  @MaxLength(256)
  title: string;

  @IsImageFilename()
  @MaxLength(256)
  fullFileName: string;

  @IsOptionalId()
  folderId: string | false = false;
}
