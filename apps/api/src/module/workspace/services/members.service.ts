import { IDataResponse } from '../../../interfaces/_types';
import { IWorkspace, IWorkspaceUser } from '../Interfaces/Workspace';
import { WorkspaceUtilitiesService } from './utilities.service';
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { IUser } from 'src/interfaces/IUser';
import { sendError, sendResponse } from '../../../services/utils/sendResponse';
import { parseCollectionToArray } from '../../../services/utils/helpers';

@Injectable()
export class WorkspaceMembersService {
  constructor(private readonly utilitiesService: WorkspaceUtilitiesService) {}
  async addWorkspaceMember(
    uid: string,
    name: string,
    email: string,
    workspaceId: string
  ): Promise<IDataResponse<IWorkspace | null>> {
    try {
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);
      const members = workspaceVal.members || [];
      members.push({ id: uid });

      await workspaceRef.update({ members });
      const workspace = await this.utilitiesService.parseWorkspaceItems(
        workspaceVal
      );

      return this.utilitiesService.sendResponse<IWorkspace>({
        ...workspace,
        members,
      });
    } catch (e) {
      console.log(e);
      return this.utilitiesService.sendError(
        e.message || 'Error while trying to add workspace member.'
      );
    }
  }

  async removeMemberFromWorkspace(
    uid: string,
    workspaceId: string
  ): Promise<IDataResponse<IWorkspace | null>> {
    const { workspaceVal, workspaceRef } =
      await this.utilitiesService.getWorkspaceById(workspaceId);
    const members: IWorkspaceUser[] = workspaceVal.members || [];
    const index = members.findIndex(x => x.id === uid);

    if (index === -1) {
      return this.utilitiesService.sendError(
        'User not a member of this workspace.'
      );
    }

    members.splice(index, 1);

    await workspaceRef.update({ members });
    const workspace: IWorkspace =
      await this.utilitiesService.parseWorkspaceItems(workspaceVal);

    return this.utilitiesService.sendResponse<IWorkspace>({
      ...workspace,
      members,
    });
  }

  populateWorkspaceMembers(
    workspace: IWorkspace,
    users: IUser[],
    limit?: string | number
  ): IWorkspaceUser[] {
    const parsedUsers = parseCollectionToArray(users, true);
    let startIndex = 0;
    let endIndex = 20;

    if (limit) {
      startIndex = +limit - 20;
      endIndex = +limit;
    }

    const usersToParse = workspace.members.slice(startIndex, endIndex);
    const result = usersToParse.map(workspaceUser => {
      const userFomDB = parsedUsers.find(y => y.id === workspaceUser.id);

      return {
        id: workspaceUser.id,
        displayName: userFomDB.displayName || 'Anonymous',
        email: userFomDB.email || 'No Email',
        photoURL: userFomDB.photoURL,
      };
    });

    return result;
  }

  async getPopulatedMembers(
    uid: string,
    workspaceId: string,
    limit?: string | number
  ) {
    try {
      const db = admin.database();
      const workspaceRef = db.ref(`workspaces/${workspaceId}`);
      const workspaceVal: IWorkspace = (await workspaceRef.get()).val();
      const usersRef = db.ref('users');
      const usersVal: IUser[] = (await usersRef.get()).val();

      return sendResponse<IWorkspaceUser[]>(
        this.populateWorkspaceMembers(workspaceVal, usersVal, limit)
      );
    } catch (e) {
      console.log(e);
      return sendError(
        e.message || 'Something went wrong when getting workspace users.'
      );
    }
  }
}
