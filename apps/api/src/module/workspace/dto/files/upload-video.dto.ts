import { IsString, MaxLength } from 'class-validator';
import { IsVideoFilename } from '../../validators/video-filename.validator';
import { IsOptionalId } from '../../validators/id.validator';

export class UploadVideoDto {
  @IsString()
  @MaxLength(256)
  title: string;

  @IsVideoFilename()
  @MaxLength(256)
  fullFileName: string;

  @IsOptionalId()
  folderId: string | false = false;
}
