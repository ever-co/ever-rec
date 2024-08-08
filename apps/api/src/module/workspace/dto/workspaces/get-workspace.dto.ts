import { IsOptionalId } from '../../validators/id.validator';
import { Transform } from 'class-transformer';

export class GetWorkspaceDto {
  @IsOptionalId()
  folderId: string | false = false;
}
