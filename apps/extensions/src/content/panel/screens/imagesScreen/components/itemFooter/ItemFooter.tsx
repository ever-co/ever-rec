import { FC } from 'react';
import AppSvg from '@/content/components/elements/AppSvg';
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
            path="images/panel/item/comments.svg"
            size="13px"
            className={styles.icon}
          />
          <span className={styles.label}>{comments}</span>
        </div>

        <div className={styles.iconPair}>
          <AppSvg
            path="images/panel/item/likes.svg"
            size="17px"
            className={styles.icon}
          />
          <span className={styles.label}>{likes.length}</span>
        </div>

        <div className={styles.iconPair}>
          <AppSvg
            path="images/panel/item/views.svg"
            size="19px"
            className={styles.icon}
          />
          <span className={styles.label}>{views}</span>
        </div>
      </div>
    </div>
  );
};

export default ItemFooter;

// const ItemFooter: FC<IItemFooterProps> = ({ views, likes, comments }) => {
//   return (
//     <div className={styles.container}>
//       <div className={styles.iconGroup}>
//         <div className={styles.iconPair}>
//           <AppSvg
//             path="images/panel/item/views.svg"
//             size="13px"
//             className={styles.icon}
//           />
//           <span className={styles.label}>{comments}</span>
//         </div>

//         <div className={styles.iconPair}>
//           <AppSvg
//             path="images/panel/item/likes.svg"
//             size="17px"
//             className={styles.icon}
//           />
//           <span className={styles.label}>{likes.length}</span>
//         </div>

//         <div className={styles.iconPair}>
//           <AppSvg
//             path="images/panel/item/comments.svg"
//             size="19px"
//             className={styles.icon}
//           />
//           <span className={styles.label}>{views}</span>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ItemFooter;
