import React, { FC } from 'react';
import classNames from 'classnames';
import * as styles from './WorkspacesTeamsEmpty.module.scss';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';

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
  return (
    <section
      className={classNames(
        styles.WorkspaceTeamsEmpty,
        inModal && styles.inModal,
      )}
    >
      <AppSvg path="images/panel/common/team.svg" />

      <h2>There are no teams for this workspace...</h2>

      {isWorkspaceAdmin && (
        <>
          <p className={styles.noMembersDescription}>
            Create a team and add members to it.
          </p>

          <div className={styles.addTeamWrapper}>
            <AppButton
              onClick={onCreateTeam}
              bgColor="tw-bg-primary-purple"
              twPadding="tw-p-3"
              className={styles.addTeamBtn}
              full
            >
              Create Team
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
          Manage Teams
        </AppButton>
      )}
    </section>
  );
};

export default WorkspacesTeamsEmpty;
