/* eslint-disable @next/next/no-img-element */
import { panelRoutes, preRoutes } from 'components/_routes';
import classNames from 'classnames';
import { IUser, IUserShort } from 'app/interfaces/IUserData';
import styles from './UserShortInfo.module.scss';
import AppSvg from '../../../../elements/AppSvg';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <div className="tw-flex tw-items-center tw-h-full tw-max-w-100p">
      <Link
        href={preRoutes.settings + panelRoutes.profile}
        className={classNames(
          styles.userPhotoContainer,
          `tw-rounded-full tw-overflow-hidden tw-cursor-pointer tw-flex tw-justify-center tw-mr-4 tw-h-full px tw-h-full`,
        )}
        style={{
          width: `${avaSize}px`,
          height: `${avaSize}px`,
          pointerEvents: disableGoToProfile ? 'none' : 'auto',
        }}
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
          <Link
            href={preRoutes.settings + panelRoutes.profile}
            className={classNames(
              styles,
              `tw-cursor-pointer tw-w-full tw-object-cover`,
            )}
            style={{
              width: `${avaSize}px`,
              height: `${avaSize}px`,
              pointerEvents: disableGoToProfile ? 'none' : 'auto',
            }}
          >
            <AppSvg
              path="/sign/default-profile.svg"
              size={avaSize - 10 + 'px'}
              className="tw-flex tw-justify-center tw-content-center tw-mt-0.5"
            />
          </Link>
        ) : (
          ''
        )}
      </Link>

      {!hideInfo && (
        <div className="tw-flex tw-flex-col tw-w-200px tw-relative tw-overflow-hidden tw-text-ellipsis">
          <Link
            style={{
              pointerEvents: disableGoToProfile ? 'none' : 'auto',
            }}
            href={preRoutes.settings + panelRoutes.profile}
            title={user?.displayName}
            className={classNames(fullNameClasses, styles.userName)}
          >
            {user?.displayName || t('common.user')}
          </Link>

          <div className={classNames(styles.emailStyle, emailClasses)}>
            {user?.email}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserShortInfo;
