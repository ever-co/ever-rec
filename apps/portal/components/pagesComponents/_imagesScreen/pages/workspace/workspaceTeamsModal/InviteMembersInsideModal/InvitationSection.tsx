import { FC } from 'react';
import classNames from 'classnames';
import styles from './InviteMembersInsideModal.module.scss';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import { ReactMultiEmail } from 'react-multi-email';
import AppButton from 'components/controls/AppButton';
import { Mail, X } from 'lucide-react';
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
    <div data-tag>
      {email}

      <div
        className="tw-ml-1 tw-flex tw-size-4 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded tw-text-muted-foreground tw-transition-colors tw-duration-150 hover:tw-bg-foreground/10 hover:tw-text-foreground"
        onClick={onRemoveEmail}
      >
        <X className="tw-size-3" aria-hidden="true" />
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
  // The second action of the dialog (the first is the invite link above), so an outline button.
  return (
    <AppButton
      onClick={onEmailSend}
      outlined
      className={classNames(
        styles.whiteParagraphButton,
        disabled && 'tw-opacity-50',
      )}
    >
      <Mail className="tw-size-4 tw-shrink-0" aria-hidden="true" />
      {t('workspace.sendEmail')}
    </AppButton>
  );
};

export default InvitationSection;
