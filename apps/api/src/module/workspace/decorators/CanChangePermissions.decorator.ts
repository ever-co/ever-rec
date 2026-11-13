import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CanChangePermissionsGuard } from '../guards/CanChangePermissions.guard';

export const PERMISSIONS_TARGET_METADATA = 'permissionsTarget';

export type PermissionsTarget = 'item' | 'folder';

// For routes that rewrite the permissions of one item (`:itemId`) or folder (`:folderId`): needs
// ADMIN on that target.
export function CanChangePermissions(target: PermissionsTarget) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_TARGET_METADATA, target),
    UseGuards(CanChangePermissionsGuard),
  );
}
