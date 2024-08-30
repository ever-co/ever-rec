import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { CanAccessWorkspaceItemType } from '../../../interfaces/_types';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CanAccessItemGuard } from '../guards/CanAccessItem.guard';
import { CanAccessFolder } from './CanAccessFolder.decorator';

export const REQUIRED_ITEM_ACCESS_METADATA = 'requiredItemAccess';
export const ITEM_TYPE_METADATA = 'itemType';

export const ItemAccess = (requiredAccess: PermissionAccessEnum) =>
  SetMetadata(REQUIRED_ITEM_ACCESS_METADATA, requiredAccess);

export const ItemType = (itemType: CanAccessWorkspaceItemType) =>
  SetMetadata(ITEM_TYPE_METADATA, itemType);

export function CanAccessItem(
  requiredAccess: PermissionAccessEnum,
  itemType: CanAccessWorkspaceItemType
) {
  return applyDecorators(
    CanAccessFolder(requiredAccess),
    ItemAccess(requiredAccess),
    ItemType(itemType),
    UseGuards(CanAccessItemGuard)
  );
}
