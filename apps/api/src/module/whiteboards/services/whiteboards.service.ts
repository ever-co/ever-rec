import * as admin from 'firebase-admin';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { promiseAllSettled } from '../../../services/utils/helpers';
import { IDataResponse } from '../../../interfaces/_types';
import { IUser } from '../../../interfaces/IUser';
import { Injectable } from '@nestjs/common';
import { IWhiteboard } from '../interfaces/Whiteboard';
import { nanoid } from 'nanoid';
import { Database } from 'firebase-admin/database';

@Injectable()
export class WhiteboardService {
  private readonly rootDb = 'whiteboards/mainCollection';

  async checkUserWhiteboards(db: Database, uid: string) {
    const userRef = db.ref(`users/${uid}/whiteboardIds`);
    const userSnap = await userRef.get();
    const userVal: string[] = userSnap.val() || [];
    return userVal;
  }

  async createNewWhiteboard(
    uid: string,
    userName: string,
    userEmail: string,
    whiteboardName: string,
  ): Promise<IDataResponse<IWhiteboard | null>> {
    try {
      const db = admin.database();
      const userRef = db.ref(`users/${uid}`);
      const userSnap = await userRef.get();
      const userVal: IUser = userSnap.val();

      if (!userVal) {
        return sendError("User doesn't exist");
      }

      const whiteboardId = nanoid(28);
      const whiteboardRef = db.ref(`${this.rootDb}/${whiteboardId}`);
      const whiteboardSnap = await whiteboardRef.get();
      const whiteboardVal = whiteboardSnap.val();

      if (whiteboardVal) {
        return sendError(`Whiteboard already exists!`);
      }

      const newWhiteboard: IWhiteboard = {
        id: whiteboardId,
        name: whiteboardName,
        admin: uid,
        created: Date.now(),
        trash: false,
        favorite: false,
        isPublic: false,
      };

      const whiteboardIds = userVal.whiteboardIds || [];
      whiteboardIds.push(whiteboardId);

      await Promise.all([
        whiteboardRef.set(newWhiteboard).then(() => {
          userRef.update({ whiteboardIds });
        }),
      ]);

      return sendResponse<IWhiteboard>(newWhiteboard);
    } catch (e) {
      console.log(e);
      return sendError(`Error while trying to add whiteboard to the Database!`);
    }
  }

  async getUserWhiteboards(
    uid: string,
  ): Promise<IDataResponse<IWhiteboard[] | null>> {
    try {
      const db = admin.database();
      const whiteboardIds = await this.checkUserWhiteboards(db, uid);
      if (!whiteboardIds) return;

      // Iterate over whiteboardIds as keys and get data
      const whiteboardPromises = whiteboardIds.map(async (id) => {
        const whiteboardsRef = db.ref(`${this.rootDb}/${id}`);
        const whiteboardsSnap = await whiteboardsRef.get();
        const whiteboardsVal: IWhiteboard = whiteboardsSnap.val();

        return whiteboardsVal;
      });

      const whiteboards = await promiseAllSettled<IWhiteboard>(
        whiteboardPromises,
      );

      return sendResponse<IWhiteboard[]>(whiteboards);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to fetch user whiteboard. Please try again later.',
      );
    }
  }

  async deleteWhiteboard(
    uid: string,
    whiteboardId: string,
  ): Promise<IDataResponse<IWhiteboard | null>> {
    try {
      const db = admin.database();
      const userRef = db.ref(`users/${uid}/whiteboardIds`);
      const whiteboardIds = await this.checkUserWhiteboards(db, uid);
      if (!whiteboardIds.includes(whiteboardId))
        return sendError(`Whiteboard doesn't belong to this user.`);

      const whiteboardRef = db.ref(`${this.rootDb}/${whiteboardId}`);
      const whiteboardSnap = await whiteboardRef.get();
      const whiteboardVal: IWhiteboard = whiteboardSnap.val();

      if (whiteboardId === ':whiteboardId') {
        return sendError('Undefined whiteboard');
      }

      const newWhiteboardIds = whiteboardIds.filter((y) => y !== whiteboardId);
      await userRef.set(newWhiteboardIds);

      await whiteboardRef.remove();

      return sendResponse<IWhiteboard>(whiteboardVal);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to delete whiteboard');
    }
  }

  async updateWhiteboardData(
    uid: string,
    whiteboardId: string,
    trash: boolean,
    favorite: boolean,
    isPublic: boolean,
    name?: string,
  ): Promise<IDataResponse<IWhiteboard | null>> {
    try {
      if (whiteboardId === ':whiteboardId') {
        return sendError('Undefined whiteboard');
      }

      const db = admin.database();
      const whiteboardIds = await this.checkUserWhiteboards(db, uid);
      if (!whiteboardIds.includes(whiteboardId))
        return sendError(`Whiteboard doesn't belong to this user.`);

      const whiteboardRef = db.ref(`${this.rootDb}/${whiteboardId}`);
      await whiteboardRef.update({
        ...(name !== undefined ? { name } : {}),
        ...(trash !== undefined ? { trash } : {}),
        ...(favorite !== undefined ? { favorite } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      });

      const whiteboardSnap = await whiteboardRef.get();
      const whiteboardVal: IWhiteboard = whiteboardSnap.val();

      return sendResponse<IWhiteboard>(whiteboardVal);
    } catch (e) {
      return sendError(
        e.message || 'Error while trying to update whiteboard data.',
      );
    }
  }

  async getWhiteboardById(
    uid: string,
    whiteboardId: string,
  ): Promise<IDataResponse<IWhiteboard | null>> {
    try {
      const db = admin.database();
      const whiteboardIds = await this.checkUserWhiteboards(db, uid);

      if (!whiteboardIds.includes(whiteboardId))
        return sendError(`Whiteboard doesn't belong to this user.`);

      const whiteboardRef = db.ref(`${this.rootDb}/${whiteboardId}`);
      const whiteboardSnap = await whiteboardRef.get();
      const whiteboardVal: IWhiteboard = whiteboardSnap.val();

      if (!whiteboardVal) {
        return sendError(`Whiteboard doesn't exist`);
      }

      return sendResponse<IWhiteboard>(whiteboardVal);
    } catch (e) {
      return sendError(e.message || 'Error while trying to get whiteboard.');
    }
  }

  async getWhiteboardByIdShared(
    whiteboardId: string,
  ): Promise<IDataResponse<IWhiteboard | null>> {
    try {
      const db = admin.database();
      const whiteboardRef = db.ref(`${this.rootDb}/${whiteboardId}`);
      const whiteboardSnap = await whiteboardRef.get();
      const whiteboardVal: IWhiteboard = whiteboardSnap.val();

      if (!whiteboardVal) {
        return sendError(`Whiteboard doesn't exist.`);
      }

      if (!whiteboardVal.isPublic) {
        return sendError(`Whiteboard is not shared.`);
      }

      return sendResponse<IWhiteboard>(whiteboardVal);
    } catch (e) {
      return sendError(e.message || 'Error while trying to get whiteboard.');
    }
  }
}
