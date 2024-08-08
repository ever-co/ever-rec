import { FC } from 'react';
import styles from './ItemTitleAuthor.module.scss';

interface IItemTitleAuthorProps {
  title: string;
  photoURL: string;
  displayName: string;
  date: string;
}

const ItemTitleAuthor: FC<IItemTitleAuthorProps> = ({
  title,
  photoURL,
  displayName,
  date,
}) => {
  return (
    <div className={styles.itemAuthor}>
      <h3>{title || 'Title'}</h3>

      <div className={styles.itemAuthorDetails}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoURL || '/sign/default-profile.svg'} alt="" />
        <span>{displayName || 'User'}</span>
        {date && (
          <>
            <span className={styles.dotSeparator}>●</span>
            <span>{date}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ItemTitleAuthor;
