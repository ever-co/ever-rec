import { FC } from 'react';
import Image from 'next/image';
import styles from './MyTeamsInsideModal.module.scss';
import classNames from 'classnames';
import { IWorkspaceTeam } from 'app/interfaces/IWorkspaceTeams';
import WorkspaceTeamsEmpty from 'components/pagesComponents/_workspacesScreen/WorkspaceTeamsEmpty';

interface IMyTeamsProps {
  userId: string;
  teams: IWorkspaceTeam[];
  isWorkspaceAdmin: boolean;
  onManage: () => void;
  onManageTeamsEmpty: () => void;
  onLeave: (teamId: string, teamName: string) => void;
}

const MyTeamsInsideModal: FC<IMyTeamsProps> = ({
  userId,
  teams,
  isWorkspaceAdmin,
  onManage,
  onManageTeamsEmpty,
  onLeave,
}) => {
  if (!teams.length) {
    return (
      <WorkspaceTeamsEmpty
        inModal
        isWorkspaceAdmin={false}
        onManageTeamsEmpty={onManageTeamsEmpty}
        onCreateTeam={() => void 0}
      />
    );
  }

  return (
    <>
      {teams.map((team, index) => {
        const isInTeam = teams[index].members.find(
          (member) => member.id === userId,
        );
        return (
          <div key={team.id}>
            <div className={classNames(styles.teamWrapper)}>
              <div className={styles.mainRow}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatar}>
                    <Image
                      src={team.avatar || '/common/team-icon.svg'}
                      alt="team avatar"
                      width="26px"
                      height="26px"
                    />
                  </div>
                  <div className={styles.teamName}>{team.name}</div>
                </div>

                <div className={styles.members}>
                  {team?.members.length} members
                </div>
              </div>

              <div className={styles.actionsWrapper}>
                <div className={styles.goAction} onClick={() => onManage()}>
                  {isWorkspaceAdmin ? 'Manage' : 'Go to'}
                </div>

                {!isWorkspaceAdmin && isInTeam && (
                  <div
                    className={styles.leaveAction}
                    onClick={() => onLeave(team.id, team.name)}
                  >
                    Leave
                  </div>
                )}
              </div>
            </div>
            <hr className={styles.separator}></hr>
          </div>
        );
      })}
    </>
  );
};

export default MyTeamsInsideModal;
