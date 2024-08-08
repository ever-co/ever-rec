/* eslint-disable @next/next/no-img-element */
import { FC } from 'react';
import { panelRoutes, preRoutes } from 'components/_routes';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import { IUser, IUserShort } from 'app/interfaces/IUserData';
import styles from './UserShortInfo.module.scss';
import AppSvg from '../../../../elements/AppSvg';

interface IUserShortInfoProps {
  user: IUser | IUserShort;
  hideInfo?: boolean;
  avaSize?: number;
  fullNameClasses?: string;
  emailClasses?: string;
  publicPage?: boolean;
  disableGoToProfile?: boolean;
}

const UserShortInfo: React.FC<IUserShortInfoProps> = ({
  user,
  hideInfo,
  avaSize = 40,
  fullNameClasses = 'tw-font-semibold tw-truncate',
  emailClasses = 'tw-text-sm',
  publicPage,
  disableGoToProfile = false,
}) => {
  const router = useRouter();

  const goToProfile = () =>
    !disableGoToProfile &&
    router.push(preRoutes.settings + panelRoutes.profile);

  return (
    <div className="tw-flex tw-items-center tw-h-full tw-max-w-100p">
      <div
        className={classNames(
          styles.userPhotoContainer,
          `tw-rounded-full tw-overflow-hidden tw-cursor-pointer tw-flex tw-justify-center tw-mr-4 tw-h-full px tw-h-full`,
        )}
        style={{ width: `${avaSize}px`, height: `${avaSize}px` }}
        onClick={goToProfile}
      >
        {user?.photoURL ? (
          <img
            src={user?.photoURL}
            className={classNames(
              styles.userPhoto,
              'tw-w-full tw-object-cover',
            )}
            alt=""
          />
        ) : !publicPage ? (
          <div
            className={classNames(
              styles,
              `tw-cursor-pointer tw-w-full tw-object-cover`,
            )}
            style={{ width: `${avaSize}px`, height: `${avaSize}px` }}
            onClick={goToProfile}
          >
            <AppSvg
              path="/sign/default-profile.svg"
              size={avaSize - 10 + 'px'}
              className="tw-flex tw-justify-center tw-content-center tw-mt-0.5"
            />
          </div>
        ) : (
          ''
        )}
      </div>

      {!hideInfo && (
        <div className="tw-flex tw-flex-col tw-w-200px tw-relative tw-overflow-hidden tw-text-ellipsis">
          <div
            title={user?.displayName}
            className={classNames(fullNameClasses, styles.userName)}
            onClick={goToProfile}
          >
            {user?.displayName || 'User'}
          </div>

          <div className={classNames(styles.emailStyle, emailClasses)}>
            {user?.email}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserShortInfo;
