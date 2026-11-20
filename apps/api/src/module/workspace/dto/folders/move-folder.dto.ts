import { IsOptionalId } from '../../validators/id.validator';

export class MoveFolderDto {
  // The folder to move under, or `false` for the top level. Required: a body without it is refused
  // rather than read as "move to the top level".
  @IsOptionalId()
  parentId: string | false;
}
