import { FC } from 'react';
import styles from './FolderItem.module.scss';

interface IFolderInfoProps {
  itemsNumber: string | false;
  updatedAgo: string | false;
}


const FolderInfo: FC<IFolderInfoProps> = ({
  itemsNumber,
  updatedAgo,
}) => {
  return (
    <div className={styles.folderInfo}>
      {itemsNumber && (
        <div className={styles.infoWrapper}>
          <div className={styles.lowerText}>{itemsNumber}</div>
          <div className={styles.lowerText}>{updatedAgo}</div>
        </div>
      )}
    </div>
  );
};

export default FolderInfo;
