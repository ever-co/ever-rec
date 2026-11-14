import * as admin from 'firebase-admin';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IDataResponse, ItemType } from 'src/interfaces/_types';
import { IUniqueView, IView } from '../utils/models/shared.model';
import { sendResponse } from '../utils/sendResponse';
import { formatDataToArray } from '../utils/helpers';
import { is_id } from '../../module/workspace/validators/id.validator';
import { isWorkspaceMember } from '../../module/workspace/guards/CanAccessWorkspace.guard';

/** Who is looking, as the API knows it from the verified token. Never taken from a request body. */
export interface IViewer {
  id: string;
  email?: string | null;
  name?: string | null;
  photoURL?: string | null;
}

export interface IViewInfo {
  /** Who watched. Only filled for the item's owner (or a member of its workspace); `[]` for anyone else. */
  uniqueViewsDb: IUniqueView[];
  /** How many views the item has. Safe to show to anybody. */
  views: number;
}

interface IAddUniqueView {
  sharedId: unknown;
  itemType: ItemType;
  isWorkspace: boolean;
  viewer: IViewer | null;
  ip: string | null;
}

interface IGetUniqueView {
  itemType: ItemType;
  /** The share link id, for a shared page. */
  sharedId?: unknown;
  /** The item id, for a page of the library. Needs `userId` unless `workspaceId` is given. */
  itemId?: unknown;
  workspaceId?: unknown;
  isWorkspace?: boolean;
  userId: string | null;
}

interface IResolvedItem {
  ref: admin.database.Reference;
  data: any;
  /** Owner of a personal item. */
  ownerUid?: string;
  /** Set for a workspace item. */
  workspaceId?: string;
}

const COLLECTION: Record<ItemType, string> = {
  image: 'screenshots',
  video: 'videos',
};
const SHARED_COLLECTION: Record<ItemType, string> = {
  image: 'shared',
  video: 'sharedVideos',
};
const SHARED_ITEM_FIELD: Record<ItemType, string> = {
  image: 'imageId',
  video: 'videoId',
};
const SHARED_WORKSPACE_COLLECTION = 'sharedWorkspaceItems';
const MAX_IP_LENGTH = 64;

const isPlainId = (value: unknown): value is string =>
  typeof value === 'string' && is_id(value);

@Injectable()
export class UniqueViewsSharedService {
  /**
   * Counts a view of a shared item. Everything that decides what is written comes from the server:
   * the item is found from the share link, the viewer is the verified user and the address is the
   * one of the connection. The writes are transactions, so two viewers at once do not lose one.
   */
  async addUniqueView({
    sharedId,
    itemType,
    isWorkspace,
    viewer,
    ip,
  }: IAddUniqueView): Promise<IDataResponse<IViewInfo>> {
    const item = await this.resolveSharedItem(itemType, sharedId, isWorkspace);

    if (item.data.trash) {
      throw new NotFoundException('Item not found');
    }

    let views = formatDataToArray(item.data.views).length;
    const ownerId = item.ownerUid ?? item.data.uid;
    const isOwnItem = Boolean(viewer && viewer.id === ownerId);
    const address =
      typeof ip === 'string' && ip.trim()
        ? ip.trim().slice(0, MAX_IP_LENGTH)
        : null;

    // A signed-in viewer counts once as a person; only the first visit also counts as a view.
    const isKnownViewer = Boolean(
      viewer &&
        (formatDataToArray(item.data.uniqueViews) as IUniqueView[]).some(
          (known) => known.id === viewer.id,
        ),
    );

    if (!isOwnItem && !isKnownViewer) {
      // The view is written before the person, so a retry after a failed second write still
      // counts the person: the first write ignores an address that is already counted, and a
      // person is only "known" once their own record exists.
      if (address) {
        views = await this.addViewOfAddress(item.ref, address);
      }

      if (viewer) {
        await this.addUniqueViewer(item.ref, viewer);
      }
    }

    // The viewers are for the owner only: this answer goes to whoever opened the link.
    return sendResponse({ uniqueViewsDb: [], views });
  }

  /**
   * The views of an item. The viewers (name, email, photo) are only returned to the item's owner,
   * or to a member of the workspace of a workspace item. Everybody else gets the count only.
   */
  async getUniqueView({
    itemType,
    sharedId,
    itemId,
    workspaceId,
    isWorkspace,
    userId,
  }: IGetUniqueView): Promise<IDataResponse<IViewInfo>> {
    const item =
      sharedId !== undefined && sharedId !== null
        ? await this.resolveSharedItem(itemType, sharedId, Boolean(isWorkspace))
        : await this.resolveLibraryItem(itemType, itemId, workspaceId, userId);

    if (item.data.trash && sharedId !== undefined && sharedId !== null) {
      throw new NotFoundException('Item not found');
    }

    const views = formatDataToArray(item.data.views).length;
    const canSeeViewers = await this.canSeeViewers(userId, item);

    return sendResponse({
      uniqueViewsDb: canSeeViewers
        ? (formatDataToArray(item.data.uniqueViews) as IUniqueView[])
        : [],
      views,
    });
  }

  private async canSeeViewers(
    userId: string | null,
    item: IResolvedItem,
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    if (item.workspaceId) {
      return (
        item.data.uid === userId ||
        (await isWorkspaceMember(userId, item.workspaceId))
      );
    }

    return item.ownerUid === userId;
  }

  /** Records a signed-in viewer once. True when this call added them. */
  private async addUniqueViewer(
    itemRef: admin.database.Reference,
    viewer: IViewer,
  ): Promise<boolean> {
    const entry: IUniqueView = {
      id: viewer.id,
      displayName: viewer.name || viewer.email || null,
      photoURL: viewer.photoURL || null,
      email: viewer.email || null,
      timestamp: Date.now(),
    } as IUniqueView;

    const { committed } = await itemRef
      .child('uniqueViews')
      .transaction((current) => {
        const list: IUniqueView[] = formatDataToArray(current);

        if (list.some((known) => known.id === viewer.id)) {
          return; // already there: abort, nothing is written
        }

        return [...list, entry];
      });

    return committed;
  }

  /** Records a view from this address once. Returns how many views the item has now. */
  private async addViewOfAddress(
    itemRef: admin.database.Reference,
    ip: string,
  ): Promise<number> {
    const { snapshot } = await itemRef
      .child('views')
      .transaction((current) => {
        const list: IView[] = formatDataToArray(current);

        if (list.some((view) => view.ip === ip)) {
          return; // this address already counted
        }

        return [...list, { ip, timestamp: Date.now() }];
      });

    return formatDataToArray(snapshot.val()).length;
  }

  // The item of a share link, found from the link record, never from the caller.
  private async resolveSharedItem(
    itemType: ItemType,
    sharedId: unknown,
    isWorkspace: boolean,
  ): Promise<IResolvedItem> {
    this.assertItemType(itemType);

    if (!isPlainId(sharedId)) {
      throw new BadRequestException('Invalid share link');
    }

    const db = admin.database();
    const sharedRoot = isWorkspace
      ? SHARED_WORKSPACE_COLLECTION
      : SHARED_COLLECTION[itemType];
    const shared = (await db.ref(`${sharedRoot}/${sharedId}`).get()).val();

    const parent = isWorkspace ? shared?.workspaceId : shared?.uid;
    const itemId = isWorkspace
      ? shared?.itemId
      : shared?.[SHARED_ITEM_FIELD[itemType]];

    // A link record that does not hold plain ids is as good as no link.
    if (!shared || !isPlainId(parent) || !isPlainId(itemId)) {
      throw new NotFoundException('Shared item not found');
    }

    return isWorkspace
      ? this.loadItem(itemType, 'workspaces', parent, itemId, {
          workspaceId: parent,
        })
      : this.loadItem(itemType, 'users', parent, itemId, { ownerUid: parent });
  }

  // An item of the library by its id: the caller's own, or one of a workspace.
  private async resolveLibraryItem(
    itemType: ItemType,
    itemId: unknown,
    workspaceId: unknown,
    userId: string | null,
  ): Promise<IResolvedItem> {
    this.assertItemType(itemType);

    if (!isPlainId(itemId)) {
      throw new BadRequestException('Invalid id');
    }

    const hasWorkspace =
      workspaceId !== undefined && workspaceId !== null && workspaceId !== '';

    if (hasWorkspace) {
      if (!isPlainId(workspaceId)) {
        throw new BadRequestException('Invalid workspace id');
      }

      return this.loadItem(itemType, 'workspaces', workspaceId, itemId, {
        workspaceId,
      });
    }

    // Without a sign-in there is no library to look in. A 404, not a 401: the clients sign the
    // user out on a 401.
    if (!userId) {
      throw new NotFoundException('Item not found');
    }

    return this.loadItem(itemType, 'users', userId, itemId, {
      ownerUid: userId,
    });
  }

  private async loadItem(
    itemType: ItemType,
    root: 'users' | 'workspaces',
    parent: string,
    itemId: string,
    extra: Pick<IResolvedItem, 'ownerUid' | 'workspaceId'>,
  ): Promise<IResolvedItem> {
    const ref = admin
      .database()
      .ref(`${root}/${parent}/${COLLECTION[itemType]}/${itemId}`);
    const data = (await ref.get()).val();

    if (!data || typeof data !== 'object') {
      throw new NotFoundException('Item not found');
    }

    return { ref, data, ...extra };
  }

  private assertItemType(itemType: ItemType): void {
    if (itemType !== 'image' && itemType !== 'video') {
      throw new BadRequestException('Invalid item type');
    }
  }
}
