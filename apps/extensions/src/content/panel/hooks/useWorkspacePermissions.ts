import { PermissionsItemType } from '@/app/interfaces/ItemTypes';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceUser,
  IWorkspaceVideo,
  PermissionAccessEnum,
} from '@/app/interfaces/IWorkspace';
import { IWorkspaceTeam } from '@/app/interfaces/IWorkspaceTeams';
import { changeWorkspaceItemPermissionsAPI } from '@/app/services/api/workspace';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { useEffect, useState } from 'react';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';

type permissionsCollectionType = 'member' | 'team';
interface IProps {
  folder?: IWorkspaceDbFolder;
  item?: IWorkspaceImage | IWorkspaceVideo;
  permissionItemType: PermissionsItemType;
}

interface IDisplayMember extends IWorkspaceUser {
  read: boolean;
  write: boolean;
}
interface IDisplayTeam extends IWorkspaceTeam {
  write: boolean;
  read: boolean;
}

const useWorkspacePermissions = ({
  folder,
  item,
  permissionItemType,
}: IProps) => {
  const [teams, setTeams] = useState<IDisplayTeam[]>([]);
  const [members, setMembers] = useState<IDisplayMember[]>([]);
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const dispatch = useDispatch();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);

  useEffect(() => {
    const accessItem = folder ? folder : item?.dbData;
    const getDefaultMembers = () =>
      activeWorkspace?.members
        ?.filter((x) => x.id !== user?.id)
        .map((x) => ({
          ...x,
          read: true,
          write: true,
        }));
    const getDefaultTeams = () =>
      activeWorkspace?.teams?.map((team) => ({
        ...team,
        write: true,
        read: true,
      }));

    if (!accessItem?.access) {
      setMembers(getDefaultMembers());
      setTeams(getDefaultTeams());
    } else {
      const assignAccess = (access: PermissionAccessEnum) => ({
        write: access === PermissionAccessEnum.WRITE,
        read:
          access === PermissionAccessEnum.WRITE ||
          access === PermissionAccessEnum.READ,
      });

      if (accessItem.access.members) {
        const accessMembers = accessItem.access.members.map((x) => {
          const userFromWorkspace = activeWorkspace.members.find(
            (y) => y.id === x.uid,
          );

          return {
            id: x.uid,
            ...userFromWorkspace,
            ...assignAccess(x.access),
          };
        });

        setMembers([
          ...accessMembers,
          ...activeWorkspace.members
            .filter(
              (x) =>
                x.id !== user?.id && accessMembers.every((y) => y.id !== x.id),
            )
            .map((x) => ({
              ...x,
              read: true,
              write: true,
            })),
        ]);
      } else {
        setMembers(getDefaultMembers());
      }
      if (accessItem.access.teams) {
        setTeams(
          accessItem.access.teams.map((x) => {
            const teamFromWorkspace = activeWorkspace.teams.find(
              (y) => y.id === x.teamId,
            );

            if (!teamFromWorkspace?.id) {
              console.log(
                'missing team workspace Id in useWorkspacePermissions.ts  , when setting teams.',
              );
            }

            return {
              ...(teamFromWorkspace as any),
              ...assignAccess(x.access),
            };
          }),
        );
      } else {
        setTeams(getDefaultTeams());
      }
    }
  }, [folder, item]);

  const updateWorkspaceData = async (
    i: number,
    collection: IDisplayMember[] | IDisplayTeam[],
    permissionsType: permissionsCollectionType,
  ) => {
    const response = await changeWorkspaceItemPermissionsAPI(
      collection[i].id,
      activeWorkspace.id,
      //@ts-ignore
      folder ? folder.id : item.dbData.id,
      collection[i].write,
      collection[i].read,
      permissionsType,
      permissionItemType,
      !!folder,
    );

    const data = iDataResponseParser<typeof response.data>(response);

    const workspaceCopy = { ...activeWorkspace };
    if (data) {
      switch (data.permissionsItemType) {
        case 'folders': {
          const updatedFolder = data.item as IWorkspaceDbFolder;
          const folderIndex = workspaceCopy.folders.findIndex(
            (x) => x.id === data.item.id,
          );
          workspaceCopy.folders[folderIndex] = updatedFolder;
          break;
        }
        case 'screenshots': {
          const updatedScreenshot = data.item as IDbWorkspaceImageData;
          const imageIndex = workspaceCopy.screenshots.findIndex(
            (x) => x.dbData.id === data.item.id,
          );
          workspaceCopy.screenshots[imageIndex] = {
            ...workspaceCopy.screenshots[imageIndex],
            dbData: updatedScreenshot,
          };
          break;
        }
        case 'videos': {
          const updatedVideo = data.item as IDbWorkspaceVideoData;
          const videoIndex = workspaceCopy.videos.findIndex(
            (x) => x.dbData.id === data.item.id,
          );
          workspaceCopy.videos[videoIndex] = {
            ...workspaceCopy.videos[videoIndex],
            dbData: updatedVideo,
          };
          break;
        }
      }
    }
    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: workspaceCopy }));
  };

  const handleWriteChange = (
    i: number,
    collection: IDisplayMember[] | IDisplayTeam[],
    collectionType: permissionsCollectionType,
  ) => {
    let collectionCopy = [...collection];
    const updateState = (oldState: IDisplayMember[] | IDisplayTeam[]) => {
      const oldStateCopy = [...oldState];

      oldStateCopy[i].write = !oldStateCopy[i].write;
      if (oldStateCopy[i].write && !oldStateCopy[i].read) {
        oldStateCopy[i].read = true;
      }

      collectionCopy = oldStateCopy;

      return oldStateCopy;
    };

    collectionType === 'member'
      ? setMembers(updateState)
      : setTeams(updateState as any);

    updateWorkspaceData(i, collectionCopy, collectionType);
  };

  const handleReadChange = (
    i: number,
    collection: IDisplayMember[] | IDisplayTeam[],
    collectionType: permissionsCollectionType,
  ) => {
    let collectionCopy = [...collection];
    const updateState = (oldState: IDisplayMember[] | IDisplayTeam[]) => {
      const oldStateCopy = [...oldState];

      oldStateCopy[i].read = !oldStateCopy[i].read;
      if (oldStateCopy[i].write && !oldStateCopy[i].read) {
        oldStateCopy[i].write = false;
      }

      collectionCopy = oldStateCopy;

      return oldStateCopy;
    };

    collectionType === 'member'
      ? setMembers(updateState)
      : setTeams(updateState as any);

    updateWorkspaceData(i, collectionCopy, collectionType);
  };

  const handleMemberWriteChange = (i: number) => {
    handleWriteChange(i, members, 'member');
  };

  const handleMemberReadChange = (i: number) => {
    handleReadChange(i, members, 'member');
  };

  const handleTeamWriteChange = (i: number) => {
    handleWriteChange(i, teams, 'team');
  };

  const handleTeamReadChange = (i: number) => {
    handleReadChange(i, teams, 'team');
  };

  return {
    members,
    teams,
    handleMemberWriteChange,
    handleMemberReadChange,
    handleTeamWriteChange,
    handleTeamReadChange,
  };
};

export default useWorkspacePermissions;
