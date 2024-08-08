import { IsBoolean, IsIn } from 'class-validator';
import { IsId } from '../../validators/id.validator';

export class UpdateFileMemberPermissionsDto {
  @IsIn(['member', 'team'])
  permissionType: 'member' | 'team';

  @IsId()
  id: string; // user or team id

  @IsIn(['screenshots', 'videos'])
  permissionItemType: 'screenshots' | 'videos';

  @IsBoolean()
  write: boolean;

  @IsBoolean()
  read: boolean;
}
