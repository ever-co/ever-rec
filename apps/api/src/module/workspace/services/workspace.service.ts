import { IAccessMember, IWorkspace } from '../Interfaces/Workspace';
import * as admin from 'firebase-admin';
import { IDataResponse, IUserData, ItemType } from '../../../interfaces/_types';
import { IUser } from '../../../interfaces/IUser';
import { nanoid } from 'nanoid';
import { WorkspaceUtilitiesService } from './utilities.service';
import { Injectable } from '@nestjs/common';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
} from '../Interfaces/Files';
import {
  getDataFromDB,
  parseCollectionToArray,
  parseCollectionToIdValueObj,
  promiseAllSettled,
} from '../../../services/utils/helpers';
import { WorkspaceMembersService } from './members.service';
import { IWorkspaceFolder } from '../Interfaces/Folders';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { IFavoriteFolders } from 'src/interfaces/Folders';

@Injectable()
export class WorkspacesService {
  private readonly config;

  constructor(
    private readonly utilitiesService: WorkspaceUtilitiesService,
    private readonly workspaceMembersService: WorkspaceMembersService
  ) {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
  }

  async getUserWorkspaces(
    uid: string
  ): Promise<IDataResponse<IWorkspace[] | null>> {
    try {
      const db = admin.database();
      const userRef = db.ref(`users/${uid}`);
      const userSnap = await userRef.get();
      const userVal: IUser = userSnap.val();
      const workspacesRef = db.ref(`workspaces`);
      const workspacesSnap = await workspacesRef.get();
      const workspacesVal = workspacesSnap.val();
      const workspaces: IWorkspace[] = [];

      if (!userVal) {
        return sendError('No user');
      }

      // Don't really want to fetch the files of each workspace. This function sends basic workspace data,
      // for listing available workspaces, their names etc. Files data will be loaded on demand for each workspace.
      const userWorkspaces = userVal.workspaceIds || [];
      userWorkspaces.forEach(
        id =>
          id &&
          workspaces.push({
            ...workspacesVal[id],
            screenshots: [],
            videos: [],
            id: id,
            folders: parseCollectionToArray(workspacesVal[id].folders, true),
          })
      );

      return sendResponse<IWorkspace[]>(workspaces);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to fetch user workspaces. Please try again later.'
      );
    }
  }

  async createNewWorkspace(
    uid: string,
    userName: string,
    userEmail: string,
    workspaceName: string
  ): Promise<IDataResponse<IWorkspace | null>> {
    try {
      const db = admin.database();
      const userRef = db.ref(`users/${uid}`);
      const userSnap = await userRef.get();
      const user: IUser = userSnap.val();

      if (!user) {
        return sendError('User does not exist!');
      }

      const workspaceId = nanoid(28);
      const workspaceRef = db.ref(`workspaces/${workspaceId}`);
      const workspaceSnap = await workspaceRef.get();
      const workspaceVal = workspaceSnap.val();

      if (!workspaceVal) {
        const newWorkspace: IWorkspace = {
          id: workspaceId,
          admin: uid,
          name: workspaceName,
          members: [{ id: uid }],
          teams: [],
          folders: [],
          screenshots: [],
          videos: [],
          created: Date.now(),
        };
        const workspaceIds = user.workspaceIds || [];
        workspaceIds.push(workspaceId);
        await Promise.all([
          workspaceRef.set(newWorkspace),
          userRef.update({ workspaceIds }),
        ]);
        const workspace: IWorkspace =
          await this.utilitiesService.parseWorkspaceItems(newWorkspace);

        return sendResponse<IWorkspace>(workspace);
      } else {
        return sendError('Workspace already exists!');
      }
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to add workspace to the Database!');
    }
  }

  async getSingleWorkspace(
    uid: string,
    workspaceId: string,
    folderId: string | false
  ): Promise<
    IDataResponse<(IWorkspace & { favFolders: IFavoriteFolders }) | null>
  > {
    try {
      const { workspaceVal, db } = await this.utilitiesService.getWorkspaceById(
        workspaceId
      );
      let { value: favFolders } = await getDataFromDB<IFavoriteFolders>(
        `users/${uid}/favoriteFolders`
      );

      if (favFolders) {
        favFolders = {
          images: [],
          videos: [],
          workspaces: {},
          ...favFolders,
        };
      }

      const memberIds: { id: string }[] = [...workspaceVal.members];
      const memberPromises = memberIds.map(memberObj =>
        this.utilitiesService.getShortUserData(memberObj.id)
      );
      const members = await promiseAllSettled(memberPromises);

      const parsedFolderId = folderId || false;

      // Adding "user" property to the video and image data. This would be the owner of the item.
      // Some logic to avoid fetching members that have been already fetched above.
      // Extra logic for item owners that are no longer in the workspace. (notFoundMembers)
      const notFoundMembers: {
        id: string;
        index: number;
        itemType: ItemType;
      }[] = [];
      const mapNotFoundMembers = (
        item: IDbWorkspaceImageData | IDbWorkspaceVideoData,
        index: number,
        itemType: ItemType
      ) => {
        const foundMember = members.find(member => item.uid === member.id);

        let newItem = { ...item };
        if (foundMember) {
          newItem = { ...item, user: foundMember };
        } else {
          notFoundMembers.push({
            index,
            id: item.uid,
            itemType,
          });
        }

        return newItem;
      };

      const screenshots = parseCollectionToArray(workspaceVal.screenshots)
        .filter(
          (data: IDbWorkspaceImageData) => data.parentId === parsedFolderId
        )
        .map((screenshot: IDbWorkspaceImageData, index: number) =>
          mapNotFoundMembers(screenshot, index, 'image')
        );

      const videos = parseCollectionToArray(workspaceVal.videos)
        .filter(
          (data: IDbWorkspaceVideoData) => data.parentId === parsedFolderId
        )
        .map((video: IDbWorkspaceVideoData, index: number) =>
          mapNotFoundMembers(video, index, 'video')
        );

      //? Extra logic for item owners that are no longer in the workspace. (notFoundMembers)
      const notFoundMembersPromises = notFoundMembers.map(memberObj =>
        this.utilitiesService.getShortUserData(memberObj.id)
      );
      const outsideWorkspaceMembers = await promiseAllSettled(
        notFoundMembersPromises
      );
      notFoundMembers.forEach((member, index) => {
        if (member.id !== outsideWorkspaceMembers[index].id) return;

        if (member.itemType === 'image') {
          screenshots[member.index] = {
            ...screenshots[member.index],
            user: outsideWorkspaceMembers[index],
          };
          return;
        }

        videos[member.index] = {
          ...videos[member.index],
          user: outsideWorkspaceMembers[index],
        };
      });

      const folders = parseCollectionToArray(workspaceVal.folders, true);

      const workspace = await this.utilitiesService.parseWorkspaceItems({
        ...workspaceVal,
        screenshots,
        videos,
        folders,
        members,
      });

      return sendResponse<IWorkspace & { favFolders: IFavoriteFolders }>({
        ...workspace,
        favFolders,
      });
    } catch (e) {
      console.log(e);
      return sendError('Workspace not found.');
    }
  }

  async leaveWorkspace(
    uid: string,
    workspaceId: string
  ): Promise<IDataResponse<IWorkspace[] | null>> {
    try {
      const db = admin.database();
      const { workspaceRef, workspaceVal } =
        await this.utilitiesService.getWorkspaceById(workspaceId);
      const userRef = db.ref(`users/${uid}`);
      const userSnap = await userRef.get();
      const userVal: IUserData = userSnap.val();

      if (userVal) {
        const filteredWorkspaceMembers = parseCollectionToArray(
          workspaceVal.members
        ).filter(x => x.id !== uid);
        const newWorkspaceTeams = parseCollectionToArray(
          workspaceVal.teams
        ).map(x => {
          const newMembers = (x.members || []).filter(x => x.id !== uid);

          return {
            ...x,
            members: newMembers,
          };
        });
        const updatedWorkspaceFolders = parseCollectionToArray(
          workspaceVal.folders
        ).map((x: IWorkspaceFolder) => {
          if (x.access?.members) {
            x.access.members = x.access.members.filter(y => y.uid !== uid);
          }

          return x;
        });
        const newUserWorkspaces = userVal.workspaceIds.filter(
          x => x !== workspaceId
        );

        //TODO: should be decided if user images/videos/folders should be removed from workspace

        await workspaceRef.update({
          members: filteredWorkspaceMembers,
          teams: newWorkspaceTeams,
          folders: updatedWorkspaceFolders,
        });
        await userRef.update({ workspaceIds: newUserWorkspaces });
        return await this.getUserWorkspaces(uid);
      } else {
        return sendError('No such workspace or user');
      }
    } catch (e) {
      console.log(e);
      return sendError(
        e.message || 'Error while trying to leave workspace. Please try again.'
      );
    }
  }

  async deleteWorkspace(
    uid: string,
    workspaceId: string
  ): Promise<IDataResponse<IWorkspace[] | null>> {
    const bucket = admin.storage().bucket();
    const db = admin.database();
    const workspaceRef = db.ref(`workspaces/${workspaceId}`);
    const workspaceSnap = await workspaceRef.get();
    const workspaceVal: IWorkspace = workspaceSnap.val();

    if (workspaceVal) {
      // Remove the workspaceId from all members in the workspace
      const workspaceMembers = [
        ...(workspaceVal.members || []),
        { id: workspaceVal.admin, canManageFolders: true },
      ];
      await Promise.allSettled(
        workspaceMembers.map(async x => {
          try {
            const dbMemberRef = db.ref(`users/${x.id}`);
            const dbMemberSnap = await dbMemberRef.get();
            const dbMemberVal = dbMemberSnap.val();

            if (dbMemberVal) {
              const newWorkspaceIds = dbMemberVal.workspaceIds.filter(
                y => y !== workspaceId
              );

              await dbMemberRef.update({
                workspaceIds: newWorkspaceIds,
              });
            } else {
              console.log('Workspace user do not exists.');
              return;
            }
          } catch (e) {
            console.log(e);
            return undefined;
          }
        })
      );

      // Remove existing invite link for workspace
      const inviteLinkId = workspaceVal?.inviteLinkId;
      if (inviteLinkId) {
        const inviteRef = db.ref(`workspaceInvites/${inviteLinkId}`);
        inviteRef.remove().catch(error => {
          console.log(error);
        });
      }
    }

    await workspaceRef.remove();

    bucket
      .deleteFiles({
        prefix: `workspaces/${workspaceId}/`,
      })
      .catch(error => {
        console.log('Error deleting files from workspace:', error);
      });

    return this.getUserWorkspaces(uid);
  }

  async renameWorkspace(
    uid: string,
    workspaceId: string,
    newName: string
  ): Promise<IDataResponse<IWorkspace | null>> {
    try {
      const db = admin.database();
      const workspaceRef = db.ref(`workspaces/${workspaceId}`);

      await workspaceRef.update({ name: newName });

      const workspaceSnap = await workspaceRef.get();
      const workspaceVal: IWorkspace = workspaceSnap.val();

      return sendResponse<IWorkspace>(workspaceVal);
    } catch (e) {
      console.log(e);
      return sendError(e.message || 'Error while trying to rename workspace.');
    }
  }

  async changeWorkspaceAvatar(
    workspaceId: string,
    file: any
  ): Promise<IDataResponse<string>> {
    try {
      if (file.size > 30000) {
        return sendError('File size too big.');
      }
      const { workspaceRef } = await this.utilitiesService.getWorkspaceById(
        workspaceId
      );
      const { file: uploadedAvatar } =
        await this.utilitiesService.uploadImageInBucket(
          file,
          workspaceId,
          undefined,
          `workspaces/${workspaceId}/avatar`
        );
      const downloadUrl = (
        await uploadedAvatar.getSignedUrl({
          action: 'read',
          expires: Date.now() + 1000 * 15778476000,
        })
      )[0];
      await workspaceRef.update({ avatar: downloadUrl });

      return sendResponse<string>(downloadUrl);
    } catch (e) {
      console.log(e);
      return sendError('Error while tying to update avatar.');
    }
  }

  async changeWorkspaceThumbnail(
    workspaceId: string,
    file: any
  ): Promise<IDataResponse<string>> {
    try {
      const { workspaceRef } = await this.utilitiesService.getWorkspaceById(
        workspaceId
      );
      const { file: uploadedThumbnail } =
        await this.utilitiesService.uploadImageInBucket(
          file,
          workspaceId,
          undefined,
          `workspaces/${workspaceId}/thumbnail`
        );
      const downloadUrl = (
        await uploadedThumbnail.getSignedUrl({
          action: 'read',
          expires: Date.now() + 1000 * 15778476000,
        })
      )[0];
      await workspaceRef.update({ thumbnail: downloadUrl });

      return sendResponse<string>(downloadUrl);
    } catch (e) {
      console.log(e);
      return sendError('Error while tying to update thumbnail.');
    }
  }
}
