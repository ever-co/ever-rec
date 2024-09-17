import React, { FC, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import styles from 'pagesScss/workspaces/ManageWorkspaces.module.scss';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { IWorkspace, IWorkspaceUser } from 'app/interfaces/IWorkspace';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import Image from 'next/image';
import AppSvg from 'components/elements/AppSvg';
import MediaIndex from 'pages/media';
import { useRouter } from 'next/router';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import UpdateWorkspaceTeamModal from 'components/pagesComponents/_imagesScreen/pages/workspace/updateWorkspaceTeamModal/UpdateWorkspaceTeamModal';
import { panelRoutes, preRoutes } from 'components/_routes';
import Link from 'next/link';
import AppButton from 'components/controls/AppButton';
import CreateWorkspaceTeamModal from 'components/pagesComponents/_imagesScreen/components/CreateWorkspaceTeamModal';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import {
  createWorkspaceTeam,
  getWorkspaceTeamsMembers,
  leaveWorkspaceTeam,
} from 'app/services/workspaceTeams';
import WorkspaceTeamsEmpty from 'components/pagesComponents/_workspacesScreen/WorkspaceTeamsEmpty';
import WorkspaceTeamMembers from 'components/pagesComponents/_workspacesScreen/WorkspaceTeamMembers';
import {
  ITeamsMembersMap,
  IWorkspaceTeam,
} from 'app/interfaces/IWorkspaceTeams';
import WorkspaceMembersModalWrapper from 'components/pagesComponents/_workspacesScreen/WorkspaceMembersModalWrapper';

interface IWorkspaceMembersState {
  teamId: string;
  teamAdminId: string;
  teamName: string;
  teamMembers: IWorkspaceUser[];
  tabIndex: number;
}

export interface IWorkspaceMembersModal {
  state: IWorkspaceMembersState | null;
  show: boolean;
}

const WorkspaceTeams: FC = () => {
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const router = useRouter();
  const dispatch = useDispatch();
  const workspaces: IWorkspace[] | null = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const [teams, setTeams] = useState([]);
  const [teamsMembersMap, setTeamsMembersMap] =
    useState<ITeamsMembersMap | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [membersModalState, setMembersModalState] =
    useState<IWorkspaceMembersModal>({
      state: null,
      show: false,
    });
  const [showUpdateWorkspaceTeamModal, setShowUpdateWorkspaceTeamModal] =
    useState<{ state: boolean; team: IWorkspaceTeam }>({
      state: false,
      team: null,
    });

  const isWorkspaceAdmin = activeWorkspace?.admin === user?.id;

  const getTeamsMembers = useCallback(async (workspaceId: string) => {
    const data = await getWorkspaceTeamsMembers(workspaceId);
    if (!data)
      return console.log('No teams data for workspaceId: ' + workspaceId);
    setTeamsMembersMap(data);
    return data;
  }, []);

  // Handle page refresh case
  useEffect(() => {
    if (!workspaces) return;
    if (!router.isReady) return;

    const { workspaceId } = router.query;
    const currentWorkspace = workspaces.find(
      (workspace) => workspace.id === workspaceId,
    );

    currentWorkspace && getTeamsMembers(currentWorkspace.id);

    currentWorkspace &&
      dispatch(
        PanelAC.setActiveWorkspace({ activeWorkspace: currentWorkspace }),
      );
  }, [workspaces, router, getTeamsMembers, dispatch]);

  useEffect(() => {
    if (!activeWorkspace) return;

    const teams = activeWorkspace?.teams ? [...activeWorkspace.teams] : null;

    setTeams(teams);
  }, [activeWorkspace]);

  const createTeamHandler = async (name: string) => {
    if (name === '') return;
    setShowCreateTeamModal(false);

    const id = loadingMessage('Creating a Team...');
    const teamsData = await createWorkspaceTeam(activeWorkspace.id, name);
    await getTeamsMembers(activeWorkspace.id);

    if (!teamsData) {
      return updateMessage(id, 'Could not create a workspace Team...', 'error');
    }

    dispatch(
      PanelAC.setActiveWorkspace({
        activeWorkspace: { ...activeWorkspace, teams: teamsData },
      }),
    );

    updateMessage(id, 'Team created!', 'success');
  };

  const membersClickHandler = async (
    teamId: string,
    teamName: string,
    teamAdminId: string,
    tabIndex = 0,
  ) => {
    if (!teamsMembersMap) return;

    const teamMembersData = teamsMembersMap[teamId];

    setMembersModalState({
      state: {
        teamId,
        teamName,
        teamAdminId,
        teamMembers: teamMembersData,
        tabIndex,
      },
      show: true,
    });
  };

  const addMemberToMembersMap = (teamId: string, memberId: string) => {
    return new Promise((resolve) =>
      setTeamsMembersMap((prev) => {
        if (!activeWorkspace) {
          resolve(null);
          return prev;
        }

        const newMap = { ...prev };
        const member = activeWorkspace.members.find(
          (member) => member.id === memberId,
        );
        if (!member) {
          resolve(newMap);
          return newMap;
        }

        const newMembers = [...newMap[teamId], member];
        newMap[teamId] = newMembers;

        resolve(newMap);
        return newMap;
      }),
    );
  };

  const removeMemberFromMembersMap = (teamId: string, memberId: string) => {
    return new Promise((resolve) =>
      setTeamsMembersMap((prev) => {
        const newMap = { ...prev };
        const newMembers = newMap[teamId].filter(
          (member) => member.id !== memberId,
        );
        newMap[teamId] = newMembers;

        resolve(newMap);
        return newMap;
      }),
    );
  };

  const removeMemberFromTeams = (
    teamId: string,
    memberId: string,
    toast: any,
  ) => {
    if (!teams || !teams.length) return;

    const newTeams = [...teams];
    const index = newTeams.findIndex((t) => t.id === teamId);
    if (index === -1) {
      return updateMessage(toast, 'Could not leave team', 'error');
    }

    const targetTeamMembers = newTeams[index].members.filter(
      (member) => member.id !== memberId,
    );

    newTeams[index].members = targetTeamMembers;

    setTeams(newTeams);
  };

  const leaveTeamHandler = async (teamId: string, teamName: string) => {
    if (!activeWorkspace) return;

    const toast = loadingMessage('Leaving team...');
    const leftMemberId = await leaveWorkspaceTeam(activeWorkspace.id, teamId);
    if (!leftMemberId) {
      return updateMessage(toast, 'Could not leave team', 'error');
    }

    removeMemberFromMembersMap(teamId, leftMemberId);
    removeMemberFromTeams(teamId, leftMemberId, toast);

    updateMessage(toast, 'Successfully left the Team ' + teamName, 'success');
  };

  return (
    <>
      <MediaIndex>
        <DashboardCard className={styles.dashboardCard}>
          <div className={classNames(styles.mainHeader, styles.teamHeader)}>
            <div className={styles.teamHeading}>
              <Link
                href={`${preRoutes.media}${panelRoutes.manageWorkspaces}`}
                passHref
              >
                <a>
                  <AppSvg
                    path="/common/arrow_back-light.svg"
                    className="tw-cursor-pointer"
                    size="30px"
                  />
                </a>
              </Link>
              {activeWorkspace?.name} - Teams Overview
            </div>
            {isWorkspaceAdmin && (
              <div>
                <AppButton
                  onClick={() => setShowCreateTeamModal(true)}
                  bgColor="tw-bg-primary-purple"
                  twPadding="tw-p-3"
                  className="tw-whitspace-nowrap tw-mr-3 tw-w-150px"
                  full={true}
                >
                  Create Team
                </AppButton>
              </div>
            )}
          </div>

          {teams ? (
            <div
              className={classNames(styles.workspacesContainer, 'scroll-div')}
            >
              {teams.map((team) => {
                const isTeamAdmin = user?.id === team?.admin;
                const isInTeam = team?.members.find(
                  (member) => member.id === user.id,
                );

                return (
                  <div key={team.id}>
                    <div className={styles.workspaceItemWrapper}>
                      <div className={styles.thumbnailWrapper}>
                        <Image
                          src={team?.thumbnail || '/common/Thumbnail.svg'}
                          alt="Team thumbnail"
                          width={!team?.thumbnail ? '200' : undefined}
                          height={!team?.thumbnail ? '150' : undefined}
                          layout={team?.thumbnail ? 'fill' : 'fixed'}
                          className={team?.thumbnail && styles.thumbnail}
                        />
                        <div className={styles.workspaceName}>{team.name}</div>
                      </div>
                      <div className={styles.subItemsWrapper}>
                        <WorkspaceTeamMembers
                          team={team}
                          teamMembers={
                            teamsMembersMap && teamsMembersMap[team.id]
                          }
                          teamMemberCount={team.members.length}
                          onMembersClick={membersClickHandler}
                        />
                        {isTeamAdmin && (
                          <div className={styles.teamOptionsWrapper}>
                            <div
                              onClick={() =>
                                membersClickHandler(
                                  team.id,
                                  team.name,
                                  team.admin,
                                  1, // Select Tab Workspace Members
                                )
                              }
                            >
                              <AppSvg
                                path="/common/team-add-member.svg"
                                width="24px"
                                height="24px"
                                className={styles.settingsSvg}
                                bgColor="#636366"
                              />
                            </div>

                            <div
                              onClick={() =>
                                setShowUpdateWorkspaceTeamModal({
                                  state: true,
                                  team,
                                })
                              }
                            >
                              <AppSvg
                                path="/common/icon-Manage-dark.svg"
                                width="24px"
                                height="24px"
                                className={styles.settingsSvg}
                              />
                            </div>
                          </div>
                        )}
                        {!isTeamAdmin && isInTeam && (
                          <div
                            className={classNames(
                              styles.subItem,
                              styles.danger,
                            )}
                            onClick={() => leaveTeamHandler(team.id, team.name)}
                            title="Leave team"
                          >
                            <AppSvg
                              path="/common/leave.svg"
                              width="24px"
                              height="24px"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <WorkspaceTeamsEmpty
              onCreateTeam={() => setShowCreateTeamModal(true)}
              isWorkspaceAdmin={isWorkspaceAdmin}
            />
          )}
        </DashboardCard>
        <AppSpinner show={!activeWorkspace && true} local />

        <CreateWorkspaceTeamModal
          visible={showCreateTeamModal}
          onOk={createTeamHandler}
          onClose={() => setShowCreateTeamModal(false)}
        />
        <WorkspaceMembersModalWrapper
          isWorkspaceAdmin={isWorkspaceAdmin}
          activeWorkspace={activeWorkspace}
          membersModalState={membersModalState}
          setMembersModalState={setMembersModalState}
          getTeamsMembers={getTeamsMembers}
          addMemberToMembersMap={addMemberToMembersMap}
          removeMemberFromMembersMap={removeMemberFromMembersMap}
        />
        <UpdateWorkspaceTeamModal
          workspace={activeWorkspace}
          team={showUpdateWorkspaceTeamModal.team}
          isAdmin={isWorkspaceAdmin}
          visible={showUpdateWorkspaceTeamModal.state}
          onCancel={() =>
            setShowUpdateWorkspaceTeamModal({ state: false, team: null })
          }
        />
      </MediaIndex>
    </>
  );
};

export default WorkspaceTeams;
