import { useState, useEffect, FC } from 'react';
import * as styles from './InviteMembersInsideModal.module.scss';
import AppSvg from '@/content/components/elements/AppSvg';
import InvitationSection from './InvitationSection';
import { changeWheelSpeed } from '@/content/utilities/scripts/changeWheelSpeed';

export interface IInviteMembersInsideModalProps {
  link: string;
  copied: boolean;
  userName: string;
  primaryButtonClickHandler: () => void;
}

export const InviteMembersInsideModal: FC<IInviteMembersInsideModalProps> = ({
  link,
  copied,
  userName,
  primaryButtonClickHandler,
}) => {
  const [emails, setEmails] = useState<string[]>([]);

  useEffect(() => {
    const element = document.querySelector('.react-multi-email');
    element && changeWheelSpeed(element, 0.2);
  }, []);

  return (
    <div className={styles.InviteMembers}>
      <IllustrationWrapper />
      <InvitationSection
        link={link}
        copied={copied}
        userName={userName}
        emails={emails}
        setEmails={setEmails}
        primaryButtonClickHandler={primaryButtonClickHandler}
      />
    </div>
  );
};

const IllustrationWrapper = () => {
  return (
    <div className={styles.illustrationWrapper}>
      <AppSvg path="/images/images/noimage.svg" className="tw-w-max" />
      <p>Start inviting coworkers and friends to your company.</p>
    </div>
  );
};

export default InviteMembersInsideModal;
