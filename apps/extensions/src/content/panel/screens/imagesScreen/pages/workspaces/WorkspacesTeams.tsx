import React, { useState, useEffect, FC, useCallback } from 'react';
import * as styles from './WorkspaceManageScreen.module.scss';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { useDispatch, useSelector, RootStateOrAny } from 'react-redux';
import { IWorkspace, IWorkspaceUser } from '@/app/interfaces/IWorkspace';
import {
  loadingMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import {
  createWorkspaceTeam,
  getWorkspaceTeamsMembers,
  leaveWorkspaceTeam,
} from '@/app/services/workspaceTeams';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import CreateWorkspaceTeamModal from '../workspace/CreateWorkspaceTeamModal';
import WorkspacesTeamsEmpty from './WorkspacesTeamsEmpty';
import WorkspaceTeamMembers from './WorkspaceTeamMembers';
import UpdateWorkspaceTeamModal from '../workspace/updateWorkspaceTeamModal/UpdateWorkspaceTeamModal';
import {
  ITeamsMembersMap,
  IWorkspaceTeam,
} from '@/app/interfaces/IWorkspaceTeams';
import WorkspaceMembersModalWrapper from './WorkspaceMembersModalWrapper';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaces: IWorkspace[] | null = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const [teams, setTeams] = useState<IWorkspaceTeam[] | null>([]);
  const [teamsMembersMap, setTeamsMembersMap] =
    useState<ITeamsMembersMap | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [membersModalState, setMembersModalState] =
    useState<IWorkspaceMembersModal>({
      state: null,
      show: false,
    });
  const [showUpdateWorkspaceTeamModal, setShowUpdateWorkspaceTeamModal] =
    useState<{ state: boolean; team: IWorkspaceTeam | null }>({
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

    const workspaceId = searchParams.get('workspaceId');

    const currentWorkspace = workspaces.find(
      (workspace) => workspace.id === workspaceId,
    );

    currentWorkspace && getTeamsMembers(currentWorkspace.id);

    currentWorkspace &&
      dispatch(
        PanelAC.setActiveWorkspace({ activeWorkspace: currentWorkspace }),
      );
  }, [workspaces, getTeamsMembers, dispatch]);

  useEffect(() => {
    if (!activeWorkspace) return;

    const teams = activeWorkspace?.teams ? [...activeWorkspace.teams] : null;

    setTeams(teams);
  }, [activeWorkspace]);

  const createTeamHandler = async (name: string) => {
    if (name === '' || !activeWorkspace) return;
    setShowCreateTeamModal(false);

    const id = loadingMessage(t('workspace.creatingTeam'));
    const teamsData = await createWorkspaceTeam(activeWorkspace.id, name);
    await getTeamsMembers(activeWorkspace.id);

    if (!teamsData) {
      return updateMessage(id, t('workspace.couldNotCreateTeam'), 'error');
    }

    dispatch(
      PanelAC.setActiveWorkspace({
        activeWorkspace: { ...activeWorkspace, teams: teamsData },
      }),
    );

    updateMessage(id, t('workspace.teamCreated'), 'success');
  };

  const membersClickHandler = async (
    teamId?: string,
    teamName?: string,
    teamAdminId?: string,
    tabIndex = 0,
  ) => {
    if (!teamsMembersMap || !teamId || !teamName || !teamAdminId) return;

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
      return updateMessage(toast, t('workspace.couldNotLeaveTeam'), 'error');
    }

    const targetTeamMembers = newTeams[index].members.filter(
      (member) => member.id !== memberId,
    );

    newTeams[index].members = targetTeamMembers;

    setTeams(newTeams);
  };

  const leaveTeamHandler = async (teamId: string, teamName: string) => {
    if (!activeWorkspace) return;

    const toast = loadingMessage(t('toasts.leavingTeam'));
    const leftMemberId = await leaveWorkspaceTeam(activeWorkspace.id, teamId);
    if (!leftMemberId) {
      return updateMessage(toast, t('workspace.couldNotLeaveTeam'), 'error');
    }

    removeMemberFromMembersMap(teamId, leftMemberId);
    removeMemberFromTeams(teamId, leftMemberId, toast);

    updateMessage(toast, t('toasts.leftTeam') + teamName, 'success');
  };

  return (
    <>
      <DashboardCard className={styles.dashboardCard}>
        <div className={classNames(styles.mainHeader, styles.teamHeader)}>
          <div className={styles.teamHeading}>
            <a onClick={() => navigate(`${panelRoutes.manageWorkspace.path}`)}>
              <AppSvg
                path="images/panel/common/arrow_back-light.svg"
                className="tw-cursor-pointer"
                size="30px"
              />
            </a>
            {activeWorkspace?.name} - {t('workspace.teamsOverview')}
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
                {t('workspace.createTeam')}
              </AppButton>
            </div>
          )}
        </div>

        {teams ? (
          <div className={classNames(styles.workspacesContainer, 'scroll-div')}>
            {teams.map((team: any) => {
              const isTeamAdmin = user?.id === team?.admin;
              const isInTeam = team?.members.find(
                (member: any) => member.id === user.id,
              );

              return (
                <div key={team.id}>
                  <div className={styles.workspaceItemWrapper}>
                    <div className={styles.thumbnailWrapper}>
                      <img
                        src={
                          team?.thumbnail ||
                          '/images/panel/common/Thumbnail.svg'
                        }
                        alt=""
                        width={!team?.thumbnail ? '200px' : '100%'}
                        height={!team?.thumbnail ? '150px' : '184px'}
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
                      {!isTeamAdmin && isInTeam && (
                        <div
                          className={classNames(styles.subItem, styles.danger)}
                          onClick={() => leaveTeamHandler(team.id, team.name)}
                          title={t('workspace.leaveTeam')}
                        >
                          <AppSvg
                            path="/images/panel/common/leave.svg"
                            size="24px"
                          />
                        </div>
                      )}
                      {isTeamAdmin && (
                        <div className={styles.teamOptionsWrapper}>
                          <div
                            className={styles.membersCountWrapper}
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
                              path="/images/panel/common/team-add-member.svg"
                              size="24px"
                              className={styles.settingsSvg}
                              bgColor="#636366"
                            />
                          </div>

                          <div
                            className={styles.membersCountWrapper}
                            onClick={() =>
                              setShowUpdateWorkspaceTeamModal({
                                state: true,
                                team,
                              })
                            }
                          >
                            <AppSvg
                              path="/images/panel/common/icon-Manage-dark.svg"
                              size="24px"
                              className={styles.settingsSvg}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <WorkspacesTeamsEmpty
            onCreateTeam={() => setShowCreateTeamModal(true)}
            isWorkspaceAdmin={isWorkspaceAdmin}
          />
        )}
      </DashboardCard>

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
        visible={showUpdateWorkspaceTeamModal.state}
        workspace={activeWorkspace}
        team={showUpdateWorkspaceTeamModal.team || null}
        isAdmin={isWorkspaceAdmin}
        onCancel={() =>
          setShowUpdateWorkspaceTeamModal({ state: false, team: null })
        }
      />
      <AppSpinner show={!activeWorkspace && true} local />
    </>
  );
};

export default WorkspaceTeams;
