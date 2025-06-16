import { FC } from 'react';
import * as styles from './MyTeamsInsideModal.module.scss';
import classNames from 'classnames';
import WorkspacesTeamsEmpty from '../../../workspaces/WorkspacesTeamsEmpty';
import { IWorkspaceTeam } from '@/app/interfaces/IWorkspaceTeams';
import { Trans, useTranslation } from 'react-i18next';

interface IMyTeamsProps {
  teams: IWorkspaceTeam[];
  userId: string;
  isWorkspaceAdmin: boolean;
  onManage: () => void;
  onManageTeamsEmpty: () => void;
  onLeave: (teamId: string, teamName: string) => void;
}

const MyTeamsInsideModal: FC<IMyTeamsProps> = ({
  teams,
  userId,
  isWorkspaceAdmin,
  onManage,
  onManageTeamsEmpty,
  onLeave,
}) => {
  const { t } = useTranslation();
  if (!teams.length) {
    return (
      <WorkspacesTeamsEmpty
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
                    <img
                      src={team.avatar || '/images/panel/common/team-icon.svg'}
                      alt="team avatar"
                      width="26px"
                      height="26px"
                    />
                  </div>
                  <div className={styles.teamName}>{team.name}</div>
                </div>

                <div className={styles.members}>
                  <Trans
                    i18nKey="workspace.membersWithLength"
                    values={{ length: team.members.length }}
                  />
                </div>
              </div>

              <div className={styles.actionsWrapper}>
                <div className={styles.goAction} onClick={() => onManage()}>
                  {isWorkspaceAdmin
                    ? t('page.image.manage')
                    : t('page.image.goto')}
                </div>

                {!isWorkspaceAdmin && isInTeam && (
                  <div
                    className={styles.leaveAction}
                    onClick={() => onLeave(team.id, team.name)}
                  >
                    {t('common.leave')}
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
