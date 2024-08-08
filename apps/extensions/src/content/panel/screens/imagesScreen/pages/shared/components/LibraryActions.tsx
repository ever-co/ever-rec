import { FC } from 'react';
import styles from './LibraryActions.module.scss';
import classNames from 'classnames';
import AppButton2 from '@/content/components/controls/AppButton2/AppButton2';
import AppSvg from '@/content/components/elements/AppSvg';

const LibraryActions: FC<any> = ({
  showAddFolderButton = true,
  openModalHandler,
  addImage,
  addVideo,
  clickAddImageHandler,
  clickAddVideoHandler,
}) => {
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
            <span>New folder</span>
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
            <span>New image file</span>
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
            <span>New video file</span>
          </div>

          <AppSvg path="images/new-design-v2/plus.svg" />
        </AppButton2>
      )}
    </div>
  );
};

export default LibraryActions;
