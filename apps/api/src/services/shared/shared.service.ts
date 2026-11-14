import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { Reference } from '@firebase/database-types';
import { ImageViewModel } from '../../module/image/view.models/image.view.model';
import { nanoid } from 'nanoid';
import { VideoViewModel } from '../../module/video/view.models/video.view.model';
import {
  DbCommentIntF,
  ICommentResponse,
  LikeIntF,
  ResponseComment,
} from '../utils/models/shared.model';
import dateFormat from 'dateformat';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IDbFolder, DbFolderDataRaw } from '../../interfaces/IEditorImage';
import { DbVideoData } from '../../interfaces/IEditorVideo';
import { IDataResponse, ItemType } from '../../interfaces/_types';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { ISharedData } from 'src/interfaces/ISharedData';
import { sendError, sendResponse } from '../utils/sendResponse';
import { PermissionAccessEnum } from '../../module/workspace/Interfaces/Workspace';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspaceImage,
  IWorkspaceVideo,
} from '../../module/workspace/Interfaces/Files';
import { IWorkspaceFolder } from '../../module/workspace/Interfaces/Folders';
import { DatabaseService } from 'firebase-admin/lib/database/database';
import { Database } from 'firebase-admin/lib/database';
import { IUser } from 'src/interfaces/IUser';
import { parseCollectionToArray } from '../utils/helpers';
import { is_id } from '../../module/workspace/validators/id.validator';

export type queryReturnType =
  | ImageViewModel
  | VideoViewModel
  | { message: string };

export const dbEndpoints = {
  userCollections: {
    image: 'screenshots',
    video: 'videos',
  },
  workspaceCollections: {
    image: 'screenshots',
    video: 'videos',
  },
  sharedCollections: {
    image: 'shared',
    video: 'sharedVideos',
  },
  shareItemRefs: {
    image: 'imageId',
    video: 'videoId',
  },
  sharedWorkspaceCollections: {
    image: 'sharedWorkspaceItems',
    video: 'sharedWorkspaceItems',
  },
  foldersCollection: {
    image: 'folders',
    video: 'videoFolders',
  },
};

// The indexed child of a share record that holds `<uid>|<item id>`.
const sharedItemKeyName = {
  image: 'uidImageId',
  video: 'uidVideoId',
};

export const COMMENT_MAX_LENGTH = 2000;

/** Why a comment's content cannot be stored, or null when it can. */
export const commentContentError = (content: unknown): string | null => {
  if (typeof content !== 'string' || !content.trim()) {
    return 'Comment cannot be empty.';
  }

  if (content.length > COMMENT_MAX_LENGTH) {
    return `Comment cannot be longer than ${COMMENT_MAX_LENGTH} characters.`;
  }

  return null;
};

export type PermissionCollectionType =
  | IDbWorkspaceImageData[]
  | IDbWorkspaceVideoData[]
  | IWorkspaceFolder[];
@Injectable()
export class SharedService {
  constructor(private eventEmitter: EventEmitter2) {}

  sanitizeCommentsFromDB(_comments: any) {
    const comments = parseCollectionToArray(_comments);
    let result: DbCommentIntF[] = [];

    if (Array.isArray(comments)) {
      result = comments.slice();
    } else if (typeof comments === 'object' && comments === Object(comments)) {
      for (const key in comments as object) {
        result[key] = comments[key];
      }
    }

    result = result.filter(Boolean);
    return result;
  }

  async parseCommentsForResponse(
    itemType: ItemType,
    userId: string,
    itemId: string,
    initialComments: DbCommentIntF[],
    limit: string | number = '10',
  ): Promise<ResponseComment[]> {
    try {
      const db = admin.database();
      const limitNumber = Number(limit);
      let comments;
      const commentsResult: ResponseComment[] = [];
      const initCommentsCopy: DbCommentIntF[] =
        this.sanitizeCommentsFromDB(initialComments);

      if (!limit || isNaN(limitNumber) || limitNumber <= 10) {
        comments = initCommentsCopy.slice(0, 10);
      } else {
        comments = initCommentsCopy.slice(limitNumber - 10, limitNumber);
      }
      if (initCommentsCopy.length > limitNumber) {
        comments = [...comments, ...initCommentsCopy.slice(-1)];
      }

      await Promise.allSettled(
        comments.map(async (x) => {
          const userRef = db.ref(`users/${x.uid}`);
          const userVal = await userRef.get();
          const user = userVal.val();

          commentsResult.push({
            ...x,

            user: {
              id: x.uid,
              photoURL: user?.photoUrl || user?.photoURL,
              name: user?.displayName || null,
            },
          });
        }),
      );

      commentsResult.sort((a, b) => b.timestamp - a.timestamp);

      return commentsResult;
    } catch (e) {
      console.log(e);
      throw new Error(e);
    }
  }

  /**
   * The share record of an item, or null. It does not check that the item exists: the caller has
   * to (`canViewItemComments` does), so the item is read once.
   */
  async getSharedItemById(
    uid: string,
    itemId: string,
    itemType: ItemType,
  ): Promise<{ imageId: string; uid: string; uidImageId: string } | null> {
    const db = admin.database();
    const sharedCollectionName = dbEndpoints.sharedCollections[itemType];
    const sharedItemRefName = dbEndpoints.shareItemRefs[itemType];

    // The share record of one item is read through the indexed `<uid>|<item id>` key, the way the
    // share and unshare routes find it: the whole share collection is never loaded.
    const sharedSnap = await db
      .ref(`${sharedCollectionName}`)
      .orderByChild(sharedItemKeyName[itemType])
      .equalTo(`${uid}|${itemId}`)
      .get();
    const sharedVal = sharedSnap.val();
    let sharedItem = null;

    if (sharedVal) {
      Object.values(sharedVal).forEach(
        (item: { imageId: string; uid: string; uidImageId: string }) => {
          if (item?.[sharedItemRefName] == itemId && item.uid == uid) {
            sharedItem = item;
          }
        },
      );
    }

    return sharedItem;
  }

  /**
   * Comments live under the owner's item (`users/<owner>/<collection>/<item>/comments`), so the
   * caller may use them only when the item exists and is theirs, or is shared. The `isPublic` flag
   * and the owner id of a request are never trusted: the shared record decides, not the caller.
   */
  async canViewItemComments(
    itemType: ItemType,
    ownerId: string,
    itemId: string,
    callerId?: string,
  ): Promise<boolean> {
    if (!is_id(ownerId) || !is_id(itemId)) {
      return false;
    }

    const db = admin.database();
    const userCollectionName = dbEndpoints.userCollections[itemType];
    const itemSnap = await db
      .ref(`users/${ownerId}/${userCollectionName}/${itemId}`)
      .get();

    if (!itemSnap.exists()) {
      return false;
    }

    if (callerId && callerId === ownerId) {
      return true;
    }

    return !!(await this.getSharedItemById(ownerId, itemId, itemType));
  }

  // TODO: Fix types for interfaces for ID and stuff.
  async addComment(
    itemType: ItemType,
    itemOwnerId: string,
    currentUserId: string,
    itemId: string,
    content: string,
    isPublic: boolean,
    limit?: string,
  ): Promise<IDataResponse<DbCommentIntF>> {
    try {
      if (
        !(await this.canViewItemComments(
          itemType,
          itemOwnerId,
          itemId,
          currentUserId,
        ))
      ) {
        return sendError('Shared item not found.');
      }

      const db = admin.database();
      const userCollectionName = dbEndpoints.userCollections[itemType];
      const userRef: Reference = db.ref(`users/${currentUserId}`);
      const userData: IUser = (await userRef.get()).val();

      if (!userData?.email) {
        return sendError('Could not find user.');
      }

      const contentError = commentContentError(content);

      if (contentError) {
        return sendError(contentError);
      }

      const id = nanoid(12);
      const newCommentRef = db.ref(
        `/users/${itemOwnerId}/${userCollectionName}/${itemId}/comments/${id}`,
      );
      const newComment: DbCommentIntF = {
        id,
        content,
        timestamp: Date.now(),
        uid: currentUserId,
        isEdited: false,
      };

      await newCommentRef.set(newComment);

      const user = {
        id: currentUserId,
        name: userData.displayName,
        photoURL: userData.photoURL,
      };

      const newCommentWithUser: ICommentResponse = { ...newComment, user };

      this.eventEmitter.emit(
        'analytics.track',
        'Added comment on ' + itemType,
        { userId: currentUserId },
      );

      return sendResponse(newCommentWithUser);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to add a comment.');
    }
  }

  // Only the author of a comment may edit it (the apps offer edit only on one's own comments).
  async updateCommentAPI(
    itemType: ItemType,
    userId: string,
    ownerId: string,
    itemId: string,
    commentId: string,
    content: string,
    isPublic: boolean,
    limit?: string | number,
  ): Promise<IDataResponse<queryReturnType>> {
    try {
      if (!userId || !is_id(commentId)) {
        return sendError('Comment does not exist.');
      }

      if (
        !(await this.canViewItemComments(itemType, ownerId, itemId, userId))
      ) {
        return sendError('Shared item not found.');
      }

      const contentError = commentContentError(content);

      if (contentError) {
        return sendError(contentError);
      }

      const db = admin.database();
      const userCollectionName = dbEndpoints.userCollections[itemType];
      const commentRef = db.ref(
        `users/${ownerId}/${userCollectionName}/${itemId}/comments/${commentId}`,
      );
      const commentSnapshot = await commentRef.get();

      if (!commentSnapshot.exists()) {
        return sendError('Comment does not exist.');
      }

      if (commentSnapshot.val()?.uid !== userId) {
        return sendError('You can only change your own comments.');
      }

      const newComment = { ...commentSnapshot.val(), content, isEdited: true };

      await commentRef.set(newComment);

      return sendResponse(newComment);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to update the comment.');
    }
  }

  // Only the author of a comment may delete it (the apps offer delete only on one's own comments).
  async deleteComment(
    itemType: ItemType,
    userId: string,
    ownerId: string,
    itemId: string,
    commentId: string,
    isPublic: boolean,
    limit?: string | number,
  ): Promise<IDataResponse<queryReturnType>> {
    try {
      if (!userId || !is_id(commentId)) {
        return sendError('Comment does not exist.');
      }

      if (
        !(await this.canViewItemComments(itemType, ownerId, itemId, userId))
      ) {
        return sendError('Shared item not found.');
      }

      const db = admin.database();
      const userCollectionName = dbEndpoints.userCollections[itemType];
      const commentRef = db.ref(
        `users/${ownerId}/${userCollectionName}/${itemId}/comments/${commentId}`,
      );

      const commentSnapshot = await commentRef.get();

      if (!commentSnapshot.exists()) {
        return sendError('Comment does not exist.');
      }

      if (commentSnapshot.val()?.uid !== userId) {
        return sendError('You can only change your own comments.');
      }

      await commentRef.remove();

      this.eventEmitter.emit(
        'analytics.track',
        'Deleted comment on ' + itemType,
        { userId },
      );

      return sendResponse(null);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to delete a comment.');
    }
  }

  async getItemById(
    itemType: ItemType,
    itemId: string,
    userId: string,
  ): Promise<
    { dbData: ImageViewModel | VideoViewModel } | { message: string }
  > {
    const db = admin.database();
    const userCollectionName = dbEndpoints.userCollections[itemType];
    const userRef = db.ref(`users/${userId}`);

    if (userRef) {
      const itemRef = db.ref(`users/${userId}/${userCollectionName}/${itemId}`);

      if (itemRef) {
        const snapshot = await itemRef.get();
        const item = snapshot.val();
        const comments = await this.parseCommentsForResponse(
          itemType,
          userId,
          itemId,
          item.comments,
        );

        return {
          dbData: {
            ...snapshot.val(),
            comments,
            commentsLength: this.sanitizeCommentsFromDB(item.comments).length,
          },
        };
      } else {
        return { message: 'Item does not exist' };
      }
    } else {
      return { message: 'Unauthorized' };
    }
  }

  // TODO: check if you can limit the number of comments taken on the query instead later, less comments pulled from the DB
  // The comments of an item are returned only to its owner, or to anyone when the item is shared.
  // An item the caller may not view looks the same as one that does not exist: no comments.
  async getCommentsById(
    itemType: ItemType,
    itemId: string,
    userId: string,
    isPublic: boolean,
    ownerId: string | null,
    limit?: string | number,
  ): Promise<
    | { comments: ResponseComment[]; commentsLength: number }
    | { message: string }
  > {
    const db = admin.database();
    const uid = ownerId ? ownerId : userId;

    if (
      !uid ||
      !(await this.canViewItemComments(itemType, uid, itemId, userId))
    ) {
      return { comments: [], commentsLength: 0 };
    }

    const userRef = db.ref(`users/${uid}`);
    const userCollectionName = dbEndpoints.userCollections[itemType];
    if (userRef) {
      const commentsRef = db.ref(
        `users/${uid}/${userCollectionName}/${itemId}/comments`,
      );
      if (commentsRef) {
        const commentsSnapshot = await commentsRef.get();
        const commentsFromDB = this.sanitizeCommentsFromDB(
          commentsSnapshot.val(),
        );
        const comments = await this.parseCommentsForResponse(
          itemType,
          uid,
          itemId,
          commentsFromDB,
          limit,
        );

        return { comments, commentsLength: commentsFromDB.length };
      } else {
        return { message: 'Item does not exist' };
      }
    } else {
      return { message: 'Unauthorized' };
    }
  }

  async getSharedItemBySharedId(
    itemType: ItemType,
    sharedId: string,
    isWorkspace: boolean,
  ): Promise<ISharedData> {
    try {
      const db = admin.database();
      const sharedCollection = isWorkspace
        ? dbEndpoints.sharedWorkspaceCollections[itemType]
        : dbEndpoints.sharedCollections[itemType];

      const sharedRef = db.ref(`${sharedCollection}/${sharedId}`);
      const sharedSnapshot = await sharedRef.get();
      const sharedValue: ISharedData = sharedSnapshot.val();

      return sharedValue;
    } catch (e) {
      console.log(e);
    }
  }

  async likeItem(
    itemType: ItemType,
    itemId: string,
    ownerUid: string,
    userId: string,
    workspaceId?: string,
  ): Promise<IDataResponse<LikeIntF[]>> {
    try {
      if (!itemId) {
        throw new Error(`Item id is missing`);
      }

      const db = admin.database();
      const rootDb = workspaceId ? '/workspaces' : '/users';
      const parentCollection = workspaceId ? workspaceId : ownerUid;
      const collection = workspaceId
        ? dbEndpoints.workspaceCollections[itemType]
        : dbEndpoints.userCollections[itemType];

      const itemRef = db.ref(
        `${rootDb}/${parentCollection}/${collection}/${itemId}`,
      );
      const itemSnapshot = await itemRef.get();

      if (!itemSnapshot.exists()) {
        throw new Error(
          `Item doesn't exit for /${rootDb}/${ownerUid}/${collection}/${itemId}`,
        );
      }

      const itemData: ImageViewModel | VideoViewModel = itemSnapshot.val();
      const likes = itemData?.likes || [];
      const isLikedIndex = likes.findIndex((x) => x.uid === userId);

      if (isLikedIndex === -1) {
        likes.push({ uid: userId, timestamp: Date.now() });
      } else {
        likes.splice(isLikedIndex, 1);
      }

      await itemRef.update({ likes });

      return sendResponse(likes);
    } catch (e) {
      console.log(e);
      return sendError('Could not register a Like...', e.message);
    }
  }

  async removeShared(uid: string): Promise<null> {
    try {
      const db = admin.database();
      const sharedImagesRef = db.ref(`shared`);
      const sharedVideosRef = db.ref(`sharedVideos`);
      const sharedImagesSnap = await sharedImagesRef.get();
      const sharedVideosSnap = await sharedVideosRef.get();
      const sharedImages = sharedImagesSnap.val();
      const sharedVideos = sharedVideosSnap.val();

      await Promise.allSettled([
        Object.entries(sharedImages).forEach(async ([key, value]: any) => {
          if (value.uid === uid) {
            const sharedRef = db.ref(`shared/${key}`);

            await sharedRef.remove();
          }
        }),
        Object.entries(sharedVideos).forEach(async ([key, value]: any) => {
          if (value.uid === uid) {
            const sharedRef = db.ref(`sharedVideos/${key}`);

            await sharedRef.remove();
          }
        }),
      ]);
    } catch (e) {
      console.log(e);
    }

    return null;
  }
}
