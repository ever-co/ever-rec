import { Modal } from 'antd';
import { X } from 'lucide-react';
import AppSvg from 'components/elements/AppSvg';
import classNames from 'classnames';
import styles from './UploadThumbnailModal.module.scss';
import AppButton from 'components/controls/AppButton';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  enableDropping: (e: React.DragEvent<HTMLDivElement>) => void;
}

const UploadThumbnailModal: React.FC<Props> = ({
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
        <span className="tw-flex tw-size-full tw-items-center tw-justify-center">
          <X className="tw-size-4" aria-hidden="true" />
        </span>
      }
      footer={
        <div
          onDrop={onDrop}
          onDragOver={enableDropping}
          className="tw-flex tw-flex-col tw-items-center tw-mt-2 tw-px-4 tw-pt-8 tw-pb-6 tw-border tw-border-input tw-border-dashed tw-rounded-lg tw-text-center"
        >
          <AppSvg
            path="/common/images-icon.svg"
            className="tw-text-muted-foreground [&_path]:tw-fill-current"
          />
          <p className={classNames(styles.heading, 'tw-mt-4 tw-mb-4')}>
            {t('page.image.dragDropImagesHereOr')}{' '}
          </p>
          <div className={styles.buttonWrapper}>
            <AppButton
              onClick={onOk}
              className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
            >
              {t('workspace.browseFile')}
            </AppButton>
          </div>
          <div className={styles.descWrapper}>
            <p className={styles.desc}>
              {t('page.image.uploadThumbnailWorkspace')}
            </p>
          </div>
        </div>
      }
    ></Modal>
  );
};

export default UploadThumbnailModal;
