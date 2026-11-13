import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { CanAccessWorkspaceItemType } from '../../../interfaces/_types';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CanAccessItemGuard } from '../guards/CanAccessItem.guard';
import { CanAccessFolder } from './CanAccessFolder.decorator';

export const REQUIRED_ITEM_ACCESS_METADATA = 'requiredItemAccess';
export const ITEM_TYPE_METADATA = 'itemType';

export const ITEM_BY_FILE_NAME_METADATA = 'itemByFileName';

// Marks a route whose item is named by `fullFileName` in the body, not by an id. The item guard
// then resolves the item only from that name, and refuses a request whose item cannot be found.
export const ItemByFileName = () =>
  SetMetadata(ITEM_BY_FILE_NAME_METADATA, true);

export const ITEM_MUST_EXIST_METADATA = 'itemMustExist';

// Marks a route that updates an existing item. The item guard then refuses an id that matches no
// item (admin included) instead of falling back to workspace membership.
export const ItemMustExist = () => SetMetadata(ITEM_MUST_EXIST_METADATA, true);

export const ItemAccess =(requiredAccess: PermissionAccessEnum) =>
  SetMetadata(REQUIRED_ITEM_ACCESS_METADATA, requiredAccess);

export const ItemType = (itemType: CanAccessWorkspaceItemType) =>
  SetMetadata(ITEM_TYPE_METADATA, itemType);

export function CanAccessItem(
  requiredAccess: PermissionAccessEnum,
  itemType: CanAccessWorkspaceItemType,
) {
  return applyDecorators(
    CanAccessFolder(requiredAccess),
    ItemAccess(requiredAccess),
    ItemType(itemType),
    UseGuards(CanAccessItemGuard),
  );
}
