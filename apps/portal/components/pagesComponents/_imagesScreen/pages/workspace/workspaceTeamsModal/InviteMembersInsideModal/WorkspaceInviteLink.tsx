import styles from './InviteMembersInsideModal.module.scss';
import classNames from 'classnames';
import AppButton from 'components/controls/AppButton';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WorkspaceInviteLink = ({ link, copied, primaryButtonClickHandler }) => {
  const { t } = useTranslation();
  const Icon = copied ? Check : Copy;

  return (
    <div className={styles.workspaceInviteWrapper}>
      {link && <p className={styles.whiteParagraph}>{link}</p>}

      <AppButton
        onClick={copied ? () => void 0 : primaryButtonClickHandler}
        className={classNames(
          styles.whiteParagraphButton,
          !link && styles.createWorkspaceButton,
          copied && 'tw-opacity-80',
        )}
      >
        <Icon className="tw-size-4 tw-shrink-0" aria-hidden="true" />
        {link ? t('modals.copyLink') : t('workspace.createWorkspaceInvite')}
      </AppButton>
    </div>
  );
};

export default WorkspaceInviteLink;
