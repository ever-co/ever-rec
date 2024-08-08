import { IsOptionalId } from '../../validators/id.validator';

export class DeleteFolderDto {
  @IsOptionalId()
  currentFolderId: string | false = false;
}
