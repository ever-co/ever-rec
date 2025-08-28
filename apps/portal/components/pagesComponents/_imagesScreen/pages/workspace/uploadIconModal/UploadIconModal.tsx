import React, { DragEvent } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import styles from './UploadIconModal.module.scss';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  enableDropping: (e: DragEvent<HTMLDivElement>) => void;
}

const UploadIconModal: React.FC<Props> = ({
  visible,
  onOk,
  onCancel,
  onDrop,
  enableDropping,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      open={visible}
      closable={true}
      onCancel={onCancel}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div
          onDrop={onDrop}
          onDragOver={enableDropping}
          className="tw-flex tw-flex-col tw-items-center tw-mt-4 tw-pt-10 tw-pb-4 tw-border tw-border-mid-grey tw-border-dashed tw-rounded-md"
        >
          <AppSvg path="/common/images-icon.svg" />
          <p className={classNames(styles.heading, 'tw-mt-6 tw-mb-4')}>
            {t('page.image.dragDropImagesHereOr')}{' '}
          </p>
          <div className={styles.buttonWrapper}>
            <AppButton
              onClick={onOk}
              className="tw-text-white tw-pb-3 tw-pt-3"
              twPadding="tw-px-14"
              full={true}
            >
              {t('workspace.browseFile')}{' '}
            </AppButton>
          </div>
          <div className={styles.descWrapper}>
            <p className={styles.desc}>
              {t('page.image.uploadThumbnailDescription')}{' '}
            </p>
            <p className={styles.desc}>{t('page.image.maxFileSize')}</p>
          </div>
        </div>
      }
    ></Modal>
  );
};

export default UploadIconModal;
