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
    limit: string | number = '10'
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
        comments.map(async x => {
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
        })
      );

      commentsResult.sort((a, b) => b.timestamp - a.timestamp);

      return commentsResult;
    } catch (e) {
      console.log(e);
      throw new Error(e);
    }
  }

  async getSharedItemById(
    uid: string,
    itemId: string,
    itemType: ItemType
  ): Promise<{ imageId: string; uid: string; uidImageId: string } | null> {
    const db = admin.database();
    const collectionName = dbEndpoints.userCollections[itemType];
    const sharedCollectionName = dbEndpoints.sharedCollections[itemType];
    const sharedItemRefName = dbEndpoints.shareItemRefs[itemType];
    const sharedRef = db.ref(`${sharedCollectionName}`);
    const sharedSnap = await sharedRef.get();
    const sharedVal = sharedSnap.val();
    const itemRef = db.ref(`users/${uid}/${collectionName}/${itemId}`);
    const itemSnap = await itemRef.get();
    const itemVal = itemSnap.val();
    let sharedItem = null;

    if (sharedVal && itemVal) {
      Object.entries(sharedVal).forEach(
        ([_, item]: [
          any,
          { imageId: string; uid: string; uidImageId: string }
        ]) => {
          if (item[sharedItemRefName] == itemId && item.uid == uid) {
            sharedItem = item;
          }
        }
      );
      return sharedItem;
    }
  }

  // TODO: Fix types for interfaces for ID and stuff.
  async addComment(
    itemType: ItemType,
    itemOwnerId: string,
    currentUserId: string,
    itemId: string,
    content: string,
    isPublic: boolean,
    limit?: string
  ): Promise<IDataResponse<DbCommentIntF>> {
    try {
      if (isPublic) {
        const sharedItem = await this.getSharedItemById(
          itemOwnerId,
          itemId,
          itemType
        );

        if (!sharedItem) {
          return sendError('Shared item not found.');
        }
      }

      const db = admin.database();
      const userCollectionName = dbEndpoints.userCollections[itemType];
      const userRef: Reference = db.ref(`users/${currentUserId}`);
      const userData: IUser = (await userRef.get()).val();

      if (!userData?.email) {
        return sendError('Could not find user.');
      }

      if (!content) {
        return sendError('Comment cannot be empty.');
      }

      const id = nanoid(12);
      const newCommentRef = db.ref(
        `/users/${itemOwnerId}/${userCollectionName}/${itemId}/comments/${id}`
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
        { userId: currentUserId }
      );

      return sendResponse(newCommentWithUser);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to add a comment.');
    }
  }

  async updateCommentAPI(
    itemType: ItemType,
    ownerId: string,
    itemId: string,
    commentId: string,
    content: string,
    isPublic: boolean,
    limit?: string | number
  ): Promise<IDataResponse<queryReturnType>> {
    try {
      if (isPublic) {
        const sharedItem = await this.getSharedItemById(
          ownerId,
          itemId,
          itemType
        );
        if (!sharedItem) {
          return sendError('Shared item not found.');
        }
      }

      const db = admin.database();
      const userCollectionName = dbEndpoints.userCollections[itemType];
      const commentRef = db.ref(
        `users/${ownerId}/${userCollectionName}/${itemId}/comments/${commentId}`
      );
      const commentSnapshot = await commentRef.get();

      if (!commentSnapshot.exists()) {
        return sendError('Comment does not exist.');
      }

      const newComment = { ...commentSnapshot.val(), content, isEdited: true };

      await commentRef.set(newComment);

      return sendResponse(newComment);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to update the comment.');
    }
  }

  // TODO: check for comment owner, maybe guard, maybe not. not complex, just a simple id check against token id.
  async deleteComment(
    itemType: ItemType,
    userId: string,
    ownerId: string,
    itemId: string,
    commentId: string,
    isPublic: boolean,
    limit?: string | number
  ): Promise<IDataResponse<queryReturnType>> {
    try {
      if (isPublic) {
        const sharedItem = await this.getSharedItemById(
          ownerId,
          itemId,
          itemType
        );
        if (!sharedItem) {
          return sendError('Shared item not found.');
        }
      }

      const db = admin.database();
      const userCollectionName = dbEndpoints.userCollections[itemType];
      const commentRef = db.ref(
        `users/${ownerId}/${userCollectionName}/${itemId}/comments/${commentId}`
      );

      const commentSnapshot = await commentRef.get();

      if (!commentSnapshot.exists()) {
        return sendError('Comment does not exist.');
      }

      await commentRef.remove();

      this.eventEmitter.emit(
        'analytics.track',
        'Deleted comment on ' + itemType,
        { userId }
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
    userId: string
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
          item.comments
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
  // TODO: this should have a guard to see if the item is shared. If not, it shouldn't work.
  async getCommentsById(
    itemType: ItemType,
    itemId: string,
    userId: string,
    isPublic: boolean,
    ownerId: string | null,
    limit?: string | number
  ): Promise<
    | { comments: ResponseComment[]; commentsLength: number }
    | { message: string }
  > {
    const db = admin.database();
    const uid = ownerId ? ownerId : userId;

    if (!uid) {
      return { comments: [], commentsLength: 0 };
    }

    const userRef = db.ref(`users/${uid}`);
    const userCollectionName = dbEndpoints.userCollections[itemType];
    if (userRef) {
      const commentsRef = db.ref(
        `users/${uid}/${userCollectionName}/${itemId}/comments`
      );
      if (commentsRef) {
        const commentsSnapshot = await commentsRef.get();
        const commentsFromDB = this.sanitizeCommentsFromDB(
          commentsSnapshot.val()
        );
        const comments = await this.parseCommentsForResponse(
          itemType,
          uid,
          itemId,
          commentsFromDB,
          limit
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
    isWorkspace: boolean
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
    workspaceId?: string
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
        `${rootDb}/${parentCollection}/${collection}/${itemId}`
      );
      const itemSnapshot = await itemRef.get();

      if (!itemSnapshot.exists()) {
        throw new Error(
          `Item doesn't exit for /${rootDb}/${ownerUid}/${collection}/${itemId}`
        );
      }

      const itemData: ImageViewModel | VideoViewModel = itemSnapshot.val();
      const likes = itemData?.likes || [];
      const isLikedIndex = likes.findIndex(x => x.uid === userId);

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
