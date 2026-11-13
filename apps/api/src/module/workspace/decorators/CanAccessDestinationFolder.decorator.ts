import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CanAccessDestinationFolderGuard } from '../guards/CanAccessDestinationFolder.guard';

export const REQUIRED_DESTINATION_FOLDER_ACCESS_METADATA =
  'requiredDestinationFolderAccess';

// Requires `requiredAccess` on the folder named by `parentId` in the body (the folder an item is
// moved into).
export function CanAccessDestinationFolder(
  requiredAccess: PermissionAccessEnum,
) {
  return applyDecorators(
    SetMetadata(REQUIRED_DESTINATION_FOLDER_ACCESS_METADATA, requiredAccess),
    UseGuards(CanAccessDestinationFolderGuard),
  );
}
