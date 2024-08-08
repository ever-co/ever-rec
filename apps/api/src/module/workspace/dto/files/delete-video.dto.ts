import { IsVideoFilename } from '../../validators/video-filename.validator';
import { IsId } from '../../validators/id.validator';

export class DeleteVideoDto {
  @IsVideoFilename()
  refName: string;

  @IsId()
  videoId: string;
}
