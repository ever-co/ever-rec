import { IsId, IsOptionalId } from '../../validators/id.validator';
import { IsImageFilename } from '../../validators/image-filename.validator';

export class DeleteImageDto {
  @IsImageFilename()
  refName: string;

  @IsId()
  imageId: string;

  @IsOptionalId()
  folderId: string | false = false;
}
