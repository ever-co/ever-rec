import { CanBe } from '../../../../utils/validator';
import { IsImageFilename } from '../../validators/image-filename.validator';

export class UpdateImageDto {
  @CanBe(undefined)
  @IsImageFilename()
  refName?: string;

  @CanBe(undefined)
  @IsImageFilename()
  location?: string;
}
