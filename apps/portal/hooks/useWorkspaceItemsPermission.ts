import { useCallback, useEffect, useState } from 'react';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspace,
  IWorkspaceDbFolder,
  PermissionAccessEnum,
} from 'app/interfaces/IWorkspace';
import { RootStateOrAny, useSelector } from 'react-redux';

interface Props {
  item?: IWorkspaceDbFolder | IDbWorkspaceImageData | IDbWorkspaceVideoData;
}
const useWorkspaceItemsPermission = ({ item }: Props) => {
  const [canEdit, setCanEdit] = useState(false);
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const user = useSelector((state: RootStateOrAny) => state.auth.user);

  useEffect(() => {
    if (activeWorkspace) {
      setCanEdit(canEditItem(item));
    } else {
      setCanEdit(true);
    }
  }, [activeWorkspace]);

  const canEditItem = useCallback(
    (
      item?: IWorkspaceDbFolder | IDbWorkspaceImageData | IDbWorkspaceVideoData,
    ) => {
      // TODO: written like this, public items wont be editable at all, should be changed if ever introduced public items.
      if (item?.isPublic) {
        return false;
      } else if (!item?.access) {
        return true;
      } else {
        const member = item?.access?.members?.find((x) => x.uid === user?.id);
        const userTeams = activeWorkspace?.teams?.filter((y) =>
          y.members.some((z) => z.id === user.id),
        );
        const userTeamsInItemAccess =
          item?.access?.teams?.filter((x) =>
            userTeams?.some((y) => y.id === x.teamId),
          ) || [];
        const [
          hasWriteAccessByMemberPermissions,
          userIsAdminOfTheWorkspace,
          someOfUserTeamsHasAccessToItem,
        ] = [
          member ? member?.access === PermissionAccessEnum.WRITE : true,
          activeWorkspace?.admin === user?.id,
          userTeamsInItemAccess?.length !== 0
            ? userTeamsInItemAccess?.some(
                (x) => x.access === PermissionAccessEnum.WRITE,
              )
            : member?.access === PermissionAccessEnum.WRITE ||
              !item?.access?.members,
        ];

        return (
          hasWriteAccessByMemberPermissions ||
          userIsAdminOfTheWorkspace ||
          someOfUserTeamsHasAccessToItem
        );
      }
    },
    [activeWorkspace, user],
  );

  const canViewItem = useCallback(
    (
      item: IWorkspaceDbFolder | IDbWorkspaceImageData | IDbWorkspaceVideoData,
    ) => {
      const member = item?.access?.members?.find((x) => x.uid === user?.id);
      const userTeams = activeWorkspace?.teams?.filter((y) => {
        return y.members.some((z) => z.id === user.id);
      });
      const userTeamsInItemAccess = item?.access?.teams?.filter((x) =>
        userTeams?.some((y) => y.id === x.teamId),
      );
      const hasReadPermissions = (access?: PermissionAccessEnum) => {
        return (
          access === PermissionAccessEnum.WRITE ||
          access === PermissionAccessEnum.READ
        );
      };
      const [
        userHasReadAccessByMemberPermissions,
        someOfUserTeamsHasAccessToItem,
        itemIsPublic,
        userIsAdminOfTheWorkspace,
      ] = [
        member ? hasReadPermissions(member.access) : true,
        userTeamsInItemAccess?.length !== 0
          ? userTeamsInItemAccess?.some((x) => hasReadPermissions(x.access))
          : hasReadPermissions(member?.access) || !item?.access?.members,
        item?.isPublic,
        activeWorkspace?.admin === user?.id,
      ];

      return (
        userHasReadAccessByMemberPermissions ||
        someOfUserTeamsHasAccessToItem ||
        itemIsPublic ||
        userIsAdminOfTheWorkspace
      );
    },
    [activeWorkspace, user],
  );

  return { canEdit, canEditItem, canViewItem, setCanEdit };
};

export default useWorkspaceItemsPermission;
