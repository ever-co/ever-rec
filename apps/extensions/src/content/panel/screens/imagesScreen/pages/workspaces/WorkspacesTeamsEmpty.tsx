import React, { FC } from 'react';
import classNames from 'classnames';
import * as styles from './WorkspacesTeamsEmpty.module.scss';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

interface IProps {
  inModal?: boolean;
  isWorkspaceAdmin: boolean;
  onManageTeamsEmpty?: () => void;
  onCreateTeam: () => void;
}

const WorkspacesTeamsEmpty: FC<IProps> = ({
  inModal = false,
  isWorkspaceAdmin,
  onManageTeamsEmpty,
  onCreateTeam,
}) => {
  const { t } = useTranslation();
  return (
    <section
      className={classNames(
        styles.WorkspaceTeamsEmpty,
        inModal && styles.inModal,
      )}
    >
      <AppSvg path="images/panel/common/team.svg" />

      <h2>{t('workspace.noTeams')}</h2>

      {isWorkspaceAdmin && (
        <>
          <p className={styles.noMembersDescription}>
            {t('workspace.inviteTeammatesDescription')}
          </p>

          <div className={styles.addTeamWrapper}>
            <AppButton
              onClick={onCreateTeam}
              bgColor="tw-bg-primary-purple"
              twPadding="tw-p-3"
              className={styles.addTeamBtn}
              full
            >
              {t('workspace.createTeam')}
            </AppButton>
          </div>
        </>
      )}

      {inModal && onManageTeamsEmpty && (
        <AppButton
          onClick={onManageTeamsEmpty}
          bgColor="tw-bg-primary-purple"
          twPadding="tw-p-2"
          className={styles.addTeamBtn}
          full
        >
          {t('workspace.manageTeams')}
        </AppButton>
      )}
    </section>
  );
};

export default WorkspacesTeamsEmpty;
