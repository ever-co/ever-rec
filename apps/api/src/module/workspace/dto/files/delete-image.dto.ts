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

  /**
   * Sent by older clients, but not used: the folder counts that lose the image are those of the
   * folder recorded for `imageId`. The client's view may be stale (the image moved meanwhile), and
   * a query can name any folder.
   */
  @IsOptionalId()
  folderId: string | false = false;
}
