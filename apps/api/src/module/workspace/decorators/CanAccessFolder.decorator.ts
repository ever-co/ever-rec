import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CanAccessFolderGuard } from '../guards/CanAccessFolder.guard';

export const REQUIRED_FOLDER_ACCESS_METADATA = 'requiredFolderAccess';

export const FolderAccess = (requiredAccess: PermissionAccessEnum) =>
  SetMetadata(REQUIRED_FOLDER_ACCESS_METADATA, requiredAccess);

export function CanAccessFolder(requiredAccess: PermissionAccessEnum) {
  return applyDecorators(
    FolderAccess(requiredAccess),
    UseGuards(CanAccessFolderGuard)
  );
}
