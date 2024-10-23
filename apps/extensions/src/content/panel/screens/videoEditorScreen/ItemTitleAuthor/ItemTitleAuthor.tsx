import { FC } from 'react';
import * as styles from './ItemTitleAuthor.module.scss';

interface IItemTitleAuthorProps {
  title?: string;
  photoURL?: string | false;
  displayName?: string | false;
  date?: string;
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
        <img
          src={photoURL || '/images/panel/sign/default-profile.svg'}
          alt=""
        />
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
