import React from 'react';
import classNames from 'classnames';
import browser from '@/app/utilities/browser';
import { IUser } from '@/app/interfaces/IUserData';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import AppSvg from '@/content/components/elements/AppSvg';

interface IUserShortInfoProps {
  user: IUser;
  showFullInfo?: boolean;
  showInfoSmall?: boolean;
  avaSize?: number;
  fullNameClasses?: string;
  emailClasses?: string;
}

const UserShortInfoPopup: React.FC<IUserShortInfoProps> = ({
  user,
  showFullInfo = false,
  showInfoSmall = false,
  avaSize = 40,
  fullNameClasses = 'tw-font-semibold',
  emailClasses = 'tw-text-sm',
}) => {
  const goToProfile = () =>
    browser.tabs.create({
      url: panelRoutes.profile.path,
    });

  return (
    <div className="tw-flex tw-items-center tw-justify-end">
      {user.photoURL ? (
        <div
          className="tw-rounded-full tw-overflow-hidden tw-cursor-pointer tw-flex"
          style={{ height: `${avaSize}px`, width: `${avaSize}px` }}
          onClick={goToProfile}
        >
          <img src={user.photoURL} className="tw-w-full tw-object-cover" />
        </div>
      ) : (
        <div
          onClick={goToProfile}
          className="tw-mx-2 tw-cursor-pointer tw-border-2 tw-border-app-dark tw-border-solid tw-rounded-full tw-p-1"
        >
          <AppSvg
            path="images/panel/sign/default-profile.svg"
            size={avaSize + 'px'}
          />
        </div>
      )}

      {showFullInfo && (
        <div className="tw-flex tw-flex-col tw-text-app-grey-darker">
          <div className={classNames(fullNameClasses)}>{user.displayName}</div>
          <div className={classNames(emailClasses)}>{user.email}</div>
        </div>
      )}

      {showInfoSmall && (
        <div
          className="tw-text-xs tw-ml-2 tw-cursor-pointer tw-text-app-grey-darker tw-truncate tw-max-w-100px"
          title={`${user.displayName || user.email}`}
          onClick={goToProfile}
        >
          {user.displayName || user.email}
        </div>
      )}
    </div>
  );
};

export default UserShortInfoPopup;
