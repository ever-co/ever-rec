import { FC } from 'react';
import * as styles from './UserShortInfo.module.scss';
import classNames from 'classnames';
import AppSvg from '@/content/components/elements/AppSvg';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { IUser, IUserShort } from '@/app/interfaces/IUserData';
import { useNavigate } from 'react-router';

interface IUserShortInfoProps {
  user: IUser | IUserShort | null;
  hideInfo?: boolean;
  avaSize?: number;
  fullNameClasses?: string;
  emailClasses?: string;
  publicPage?: boolean;
  disableGoToProfile?: boolean;
}

const UserShortInfo: FC<IUserShortInfoProps> = ({
  user,
  hideInfo,
  avaSize = 40,
  fullNameClasses = 'tw-font-semibold tw-truncate',
  emailClasses = 'tw-text-sm tw-text-ellipsis tw-overflow-hidden',
  publicPage,
  disableGoToProfile = false,
}) => {
  const navigate = useNavigate();

  const goToProfile = () => {
    !disableGoToProfile && navigate(panelRoutes.profile.path);
  };

  return user ? (
    <div className="tw-flex tw-items-center tw-h-full">
      <div
        className={classNames(
          styles.userPhotoContainer,
          `tw-rounded-full tw-overflow-hidden tw-cursor-pointer tw-flex tw-justify-center tw-flex tw-mr-4 tw-h-full px tw-h-full`,
        )}
        style={{ width: `${avaSize}px`, height: `${avaSize}px` }}
        onClick={goToProfile}
      >
        {user.photoURL ? (
          <img
            src={user?.photoURL}
            className={classNames(
              styles.userPhoto,
              'tw-w-full tw-object-cover',
            )}
            alt=""
          />
        ) : (
          <div
            className={classNames(
              styles,
              `tw-cursor-pointer tw-w-full tw-object-cover`,
            )}
            style={{ width: `${avaSize}px`, height: `${avaSize}px` }}
            onClick={goToProfile}
          >
            <AppSvg
              path="images/panel/sign/default-profile.svg"
              size={avaSize - 10 + 'px'}
              className="tw-flex tw-justify-center tw-content-center tw-mt-0.5"
            />
          </div>
        )}
      </div>

      {!hideInfo && (
        <div className="tw-flex tw-flex-col tw-w-200px tw-relative tw-text-ellipsis tw-overflow-hidden">
          <div
            title={user?.displayName || 'User'}
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
  ) : null;
};

export default UserShortInfo;
