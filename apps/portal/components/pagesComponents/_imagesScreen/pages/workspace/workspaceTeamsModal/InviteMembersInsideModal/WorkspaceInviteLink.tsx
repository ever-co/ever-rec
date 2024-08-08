import styles from './InviteMembersInsideModal.module.scss';
import classNames from 'classnames';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';

const WorkspaceInviteLink = ({ link, copied, primaryButtonClickHandler }) => {
  return (
    <div className={styles.workspaceInviteWrapper}>
      {link && <p className={styles.whiteParagraph}>{link}</p>}

      <AppButton
        onClick={copied ? () => void 0 : primaryButtonClickHandler}
        className={classNames(
          styles.whiteParagraphButton,
          !link && styles.createWorkspaceButton,
          copied && 'tw-opacity-80',
          link && 'tw-rounded-bl-none tw-rounded-tl-none',
        )}
      >
        <AppSvg
          path={copied ? '/common/done.svg' : '/common/copy.svg'}
          size="20px"
          className="tw-mr-5px"
        />
        {link ? 'Copy Link' : 'Create Workspace Invite'}
      </AppButton>
    </div>
  );
};

export default WorkspaceInviteLink;
