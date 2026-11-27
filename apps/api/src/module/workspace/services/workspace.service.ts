import {
  IAccessMember,
  IWorkspace,
  IWorkspaceUser,
} from '../Interfaces/Workspace';
import * as admin from 'firebase-admin';
import { IDataResponse, IUserData, ItemType } from '../../../interfaces/_types';
import { IUser } from '../../../interfaces/IUser';
import { nanoid } from 'nanoid';
import { WorkspaceUtilitiesService } from './utilities.service';
import { Inject, Injectable } from '@nestjs/common';
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
import {
  changeWorkspaceFolders,
  changeWorkspaceMembers,
  changeWorkspaceTeams,
} from './change-workspace-collection';
import {
  addUserWorkspaceId,
  removeUserWorkspaceId,
} from './user-workspace-ids';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { IFavoriteFolders } from 'src/interfaces/Folders';
import { Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EVER_COUNTER_EVENTS,
  storedMediaUnder,
} from '../../../common/events/ever-counters.events';
import {
  EVER_CONNECT_ACCOUNT_DELETIONS,
  EVER_CONNECT_WORKSPACE_LINK_READER,
  EverConnectAccountDeletions,
  EverConnectWorkspaceLinkReader,
} from '../../../common/ever-platform/tokens';

@Injectable()
export class WorkspacesService {
  private readonly config;

  constructor(
    private readonly utilitiesService: WorkspaceUtilitiesService,
    private readonly workspaceMembersService: WorkspaceMembersService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
    // Present only when the optional Ever Platform connection module is loaded.
    @Optional()
    @Inject(EVER_CONNECT_WORKSPACE_LINK_READER)
    private readonly everLinks?: EverConnectWorkspaceLinkReader,
    // Present only when the optional Ever Platform connection module is loaded.
    @Optional()
    @Inject(EVER_CONNECT_ACCOUNT_DELETIONS)
    private readonly accountDeletions?: EverConnectAccountDeletions,
  ) {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
  }

  async getUserWorkspaces(
    uid: string,
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
      // An id can outlive its workspace (a join that lands after deleteWorkspace read the members,
      // or a member update there that failed), and can be listed twice. Skip the first and list
      // each workspace once, so one such id does not fail the whole list.
      const userWorkspaces = [...new Set(userVal.workspaceIds || [])];
      userWorkspaces.forEach((id) => {
        const workspace = id ? workspacesVal?.[id] : null;
        if (!workspace) {
          return;
        }

        workspaces.push({
          ...workspace,
          screenshots: [],
          videos: [],
          id: id,
          folders: parseCollectionToArray(workspace.folders, true),
        });
      });

      return sendResponse<IWorkspace[]>(workspaces);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to fetch user workspaces. Please try again later.',
      );
    }
  }

  async createNewWorkspace(
    uid: string,
    userName: string,
    userEmail: string,
    workspaceName: string,
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
        // The id joins the user's list in a transaction on the list: a write of the list read above
        // would drop a workspace created or joined meanwhile.
        await Promise.all([
          workspaceRef.set(newWorkspace),
          addUserWorkspaceId(uid, workspaceId),
        ]);
        // The creator becomes the workspace's admin. Asked only once the workspace is written: a
        // deletion of the account that Ever Platform asked for marks the account before it checks
        // whether the account administers a workspace, so either it sees this workspace (and keeps
        // the account) or this sees its mark, and the workspace is undone (also when the mark
        // could not be read).
        const undo = () =>
          Promise.all([
            workspaceRef.remove(),
            removeUserWorkspaceId(uid, workspaceId),
          ]);
        let deleting = false;
        try {
          deleting = !!(await this.accountDeletions?.deletionStarted(uid));
        } catch (error) {
          await undo();
          throw error;
        }
        if (deleting) {
          await undo();
          return sendError(
            'This account is being deleted, so it cannot create a workspace.',
          );
        }
        this.eventEmitter?.emit(EVER_COUNTER_EVENTS.workspaceCreated, {});
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
    folderId: string | false,
  ): Promise<
    IDataResponse<(IWorkspace & { favFolders: IFavoriteFolders }) | null>
  > {
    try {
      const { workspaceVal, db } = await this.utilitiesService.getWorkspaceById(
        workspaceId,
      );
      let { value: favFolders } = await getDataFromDB<IFavoriteFolders>(
        `users/${uid}/favoriteFolders`,
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
      const memberPromises = memberIds.map((memberObj) =>
        this.utilitiesService.getShortUserData(memberObj.id),
      );
      // A member whose account was deleted has no record any more: leave it out.
      const members = (await promiseAllSettled(memberPromises)).filter(
        (member) => !!member,
      );

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
        itemType: ItemType,
      ) => {
        const foundMember = members.find((member) => item.uid === member.id);

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
          (data: IDbWorkspaceImageData) => data.parentId === parsedFolderId,
        )
        .map((screenshot: IDbWorkspaceImageData, index: number) =>
          mapNotFoundMembers(screenshot, index, 'image'),
        );

      const videos = parseCollectionToArray(workspaceVal.videos)
        .filter(
          (data: IDbWorkspaceVideoData) => data.parentId === parsedFolderId,
        )
        .map((video: IDbWorkspaceVideoData, index: number) =>
          mapNotFoundMembers(video, index, 'video'),
        );

      //? Extra logic for item owners that are no longer in the workspace. (notFoundMembers)
      const notFoundMembersPromises = notFoundMembers.map((memberObj) =>
        this.utilitiesService.getShortUserData(memberObj.id),
      );
      const outsideWorkspaceMembers = await promiseAllSettled(
        notFoundMembersPromises,
      );
      notFoundMembers.forEach((member, index) => {
        // No record (a deleted account): the item keeps no owner.
        if (member.id !== outsideWorkspaceMembers[index]?.id) return;

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

      // The organization handle of a workspace linked through the Ever Platform connection; the
      // body is unchanged when that module is not loaded or the workspace is not linked.
      const everHandle = await this.everLinks?.everHandle(workspaceId);
      return sendResponse<IWorkspace & { favFolders: IFavoriteFolders }>({
        ...workspace,
        favFolders,
        ...(everHandle ? { everHandle } : {}),
      });
    } catch (e) {
      console.log(e);
      return sendError('Workspace not found.');
    }
  }

  async leaveWorkspace(
    uid: string,
    workspaceId: string,
  ): Promise<IDataResponse<IWorkspace[] | null>> {
    try {
      const db = admin.database();
      // The workspace must exist.
      await this.utilitiesService.getWorkspaceById(workspaceId);
      const userRef = db.ref(`users/${uid}`);
      const userSnap = await userRef.get();
      const userVal: IUserData = userSnap.val();

      if (userVal) {
        //TODO: should be decided if user images/videos/folders should be removed from workspace

        // The teams and the members change in the transactions every writer of these lists shares,
        // from the stored lists: a write of the lists read earlier put back a member who left
        // meanwhile (with access to the workspace) and dropped one who joined. The teams go
        // first: when either list does not change, the user is still a member and may leave again.
        const teamsLeft = await changeWorkspaceTeams(workspaceId, (teams) => {
          let changed = false;
          const items = teams.map((team) => {
            const members = parseCollectionToArray<IWorkspaceUser>(
              team.members,
            ).filter(Boolean);
            if (!members.some((member) => member.id === uid)) {
              return team;
            }
            changed = true;
            return {
              ...team,
              members: members.filter((member) => member.id !== uid),
            };
          });

          return changed ? { items } : {};
        });
        if (teamsLeft.ok === false) {
          return sendError(
            'Error while trying to leave workspace. Please try again.',
          );
        }

        const membersLeft = await changeWorkspaceMembers(
          workspaceId,
          (members) =>
            members.some((member) => member.id === uid)
              ? { items: members.filter((member) => member.id !== uid) }
              : {},
        );
        if (membersLeft.ok === false) {
          return sendError(
            'Error while trying to leave workspace. Please try again.',
          );
        }

        // Then the user's own list, in a transaction as a join adds to it: a write of the list read
        // above would drop a workspace joined meanwhile.
        await removeUserWorkspaceId(uid, workspaceId);

        // A join by invite of this same user that landed after the members change found the
        // workspace still listed, and the change above then took it out: list it again, or the
        // user is a member of a workspace missing from the list, which a new join does not repair.
        const membersNow = parseCollectionToArray<IWorkspaceUser>(
          (await db.ref(`workspaces/${workspaceId}/members`).get()).val(),
        );
        if (membersNow.some((member) => member?.id === uid)) {
          await addUserWorkspaceId(uid, workspaceId);
        }

        // The user's folder permissions leave in the transaction every writer of the folder list
        // shares: a write of the list read above would undo a folder, an item count or a permission
        // changed meanwhile. The workspace guard turns a non-member away before any folder
        // permission is read, so the leave stands when this fails; the failure is only logged.
        const cleaned = await changeWorkspaceFolders(workspaceId, (folders) => {
          let changed = false;
          const items = folders.map((folder) => {
            const members = parseCollectionToArray<IAccessMember>(
              folder.access?.members,
            );
            if (!members.some((member) => member?.uid === uid)) {
              return folder;
            }
            changed = true;
            return {
              ...folder,
              access: {
                ...folder.access,
                members: members.filter((member) => member?.uid !== uid),
              },
            };
          });

          return changed ? { items } : {};
        });
        if (cleaned.ok === false) {
          console.log(
            `Could not remove the folder permissions of a member who left workspace ${workspaceId}.`,
          );
        }

        return await this.getUserWorkspaces(uid);
      } else {
        return sendError('No such workspace or user');
      }
    } catch (e) {
      console.log(e);
      return sendError(
        e.message || 'Error while trying to leave workspace. Please try again.',
      );
    }
  }

  async deleteWorkspace(
    uid: string,
    workspaceId: string,
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
      // In a transaction on each member's list: a write of the list read earlier would drop a
      // workspace the member created or joined meanwhile. A member without a list (or without a
      // record) is left as it is.
      await Promise.allSettled(
        workspaceMembers.map(async (x) => {
          try {
            await removeUserWorkspaceId(x.id, workspaceId);
          } catch (e) {
            console.log(e);
            return undefined;
          }
        }),
      );

      // Remove existing invite link for workspace
      const inviteLinkId = workspaceVal?.inviteLinkId;
      if (inviteLinkId) {
        const inviteRef = db.ref(`workspaceInvites/${inviteLinkId}`);
        inviteRef.remove().catch((error) => {
          console.log(error);
        });
      }
    }

    await workspaceRef.remove();
    if (workspaceVal) {
      this.eventEmitter?.emit(EVER_COUNTER_EVENTS.workspaceDeleted, {});
    }
    if (workspaceVal?.teams) {
      this.eventEmitter?.emit(EVER_COUNTER_EVENTS.teamDeleted, {
        count: Object.keys(workspaceVal.teams).length,
      });
    }

    // The bytes of its screenshots and videos, subtracted once the files are gone.
    const removedMedia = await storedMediaUnder(
      this.eventEmitter,
      bucket,
      `workspaces/${workspaceId}/`,
    );
    bucket
      .deleteFiles({
        prefix: `workspaces/${workspaceId}/`,
      })
      .then(() => {
        for (const media of removedMedia) {
          this.eventEmitter?.emit(EVER_COUNTER_EVENTS.mediaDeleted, media);
        }
      })
      .catch((error) => {
        console.log('Error deleting files from workspace:', error);
      });

    return this.getUserWorkspaces(uid);
  }

  async renameWorkspace(
    uid: string,
    workspaceId: string,
    newName: string,
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
    file: any,
  ): Promise<IDataResponse<string>> {
    try {
      if (file.size > 30000) {
        return sendError('File size too big.');
      }
      const { workspaceRef } = await this.utilitiesService.getWorkspaceById(
        workspaceId,
      );
      const { file: uploadedAvatar } =
        await this.utilitiesService.uploadImageInBucket(
          file,
          workspaceId,
          undefined,
          `workspaces/${workspaceId}/avatar`,
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
    file: any,
  ): Promise<IDataResponse<string>> {
    try {
      const { workspaceRef } = await this.utilitiesService.getWorkspaceById(
        workspaceId,
      );
      const { file: uploadedThumbnail } =
        await this.utilitiesService.uploadImageInBucket(
          file,
          workspaceId,
          undefined,
          `workspaces/${workspaceId}/thumbnail`,
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
