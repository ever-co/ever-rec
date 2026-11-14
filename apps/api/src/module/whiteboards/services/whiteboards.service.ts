import * as admin from 'firebase-admin';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { IDataResponse } from '../../../interfaces/_types';
import { IUser } from '../../../interfaces/IUser';
import { Injectable } from '@nestjs/common';
import { IWhiteboard } from '../interfaces/Whiteboard';
import { is_id } from '../../workspace/validators/id.validator';
import { nanoid } from 'nanoid';
import { Database } from 'firebase-admin/database';

@Injectable()
export class WhiteboardService {
  private readonly rootDb = 'whiteboards/mainCollection';

  /**
   * The ids in the user's own list. A convenience copy only: a user can write to their own record,
   * so it never decides who may read or change a whiteboard. That is the `admin` of the whiteboard
   * record, which only the API writes.
   */
  async checkUserWhiteboards(db: Database, uid: string): Promise<string[]> {
    const userRef = db.ref(`users/${uid}/whiteboardIds`);
    const userSnap = await userRef.get();
    const userVal = userSnap.val();
    return Array.isArray(userVal)
      ? userVal.filter((id) => typeof id === 'string')
      : [];
  }

  /** The whiteboard when `uid` is its admin; null for an unknown id, a malformed id or another user's. */
  private async getOwnWhiteboard(
    db: Database,
    uid: string,
    whiteboardId: string,
  ): Promise<IWhiteboard | null> {
    if (!uid || typeof whiteboardId !== 'string' || !is_id(whiteboardId)) {
      return null;
    }

    const snap = await db.ref(`${this.rootDb}/${whiteboardId}`).get();
    const val: IWhiteboard | null = snap.val();

    return val && val.admin === uid ? val : null;
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

      const whiteboardIds = await this.checkUserWhiteboards(db, uid);
      whiteboardIds.push(whiteboardId);

      // The whiteboard record (with its admin) is what grants access; the list is a copy.
      await whiteboardRef.set(newWhiteboard);
      await userRef.update({ whiteboardIds });

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
      if (!uid) {
        return sendError('User is missing');
      }

      // The user's whiteboards are the records they are the admin of, not the ids in a list the
      // user can write to themselves.
      const db = admin.database();
      const snap = await db
        .ref(this.rootDb)
        .orderByChild('admin')
        .equalTo(uid)
        .get();
      const found: Record<string, IWhiteboard> | null = snap.val();
      // Oldest first, as the list used to come back.
      const whiteboards = Object.values(found || {})
        .filter((whiteboard) => whiteboard?.admin === uid)
        .sort((a, b) => (a.created || 0) - (b.created || 0));

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
      if (whiteboardId === ':whiteboardId') {
        return sendError('Undefined whiteboard');
      }

      const whiteboardVal = await this.getOwnWhiteboard(db, uid, whiteboardId);
      if (!whiteboardVal) {
        return sendError(`Whiteboard doesn't belong to this user.`);
      }

      await db.ref(`${this.rootDb}/${whiteboardId}`).remove();

      // Keep the user's own list in step; it grants nothing.
      const whiteboardIds = await this.checkUserWhiteboards(db, uid);
      await db
        .ref(`users/${uid}/whiteboardIds`)
        .set(whiteboardIds.filter((y) => y !== whiteboardId));

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
      if (!(await this.getOwnWhiteboard(db, uid, whiteboardId))) {
        return sendError(`Whiteboard doesn't belong to this user.`);
      }

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
      const whiteboardVal = await this.getOwnWhiteboard(db, uid, whiteboardId);

      if (!whiteboardVal) {
        return sendError(`Whiteboard doesn't belong to this user.`);
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
      if (typeof whiteboardId !== 'string' || !is_id(whiteboardId)) {
        return sendError(`Whiteboard doesn't exist.`);
      }

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
