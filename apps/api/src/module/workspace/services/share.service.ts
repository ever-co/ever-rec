import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { WorkspaceUtilitiesService } from './utilities.service';
import { nanoid } from 'nanoid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IDataResponse } from 'src/interfaces/_types';
import { IWorkspaceSharedData } from '../Interfaces/Workspace';

@Injectable()
export class WorkspaceShareService {
  private dbRoot = 'sharedWorkspaceItems';

  constructor(
    private readonly utilitiesService: WorkspaceUtilitiesService,
    private eventEmitter: EventEmitter2
  ) {}

  async getShareLink(
    workspaceId: string,
    itemId: string,
    uid: string
  ): Promise<IDataResponse<string>> {
    try {
      const db = admin.database();
      const query = `${workspaceId}|${itemId}`;

      const sharedRef = db.ref(this.dbRoot);
      const sharedSnapshot = await sharedRef
        .orderByChild('queryField')
        .equalTo(query)
        .get();
      const queryData: IWorkspaceSharedData = sharedSnapshot.val();

      let link = '';
      if (queryData) {
        const keys = Object.keys(queryData);
        link = keys[0];
      } else {
        const id = nanoid(12);
        const ref = db.ref(`sharedWorkspaceItems/${id}`);

        await ref.set({
          id,
          workspaceId,
          itemId,
          queryField: query,
        });

        link = id;
      }

      this.eventEmitter.emit(
        'analytics.track',
        'Workspace Image Share Link Generated',
        {
          userId: uid,
          workspaceId,
          properties: { link, id: itemId },
        }
      );

      return this.utilitiesService.sendResponse(link);
    } catch (e) {
      console.log(e);
      return this.utilitiesService.sendError(
        'Could not create a shareable link.',
        e.message
      );
    }
  }

  async deleteShareLink(
    uid: string,
    linkId: string
  ): Promise<IDataResponse<string>> {
    try {
      const db = admin.database();
      const sharedRef = db.ref(`${this.dbRoot}/${linkId}`);
      const shareSnapshot = await sharedRef.get();

      if (!shareSnapshot.exists()) {
        throw new Error(`There is no data for linkId: ${linkId}`);
      }

      await sharedRef.remove();

      this.eventEmitter.emit(
        'analytics.track',
        'Workspace Share Link Deleted',
        {
          userId: uid,
          properties: { linkId },
        }
      );

      return this.utilitiesService.sendResponse(
        'Deleted shareable link successfully!'
      );
    } catch (e) {
      console.log(e);
      return this.utilitiesService.sendError(
        'Could not delete shareable link',
        e.message
      );
    }
  }

  async deleteLinkById(workspaceId: string, itemId: string): Promise<boolean> {
    try {
      const db = admin.database();
      const sharedRef = db.ref(this.dbRoot);
      const query = `${workspaceId}|${itemId}`;
      const snapshot = await sharedRef
        .orderByChild('queryField')
        .equalTo(query)
        .get();

      if (snapshot.exists()) {
        const keys = Object.keys(snapshot.val());
        const link = keys[0];
        await snapshot.child(link).ref.remove();
      }

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
