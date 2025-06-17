import { FC } from 'react';
import styles from './ProfileSidebar.module.scss';
import classNames from 'classnames';
import AppSvg from 'components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

const ProfileSidebar: FC = () => {
  const { t } = useTranslation();
  return (
    <div className={styles.profileSidebar}>
      {/* <div className={classNames(styles.profileSidebarSection, 'scroll-div')}>
        <h1>In current teams</h1>
        <span className={styles.profileSidebarNotFoundSpan}>
          Currently not in any team.
        </span>
      </div> */}

      <div className={classNames(styles.profileSidebarSection, 'scroll-div')}>
        <h1>{t('page.profile.recentFiles.title')}</h1>
        <span className={styles.profileSidebarNotFoundSpan}>
          {/* No files added recently. */}
          {t('page.profile.recentFiles.emptyState')}
        </span>
        {/* <ProfileSidebarFile itemType="video" name={'rec.png'} /> */}
      </div>
    </div>
  );
};

export default ProfileSidebar;

const ProfileSidebarTeam: FC = () => {
  return (
    <div className={styles.profileSidebarItem}>
      <AppSvg path="profile/development-icon.svg" size="22px" />
      <span>Development</span>
    </div>
  );
};

interface IProfileSidebarFile {
  itemType: 'image' | 'video';
  name: string;
}

const ProfileSidebarFile: FC<IProfileSidebarFile> = ({
  itemType = 'image',
  name,
}) => {
  let icon = <AppSvg path="profile/recent-files-image.svg" size="18px" />;

  if (itemType === 'video') {
    icon = <AppSvg path="profile/recent-files-video.svg" size="18px" />;
  }

  return (
    <div className={styles.profileSidebarItem}>
      {icon}
      <span>{name}</span>
    </div>
  );
};
