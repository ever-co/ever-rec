import React, { useState, useEffect, FC } from 'react';
import {
  ITeamsMembersMap,
  IWorkspaceTeam,
} from 'app/interfaces/IWorkspaceTeams';
import { errorMessage } from 'app/services/helpers/toastMessages';
import {
  addWorkspaceTeamMember,
  removeWorkspaceTeamMember,
} from 'app/services/workspaceTeams';
import PanelAC from 'app/store/panel/actions/PanelAC';
import Queue from 'queue-promise';
import { useDispatch } from 'react-redux';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import WorkspaceMembersModal from './WorkspaceMembersModal';
import { IWorkspaceMembersModal } from 'pages/media/workspaces/teams/[workspaceId]';
import { useTranslation } from 'react-i18next';

const queue = new Queue({
  concurrent: 1,
  interval: 1,
  start: true,
});

export interface IMemberLoadingIds {
  [teamId: string]: string[];
}

interface IProps {
  isWorkspaceAdmin: boolean;
  activeWorkspace: IWorkspace | null;
  membersModalState: IWorkspaceMembersModal;
  setMembersModalState: React.Dispatch<
    React.SetStateAction<IWorkspaceMembersModal>
  >;
  getTeamsMembers: (workspaceId: string) => Promise<void | ITeamsMembersMap>;
  addMemberToMembersMap: (teamId: string, memberId: string) => Promise<unknown>;
  removeMemberFromMembersMap: (
    teamId: string,
    memberId: string,
  ) => Promise<unknown>;
}

const WorkspaceMembersModalWrapper: FC<IProps> = ({
  isWorkspaceAdmin,
  activeWorkspace,
  membersModalState,
  setMembersModalState,
  getTeamsMembers,
  addMemberToMembersMap,
  removeMemberFromMembersMap,
}) => {
  const dispatch = useDispatch();
  const [membersLoadingIds, setMemberLoadingIds] = useState<IMemberLoadingIds>(
    {},
  );

  // When all requests in the queue end, we fetch teams members and update related UI state to make sure its correct.
  useEffect(() => {
    queue.on('end', async () => {
      if (!activeWorkspace || !membersModalState.state) return;

      const teamsMembersMapData = await getTeamsMembers(activeWorkspace.id);

      if (!teamsMembersMapData) return;

      setMembersModalState((prev) => {
        if (!prev.state) return prev;

        return {
          ...prev,
          state: {
            ...prev.state,
            teamMembers: teamsMembersMapData[prev.state.teamId],
          },
        };
      });
    });

    return () => {
      queue.removeAllListeners();
    };
  }, [
    activeWorkspace,
    membersModalState,
    getTeamsMembers,
    setMembersModalState,
  ]);

  const removeMemberFromLoadingState = (teamId: string, memberId: string) => {
    setMemberLoadingIds((prev) => {
      const membersLoadingObject = { ...prev };
      const membersIds = membersLoadingObject[teamId]
        ? [...membersLoadingObject[teamId]]
        : [];

      const newMembersIds = membersIds.filter((id) => id !== memberId);

      membersLoadingObject[teamId] = newMembersIds;

      return membersLoadingObject;
    });
  };

  const addMemberToLoadingState = (teamId: string, memberId: string) => {
    setMemberLoadingIds((prev) => {
      const membersLoadingObject = { ...prev };
      const newMembers = membersLoadingObject[teamId]
        ? [...membersLoadingObject[teamId], memberId]
        : [memberId];

      membersLoadingObject[teamId] = newMembers;

      return membersLoadingObject;
    });
  };

  const { t } = useTranslation();
  const addOrRemoveTeamMember = async (
    teamId: string,
    memberId: string,
    addMember = true,
  ) => {
    if (!activeWorkspace) return;

    addMemberToLoadingState(teamId, memberId);

    // We need to queue requests synchronously to avoid issues with wrong data from the server when the request is sent repeatedly very fast.
    queue.enqueue(async () => {
      let newTeamsData: IWorkspaceTeam[] | null = null;
      if (addMember) {
        newTeamsData = await addWorkspaceTeamMember(
          activeWorkspace.id,
          teamId,
          memberId,
        );
      } else {
        newTeamsData = await removeWorkspaceTeamMember(
          activeWorkspace.id,
          teamId,
          memberId,
        );
      }

      if (!newTeamsData) {
        errorMessage(t('toasts.thereProblem'));
        removeMemberFromLoadingState(teamId, memberId);
        return;
      }

      dispatch(
        PanelAC.setActiveWorkspace({
          activeWorkspace: { ...activeWorkspace, teams: newTeamsData },
        }),
      );

      let newMap: any = null;
      if (addMember) {
        newMap = await addMemberToMembersMap(teamId, memberId);
      } else {
        newMap = await removeMemberFromMembersMap(teamId, memberId);
      }

      newMap &&
        setMembersModalState((prev) => {
          if (!prev.state) return prev;
          if (prev.state.teamId !== teamId) return prev;

          return {
            ...prev,
            state: {
              ...prev.state,
              teamMembers: newMap[teamId],
            },
          };
        });

      removeMemberFromLoadingState(teamId, memberId);
    });
  };

  return (
    <WorkspaceMembersModal
      isWorkspaceAdmin={isWorkspaceAdmin}
      tabIndex={membersModalState.state?.tabIndex || 0}
      teamId={membersModalState.state?.teamId || ''}
      teamAdminId={membersModalState.state?.teamAdminId || ''}
      teamName={membersModalState.state?.teamName || ''}
      teamMembers={membersModalState.state?.teamMembers || []}
      workspaceMembers={activeWorkspace?.members || []}
      membersLoading={membersLoadingIds}
      visible={membersModalState.show}
      onTeamMemberAdd={(teamId, memberId) =>
        addOrRemoveTeamMember(teamId, memberId, true)
      }
      onTeamMemberRemove={(teamId, memberId) =>
        addOrRemoveTeamMember(teamId, memberId, false)
      }
      onClose={() => setMembersModalState({ state: null, show: false })}
    />
  );
};

export default WorkspaceMembersModalWrapper;
