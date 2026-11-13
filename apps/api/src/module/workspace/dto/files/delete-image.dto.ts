import { IsOptional } from 'class-validator';
import { IsId, IsOptionalId } from '../../validators/id.validator';

export class DeleteImageDto {
  /**
   * Sent by older clients, but not used: the handler deletes the files recorded for `imageId`.
   * It is not validated, so an image stored under any file extension can be deleted.
   */
  @IsOptional()
  refName?: string;

  @IsId()
  imageId: string;

  @IsOptionalId()
  folderId: string | false = false;
}
