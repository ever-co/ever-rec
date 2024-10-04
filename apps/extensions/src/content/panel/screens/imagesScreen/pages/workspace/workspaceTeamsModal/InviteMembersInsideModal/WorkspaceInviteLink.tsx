import { FC } from 'react';
import { IInviteMembersInsideModalProps } from './InviteMembersInsideModal';
import classNames from 'classnames';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import * as styles from './InviteMembersInsideModal.module.scss';

type Props = Omit<IInviteMembersInsideModalProps, 'userName'>;

const WorkspaceInviteLink: FC<Props> = ({
  link,
  copied,
  primaryButtonClickHandler,
}) => {
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
          path={
            copied
              ? 'images/panel/common/done.svg'
              : 'images/panel/common/copy.svg'
          }
          size="20px"
          className="tw-mr-5px"
        />
        {link ? 'Copy Link' : 'Create Workspace Invite'}
      </AppButton>
    </div>
  );
};

export default WorkspaceInviteLink;
