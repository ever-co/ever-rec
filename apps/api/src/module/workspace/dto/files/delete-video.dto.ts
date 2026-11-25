import { IsOptional } from 'class-validator';
import { IsId } from '../../validators/id.validator';

export class DeleteVideoDto {
  /**
   * Sent by older clients, but not used: the handler deletes the files recorded for `videoId`.
   * It is not validated, so a video stored under any file extension can be deleted.
   */
  @IsOptional()
  refName?: string;

  @IsId()
  videoId: string;
}
