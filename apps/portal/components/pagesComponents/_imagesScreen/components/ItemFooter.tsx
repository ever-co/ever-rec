import { FC } from 'react';
import AppSvg from 'components/elements/AppSvg';
import styles from './ItemFooter.module.scss';

type Like = {
  uid: string;
  timestamp: number;
};

interface IItemFooterProps {
  views: number;
  likes: Like[];
  comments: number;
}

const ItemFooter: FC<IItemFooterProps> = ({ views, likes, comments }) => {
  return (
    <div className={styles.container}>
      <div className={styles.iconGroup}>
        <div className={styles.iconPair}>
          <AppSvg
            path="/item/comments-v3.svg"
            size="14px"
            className={styles.icon}
          />
          <span className={styles.label}>{comments}</span>
        </div>

        <div className={styles.iconPair}>
          <AppSvg path="/item/likes.svg" size="16px" className={styles.icon} />
          <span className={styles.label}>{likes.length}</span>
        </div>

        <div className={styles.iconPair}>
          <AppSvg path="/item/views.svg" size="16px" className={styles.icon} />
          <span className={styles.label}>{views}</span>
        </div>
      </div>
    </div>
  );
};

export default ItemFooter;
