import { IsId, IsOptionalId } from '../../validators/id.validator';
import { IsArray } from 'class-validator';

export class MoveItemsDto {
  @IsOptionalId()
  fromFolderId: string | false = false;

  @IsArray()
  @IsId({ each: true })
  itemIds: string[];
}
