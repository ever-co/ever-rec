import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { Injectable } from '@nestjs/common';
import { IDataResponse } from 'src/interfaces/_types';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import {
  parseCollectionToArray,
  promiseAllSettled,
} from 'src/services/utils/helpers';
import { uploadImageInBucket } from 'src/services/utils/uploadImageToBucket';
import { DataSnapshot, Database, Reference } from 'firebase-admin/database';
import { IUser } from 'src/interfaces/IUser';

// TODO: export these and add types for the rest of the endpoints data
export interface IWhiteboardTeamMap {
  id: string;
  admin: string;
  name: string;
  members: { [uid: string]: { id: string } };
}

export interface IWhiteboardTeam extends Omit<IWhiteboardTeamMap, 'members'> {
  members: { id: string }[];
}

@Injectable()
export class WhiteboardTeamService {
  private readonly rootDb = 'whiteboards/teams';

  constructor() {}

  async addTeam(
    uid: string,
    teamName: string,
  ): Promise<IDataResponse<IWhiteboardTeam | null>> {
    try {
      const db = admin.database();
      const id = nanoid(20);
      const whiteboardTeamRef = db.ref(`${this.rootDb}/${uid}/${id}`);

      const newTeamMap: IWhiteboardTeamMap = {
        id,
        admin: uid,
        name: teamName,
        members: { [uid]: { id: uid } },
      };

      await whiteboardTeamRef.set(newTeamMap);

      const newTeam: IWhiteboardTeam = {
        ...newTeamMap,
        members: [{ id: uid }],
      };

      return sendResponse(newTeam);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to add a whiteboard team.',
        e.message,
      );
    }
  }

  async getTeams(
    uid: string,
  ): Promise<IDataResponse<IWhiteboardTeam[] | null>> {
    try {
      const db = admin.database();
      const whiteboardTeamRef = db.ref(`${this.rootDb}/${uid}`);
      const whiteboardTeamVal: IWhiteboardTeamMap = (
        await whiteboardTeamRef.get()
      ).val();

      // Also parse members here so the client doesn't have to
      const whiteboardTeams = parseCollectionToArray<IWhiteboardTeam>(
        whiteboardTeamVal,
      ).map((team) => {
        const parsed: IWhiteboardTeam = {
          ...team,
          members: parseCollectionToArray(team.members),
        };

        return parsed;
      });

      return sendResponse(whiteboardTeams);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to get teams.', e.message);
    }
  }

  async updateTeam(
    uid: string,
    teamId: string,
    name?: string,
    avatar?: Express.Multer.File,
    thumbnail?: Express.Multer.File,
  ): Promise<IDataResponse<IWhiteboardTeam | null>> {
    try {
      const { whiteboardTeamRef, whiteboardTeamSnap } =
        await this.checkIfTeamExists(uid, teamId);

      let avatarUrl: string;
      let thumbnailUrl: string;

      if (avatar) {
        const file = await uploadImageInBucket(
          avatar,
          `${this.rootDb}/${uid}/${teamId}/avatar`,
        );

        avatarUrl = (
          await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 15778476000,
          })
        )[0];
      }

      if (thumbnail) {
        const file = await uploadImageInBucket(
          thumbnail,
          `${this.rootDb}/${uid}/${teamId}/thumbnail`,
        );

        thumbnailUrl = (
          await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 15778476000,
          })
        )[0];
      }

      const whiteboardTeamVal = whiteboardTeamSnap.val();
      const updatedTeam = {
        ...whiteboardTeamVal,
        name: name || whiteboardTeamVal.name || null,
        avatar: avatarUrl || whiteboardTeamVal.avatar || null,
        thumbnail: thumbnailUrl || whiteboardTeamVal.thumbnail || null,
      };

      await whiteboardTeamRef.update(updatedTeam);

      return sendResponse(updatedTeam);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to update team.', e.message);
    }
  }

  async deleteTeam(uid: string, teamId: string) {
    try {
      const bucket = admin.storage().bucket();
      const { whiteboardTeamRef } = await this.checkIfTeamExists(uid, teamId);

      await whiteboardTeamRef.remove();

      bucket
        .deleteFiles({
          prefix: `${this.rootDb}/${uid}/${teamId}`,
        })
        .catch((error) => {
          console.log('Error deleting teams data for user: ' + uid, error);
        });

      return sendResponse('Successfully deleted team.');
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to remove a team.', e.message);
    }
  }

  async leaveTeam(uid: string, teamAdminId: string, teamId: string) {
    try {
      const { whiteboardTeamSnap, db } = await this.checkIfTeamExists(
        teamAdminId,
        teamId,
      );
      const whiteboardTeamVal = whiteboardTeamSnap.val();

      if (whiteboardTeamVal.admin === uid) {
        return sendError('The whiteboard team admin cannot leave his team.');
      }

      const whiteboardTeamMemberRef = db.ref(
        `${this.rootDb}/${whiteboardTeamVal.admin}/${teamId}/members/${uid}`,
      );

      await whiteboardTeamMemberRef.remove();

      return sendResponse('Successfully left team');
    } catch (e) {
      console.log(e);
      return sendError('Could not leave team.', e.message);
    }
  }

  async getTeamMembers(uid: string, teamId: string) {
    try {
      const { whiteboardTeamSnap, db } = await this.checkIfTeamExists(
        uid,
        teamId,
      );

      const whiteboardTeamVal = whiteboardTeamSnap.val();
      const whiteboardTeamMemberIds = parseCollectionToArray(
        whiteboardTeamVal.members,
      ).map((member) => member.id);

      const membersDataPromises = whiteboardTeamMemberIds.map(async (id) => {
        const userRef = db.ref(`users/${id}`);
        const userSnap = await userRef.get();
        const userData: IUser = userSnap.val();
        const { displayName, photoURL, email } = userData;
        const memberData = {
          id,
          email,
          displayName,
          photoURL,
        };

        return memberData;
      });

      const membersData = await promiseAllSettled(membersDataPromises);

      return sendResponse(membersData);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to get team members.', e.message);
    }
  }

  //! This method deletes member from the whiteboardTeams/:teamId collection,
  //! but it doesn't remove any reference to that team that the member may have himself
  async deleteMember(uid: string, teamId: string, memberId: string) {
    try {
      const { whiteboardTeamSnap, db } = await this.checkIfTeamExists(
        uid,
        teamId,
      );

      const whiteboardTeamVal = whiteboardTeamSnap.val();
      const whiteboardTeamMembers = parseCollectionToArray(
        whiteboardTeamVal.members,
      );

      const memberIndex = whiteboardTeamMembers.findIndex(
        (member) =>
          member.id === memberId && memberId !== whiteboardTeamVal.admin,
      );

      if (memberIndex === -1) {
        throw new Error(
          `Member with uid '${memberId}' is not a removable member of the team with ${whiteboardTeamVal.id}.`,
        );
      }

      const whiteboardTeamMemberRef = db.ref(
        `${this.rootDb}/${uid}/${teamId}/members/${memberId}`,
      );

      await whiteboardTeamMemberRef.remove();

      return sendResponse('Member successfully deleted.');
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to remove member from the Team.',
        e.message,
      );
    }
  }

  // Helper Methods
  private async checkIfTeamExists(
    uid: string,
    teamId: string,
  ): Promise<{
    whiteboardTeamRef: Reference;
    whiteboardTeamSnap: DataSnapshot;
    db: Database;
  }> {
    const db = admin.database();
    const whiteboardTeamRef = db.ref(`${this.rootDb}/${uid}/${teamId}`);
    const whiteboardTeamSnap = await whiteboardTeamRef.get();

    if (!whiteboardTeamSnap.exists()) {
      throw 'Could not find whiteboards team.';
    }

    return { whiteboardTeamRef, whiteboardTeamSnap, db };
  }
}
