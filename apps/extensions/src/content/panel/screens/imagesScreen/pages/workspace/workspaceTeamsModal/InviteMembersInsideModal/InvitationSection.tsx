import { FC } from 'react';
import classNames from 'classnames';
import * as styles from './InviteMembersInsideModal.module.scss';
import { ReactMultiEmail } from 'react-multi-email';
import { IInviteMembersInsideModalProps } from './InviteMembersInsideModal';
import {
  loadingMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import WorkspaceInviteLink from './WorkspaceInviteLink';
import { sendWorkspaceInviteLink } from '@/app/services/email';

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
  const sendEmail = async (
    emails: string[],
    inviteLink: string,
    userName: string,
  ) => {
    if (!emails.length) return;

    const linkComponents = inviteLink.split('/');
    const inviteId = linkComponents[linkComponents.length - 1];

    const emailStr = emails.length > 1 ? 'emails' : 'email';
    const id = loadingMessage(`Sending ${emailStr}`);
    const data = await sendWorkspaceInviteLink(emails, inviteId, userName);

    setEmails([]);

    if (!data)
      return updateMessage(
        id,
        `Could not send ${emailStr}. Please try again later.`,
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

const EmailInput: FC<IEmailsInput> = ({ emails, setEmails }) => {
  return (
    <ReactMultiEmail
      emails={emails}
      placeholder="Add Email"
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
        <AppSvg path="/images/panel/common/close.svg" size="14px" />
      </div>
    </div>
  );
};

interface ISendEmailProps {
  disabled?: boolean;
  onEmailSend: () => void;
}

const SendEmailButton: FC<ISendEmailProps> = ({
  disabled = false,
  onEmailSend,
}) => {
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
        path="images/panel/common/email-white.svg"
        size="20px"
        className="tw-mr-5px"
        bgColor="white"
      />
      Send Email
    </AppButton>
  );
};

export default InvitationSection;
