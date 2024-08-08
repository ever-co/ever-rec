import { FC } from 'react';
import styles from './ProfileAccountPhoto.module.scss';
import AppSvg from '@/content/components/elements/AppSvg';

interface IProps {
  photoURL?: string;
  avatarSize: number;
  clicked: () => void;
}

const ProfileAccountPhoto: FC<IProps> = ({ photoURL, avatarSize, clicked }) => {
  if (!photoURL) {
    return (
      <div onClick={clicked}>
        <AppSvg
          path="images/panel/sign/default-profile.svg"
          size={avatarSize + 'px'}
          className={styles.profileUserPhoto}
        />
      </div>
    );
  }

  return (
    <div
      className={styles.profileUserPhoto}
      style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
      onClick={clicked}
    >
      <img src={photoURL} alt="" />
    </div>
  );
};

export default ProfileAccountPhoto;
