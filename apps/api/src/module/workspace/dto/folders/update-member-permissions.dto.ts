import { Equals, IsBoolean, IsIn } from 'class-validator';
import { IsId } from '../../validators/id.validator';

export class UpdateFolderMemberPermissionsDto {
  @IsIn(['member', 'team'])
  permissionType: 'member' | 'team';

  @IsId()
  id: string; // user or team id

  @Equals('folders')
  permissionItemType: 'folders';

  @IsBoolean()
  write: boolean;

  @IsBoolean()
  read: boolean;
}
