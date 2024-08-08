import teamIcon from 'public/whiteboards/ContextMenuItems/team.svg';
import open from 'public/whiteboards/ContextMenuItems/open.svg';
import newtab from 'public/whiteboards/ContextMenuItems/newtab.svg';
import link from 'public/whiteboards/ContextMenuItems/link.svg';
import favorite from 'public/whiteboards/ContextMenuItems/favorite.svg';
import share from 'public/whiteboards/ContextMenuItems/share.svg';
import duplicate from 'public/whiteboards/ContextMenuItems/duplicate.svg';
import rename from 'public/whiteboards/ContextMenuItems/rename.svg';
import remove from 'public/whiteboards/ContextMenuItems/remove.svg';
import restore from 'public/whiteboards/ContextMenuItems/restore.svg';

export interface IMenuItem {
  id: number;
  icon: any;
  title: EWhiteboardCardMenuItems;
}

export enum EWhiteboardCardMenuItems {
  OPEN = 'Open',
  OPEN_IN_NEW_TAB = 'Open in new tab',
  COPY_LINK = 'Copy link',
  FAVORITES_ADD = 'Add to favorites',
  FAVORITES_REMOVE = 'Remove from favorites',
  SHARE = 'Share',
  DUPLICATE = 'Duplicate',
  SHOW_IN_TEAM = 'Show in team',
  RENAME = 'Rename',
  REMOVE_TO_BIN = 'Remove to bin',
  REMOVE_FOREVER = 'Remove forever',
  RESTORE = 'Restore',
}

export const whiteboardCardMenuItems: IMenuItem[] = [
  {
    id: 0,
    icon: teamIcon,
    title: EWhiteboardCardMenuItems.SHOW_IN_TEAM,
  },
  { id: 1, icon: open, title: EWhiteboardCardMenuItems.OPEN },
  { id: 2, icon: newtab, title: EWhiteboardCardMenuItems.OPEN_IN_NEW_TAB },
  { id: 3, icon: link, title: EWhiteboardCardMenuItems.COPY_LINK },
  { id: 4, icon: favorite, title: EWhiteboardCardMenuItems.FAVORITES_ADD },
  { id: 5, icon: share, title: EWhiteboardCardMenuItems.SHARE },
  { id: 6, icon: duplicate, title: EWhiteboardCardMenuItems.DUPLICATE },
  { id: 7, icon: rename, title: EWhiteboardCardMenuItems.RENAME },
  { id: 8, icon: remove, title: EWhiteboardCardMenuItems.REMOVE_TO_BIN },
];

export const removeFromFavoritesMenuItem = {
  id: 44,
  icon: favorite,
  title: EWhiteboardCardMenuItems.FAVORITES_REMOVE,
};

export const whiteboardCardMenuItemsTrash: IMenuItem[] = [
  { id: 0, icon: rename, title: EWhiteboardCardMenuItems.RENAME },
  { id: 1, icon: restore, title: EWhiteboardCardMenuItems.RESTORE },
  { id: 2, icon: remove, title: EWhiteboardCardMenuItems.REMOVE_FOREVER },
];
