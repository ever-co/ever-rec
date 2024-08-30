import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { IUser } from 'src/interfaces/IUser';
import { IDataResponse, ItemType } from 'src/interfaces/_types';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
} from 'src/module/workspace/Interfaces/Files';
import { IUniqueView, IView } from '../utils/models/shared.model';
import { sendResponse, sendError } from '../utils/sendResponse';
import { formatDataToArray } from '../utils/helpers';

interface IAddUniqueViewRequestBody {
  user: IUser | null;
  ip: string;
  itemData: IDbWorkspaceImageData | IDbWorkspaceVideoData;
  itemType: ItemType;
  isWorkspace: boolean;
}

interface IGetUniqueView {
  user: IUser;
  itemData: IDbWorkspaceImageData;
  itemType: ItemType;
  isWorkspace: boolean;
}

@Injectable()
export class UniqueViewsSharedService {
  constructor() {}

  // Careful changing arguments, since it uses request body, the object needs to match it 1:1
  async addUniqueView({
    user,
    ip,
    itemData,
    itemType,
    isWorkspace,
  }: IAddUniqueViewRequestBody): Promise<
    IDataResponse<{ uniqueViewsDb: IUniqueView[]; views: number }>
  > {
    try {
      const db = admin.database();
      const rootDb = isWorkspace ? 'workspaces' : 'users';
      const parentCollection = isWorkspace
        ? itemData.workspaceIds[0] || []
        : itemData.uid;
      const collection = itemType === 'image' ? 'screenshots' : 'videos';

      const imageRef = db.ref(
        `${rootDb}/${parentCollection}/${collection}/${itemData.id}`
      );

      const imageSnapshot = await imageRef.get();
      const itemValues = imageSnapshot.val();

      const uniqueViewsDb: IUniqueView[] = formatDataToArray(
        itemValues?.uniqueViews
      );
      const viewsDb: IView[] = formatDataToArray(itemValues?.views);
      let views = viewsDb.length;

      // Helper conditions
      const isWatchedAlreadyByUser =
        user && uniqueViewsDb.some(viewer => user.id === viewer.id);
      const isWatchedAlreadyByIp = viewsDb.some(viewer => viewer.ip === ip);
      const isOwnVideo = user && user.id === itemValues.uid;

      if (!user) {
        if (isWatchedAlreadyByIp) {
          return sendResponse({ uniqueViewsDb, views });
        }

        // Update views field
        const newView: IView = {
          ip,
          timestamp: Date.now(),
        };

        viewsDb.push(newView);
        await imageRef.update({ views: viewsDb });

        views = viewsDb.length;
        return sendResponse({ uniqueViewsDb, views });
      }

      if (isOwnVideo) {
        return sendResponse({ uniqueViewsDb, views });
      }

      if (!isWatchedAlreadyByUser) {
        // Update uniqueViews field
        const newUniqueView: IUniqueView = {
          id: user.id,
          displayName: user.displayName ? user.displayName : user.email || null,
          photoURL: user.photoURL || null,
          email: user.email,
          timestamp: Date.now(),
        };
        const newView2: IView = {
          ip,
          timestamp: Date.now(),
        };

        uniqueViewsDb.push(newUniqueView);
        !isWatchedAlreadyByIp && viewsDb.push(newView2);

        imageRef.update({ uniqueViews: uniqueViewsDb, views: viewsDb });

        views = viewsDb.length;

        return sendResponse({ uniqueViewsDb, views });
      }

      return sendResponse({ uniqueViewsDb, views });
    } catch (error) {
      console.log(error);
      return sendError(error.message);
    }
  }

  async getUniqueView({
    user,
    itemData,
    itemType,
    isWorkspace,
  }: IGetUniqueView): Promise<IDataResponse<IUniqueView[]>> {
    try {
      const db = admin.database();
      const rootDb = isWorkspace ? 'workspaces' : 'users';
      const parentCollection = isWorkspace
        ? itemData.workspaceIds[0] || []
        : itemData.uid || user.id;
      const collection = itemType === 'image' ? 'screenshots' : 'videos';

      const imageRef = db.ref(
        `${rootDb}/${parentCollection}/${collection}/${itemData.id}`
      );

      const imageSnapshot = await imageRef.get();
      const imageData = imageSnapshot.val();

      const uniqueViewsDb: IUniqueView[] = formatDataToArray(
        imageData?.uniqueViews
      );

      return sendResponse(uniqueViewsDb);
    } catch (error) {
      return sendError('Could not get unique views', error.message);
    }
  }
}
