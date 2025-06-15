import { FC } from 'react';
import classNames from 'classnames';
import styles from './InviteMembersInsideModal.module.scss';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import { ReactMultiEmail } from 'react-multi-email';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import WorkspaceInviteLink from './WorkspaceInviteLink';
import { IInviteMembersInsideModalProps } from './InviteMembersInsideModal';
import { sendWorkspaceInviteLink } from 'app/services/email';
import { useTranslation } from 'react-i18next';

interface IInvitationSectionProps
  extends IInviteMembersInsideModalProps,
    IEmailsInput {}

interface IEmailsInput {
  emails: string[];
  setEmails: React.Dispatch<React.SetStateAction<string[]>>;
}

const InvitationSection: FC<IInvitationSectionProps> = ({
  link,
  copied,
  emails,
  userName,
  setEmails,
  primaryButtonClickHandler,
}) => {
  const { t } = useTranslation();
  const sendEmail = async (
    emails: string[],
    inviteLink: string,
    userName: string,
  ) => {
    if (!emails.length) return;

    const linkComponents = inviteLink.split('/');
    const inviteId = linkComponents[linkComponents.length - 1];

    const emailStr = emails.length > 1 ? t('common.emails') : t('common.email');
    const id = loadingMessage(`${t('toasts.sending')} ${emailStr}`);
    const data = await sendWorkspaceInviteLink(emails, inviteId, userName);

    setEmails([]);

    if (!data)
      return updateMessage(
        id,
        t('toasts.couldNotSend', { emailStr: emailStr }),
        'error',
      );
    updateMessage(id, data, 'success');
  };

  return (
    <div>
      <WorkspaceInviteLink
        link={link}
        copied={copied}
        primaryButtonClickHandler={primaryButtonClickHandler}
      />

      {link && (
        <div className={styles.workspaceInviteWrapper}>
          <EmailInput emails={emails} setEmails={setEmails} />
          <SendEmailButton
            disabled={!emails.length}
            onEmailSend={() => {
              sendEmail(emails, link, userName);
            }}
          />
        </div>
      )}
    </div>
  );
};

const EmailInput = ({ emails, setEmails }) => {
  const { t } = useTranslation();
  return (
    <ReactMultiEmail
      emails={emails}
      placeholder={t('workspace.addEmail')}
      style={emails.length ? { overflowY: 'scroll' } : undefined}
      className={classNames(
        styles.whiteParagraph,
        styles.reactMultiEmail,
        'scroll-div',
      )}
      getLabel={(
        email: string,
        index: number,
        removeEmail: (index: number) => void,
      ) => {
        return (
          <EmailLabel
            key={index}
            email={email}
            onRemoveEmail={() => removeEmail(index)}
          />
        );
      }}
      onChange={(_emails) => setEmails([..._emails])}
    />
  );
};

interface IEmailLabelProps {
  email: string;
  onRemoveEmail: () => void;
}

const EmailLabel: FC<IEmailLabelProps> = ({ email, onRemoveEmail }) => {
  return (
    <div data-tag className="tw-bg-white tw-px-0px tw-py-0px">
      {email}

      <div className="tw-cursor-pointer tw-ml-1" onClick={onRemoveEmail}>
        <AppSvg path="/common/close.svg" size="14px" />
      </div>
    </div>
  );
};

interface ISendEmailProps {
  disabled?: boolean;
  onEmailSend: () => void;
}

const SendEmailButton: FC<ISendEmailProps> = ({ disabled, onEmailSend }) => {
  const { t } = useTranslation();
  return (
    <AppButton
      onClick={onEmailSend}
      className={classNames(
        styles.whiteParagraphButton,
        'tw-rounded-bl-none tw-rounded-tl-none',
        disabled && 'tw-opacity-80',
      )}
    >
      <AppSvg
        path="/assets/svg/tools-panel/email-white.svg"
        size="20px"
        className="tw-mr-5px"
        bgColor="white"
      />
      {t('workspace.sendEmail')}
    </AppButton>
  );
};

export default InvitationSection;
