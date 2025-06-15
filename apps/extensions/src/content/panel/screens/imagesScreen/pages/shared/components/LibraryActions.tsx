import { FC } from 'react';
import * as styles from './LibraryActions.module.scss';
import classNames from 'classnames';
import AppButton2 from '@/content/components/controls/AppButton2/AppButton2';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

const LibraryActions: FC<any> = ({
  showAddFolderButton = true,
  openModalHandler,
  addImage,
  addVideo,
  clickAddImageHandler,
  clickAddVideoHandler,
}) => {
  const { t } = useTranslation();
  return (
    <div className={classNames(styles.libraryActions)}>
      {showAddFolderButton && (
        <AppButton2
          width={250}
          onClick={openModalHandler}
          className={styles.actionButton}
        >
          <div className={styles.buttonInner}>
            <AppSvg
              path="images/new-design-v2/add-new-folder.svg"
              size="16px"
            />
            <span>{t('common.newFolder')}</span>
          </div>

          <AppSvg path="images/new-design-v2/plus.svg" />
        </AppButton2>
      )}

      {addImage && (
        <AppButton2
          width={250}
          onClick={clickAddImageHandler}
          className={styles.actionButton}
        >
          <div className={styles.buttonInner}>
            <AppSvg
              path="images/new-design-v2/add-video-file.svg"
              size="19px"
            />
            <span>{t('common.newImageFile')}</span>
          </div>

          <AppSvg path="images/new-design-v2/plus.svg" />
        </AppButton2>
      )}

      {addVideo && (
        <AppButton2
          width={250}
          onClick={clickAddVideoHandler}
          className={styles.actionButton}
        >
          <div className={styles.buttonInner}>
            <AppSvg
              path="images/new-design-v2/add-video-file.svg"
              size="19px"
            />
            <span>{t('common.newVideoFile')}</span>
          </div>

          <AppSvg path="images/new-design-v2/plus.svg" />
        </AppButton2>
      )}
    </div>
  );
};

export default LibraryActions;
