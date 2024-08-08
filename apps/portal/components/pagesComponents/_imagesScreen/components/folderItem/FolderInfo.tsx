import styles from './FolderItem.module.scss';

interface FolderInfoProps {
  itemsNumber: string | undefined | false;
  updatedAgo: string;
}

const FolderInfo: React.FC<FolderInfoProps> = ({ itemsNumber, updatedAgo }) => {
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
