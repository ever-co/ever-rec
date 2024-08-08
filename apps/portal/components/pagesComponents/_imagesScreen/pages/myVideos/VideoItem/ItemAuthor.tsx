import { FC } from 'react';
import styles from './ItemAuthor.module.scss';

interface IItemAuthorProps {
  name: string;
  photoURL: string;
  created: string;
}

const ItemAuthor: FC<IItemAuthorProps> = ({ name, photoURL, created }) => {
  const path = photoURL || '/sign/default-profile.svg';
  const displayName = name || 'User';

  return (
    <div className={styles.itemAuthorContainer}>
      <div className={styles.author}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={path} alt="" />
        <span className={styles.authorName}>{displayName}</span>
      </div>

      <div className={styles.date}>{created}</div>
    </div>
  );
};

export default ItemAuthor;
