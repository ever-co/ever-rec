import { FC } from 'react';
import styles from './ItemTitleAuthor.module.scss';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <div className={styles.itemAuthor}>
      <h3>{title || t('page.profile.title')}</h3>

      <div className={styles.itemAuthorDetails}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoURL || '/sign/default-profile.svg'} alt="" />
        <span>{displayName || t('common.user')}</span>
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
