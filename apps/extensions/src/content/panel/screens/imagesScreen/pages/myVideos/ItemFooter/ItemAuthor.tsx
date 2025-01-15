import { FC } from 'react';
import * as styles from './ItemAuthor.module.scss';

interface IItemAuthorProps {
  name: string | null;
  photoURL: string | null;
  created: string;
}

const ItemAuthor: FC<IItemAuthorProps> = ({ name, photoURL, created }) => {
  const path = photoURL || '/images/panel/sign/default-profile.svg';
  const displayName = name || 'User';

  return (
    <div className={styles.itemAuthorContainer}>
      <div className={styles.author}>
        <img src={path} alt="" />
        <span className={styles.authorName}>{displayName}</span>
      </div>

      <div className={styles.date}>{created}</div>
    </div>
  );
};

export default ItemAuthor;
