import { IsId, IsOptionalId } from '../../validators/id.validator';

export class MovePersonalItemDto {
  @IsId()
  itemId: string;

  @IsOptionalId()
  folderId: string | false = false;
}
