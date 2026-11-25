import { IsId, IsOptionalId } from '../../validators/id.validator';
import { IsArray } from 'class-validator';

export class MoveItemsDto {
  /**
   * The folder the client believes the items are in. Still accepted, for older clients, but not
   * used: each item moves (and is counted) out of the folder it is stored in.
   */
  @IsOptionalId()
  fromFolderId: string | false = false;

  @IsArray()
  @IsId({ each: true })
  itemIds: string[];
}
