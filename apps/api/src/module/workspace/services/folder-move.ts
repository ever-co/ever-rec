import { IWorkspaceFolder } from '../Interfaces/Folders';

// Folders nest three levels deep: 0 (top), 1 and 2. Same limit as folder creation.
export const MAX_FOLDER_NEST_LEVEL = 2;

// `message` is set when `ok` is false; `folders` and `changed` when it is true.
export interface FolderMovePlan {
  ok: boolean;
  changed?: boolean;
  folders?: IWorkspaceFolder[];
  message?: string;
}

/**
 * Works out what moving `folderId` (with everything below it) under `newParentId` (`false` is the
 * top level) does to the folder list. Pure: it reads `folders` and returns changed copies.
 *
 * Refused: a folder that does not exist, a destination that does not exist, a destination that is
 * the folder itself or one of its subfolders (the tree would loop), and a move that would put any
 * subfolder deeper than `MAX_FOLDER_NEST_LEVEL`.
 *
 * On a move the folder gets its new `parentId`, the folder and every subfolder get the `nestLevel`
 * that matches the new place, and the item count of the moved folder (which already includes its
 * subfolders) leaves the folders above the old place and is added to the folders above the new one.
 * Depths are counted from the stored `parentId` links, not from the stored `nestLevel`.
 */
export function planFolderMove(
  folders: IWorkspaceFolder[],
  folderId: string,
  newParentId: string | false,
  now: string = new Date().toISOString(),
): FolderMovePlan {
  const byId = new Map<string, IWorkspaceFolder>();
  for (const folder of folders) {
    if (folder?.id) {
      byId.set(folder.id, folder);
    }
  }

  const folder = byId.get(folderId);
  if (!folder) {
    return { ok: false, message: 'Folder not found.' };
  }

  const oldParentId = folder.parentId || false;
  const target = newParentId || false;

  if (target !== false && !byId.has(target)) {
    return { ok: false, message: 'Destination folder not found.' };
  }

  // The folder and everything below it, with the depth of each one under the folder.
  const relativeDepth = new Map<string, number>([[folderId, 0]]);
  let frontier = [folderId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const folderInTree of byId.values()) {
      if (
        folderInTree.parentId &&
        !relativeDepth.has(folderInTree.id) &&
        frontier.includes(folderInTree.parentId as string)
      ) {
        relativeDepth.set(
          folderInTree.id,
          (relativeDepth.get(folderInTree.parentId as string) as number) + 1,
        );
        next.push(folderInTree.id);
      }
    }
    frontier = next;
  }

  if (target !== false && relativeDepth.has(target)) {
    return {
      ok: false,
      message: 'A folder cannot be moved into itself or one of its subfolders.',
    };
  }

  if (oldParentId === target) {
    return { ok: true, changed: false, folders };
  }

  // `startId` and every folder above it, nearest first (empty for `false`). A chain that loops or
  // breaks stops where it does.
  const ancestorsOf = (startId: string | false): string[] => {
    const chain: string[] = [];
    let currentId: string | false = startId;
    while (currentId && byId.has(currentId) && !chain.includes(currentId)) {
      chain.push(currentId);
      currentId = byId.get(currentId)?.parentId || false;
    }
    return chain;
  };

  const newLevel = target === false ? 0 : ancestorsOf(target).length;
  const height = Math.max(...relativeDepth.values());
  if (newLevel + height > MAX_FOLDER_NEST_LEVEL) {
    return { ok: false, message: 'Maximum folder nest level exceeded.' };
  }

  const movedItems =
    typeof folder.items === 'number' && Number.isFinite(folder.items)
      ? folder.items
      : 0;
  const itemChange = new Map<string, number>();
  for (const id of ancestorsOf(oldParentId)) {
    itemChange.set(id, (itemChange.get(id) || 0) - movedItems);
  }
  for (const id of ancestorsOf(target)) {
    itemChange.set(id, (itemChange.get(id) || 0) + movedItems);
  }

  const updatedFolders = folders.map((item) => {
    if (!item?.id) {
      return item;
    }
    let updated = item;
    const depthUnderFolder = relativeDepth.get(item.id);
    if (depthUnderFolder !== undefined) {
      updated = {
        ...updated,
        nestLevel: newLevel + depthUnderFolder,
        ...(item.id === folderId ? { parentId: target, updated: now } : {}),
      };
    }
    const change = itemChange.get(item.id);
    if (change) {
      updated = { ...updated, items: (item.items || 0) + change };
    }
    return updated;
  });

  return { ok: true, changed: true, folders: updatedFolders };
}
