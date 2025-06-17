import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { Modal } from 'antd';
import classNames from 'classnames';
//@ts-ignore
import * as styles from './UploadIconModal.module.scss';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  enableDropping: (e: React.DragEvent<HTMLDivElement>) => void;
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
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div
          onDrop={onDrop}
          onDragOver={enableDropping}
          className="tw-flex tw-flex-col tw-items-center tw-mt-4 tw-pt-10 tw-pb-4 tw-border tw-border-mid-grey tw-border-dashed tw-rounded-md"
        >
          <AppSvg path="images/panel/common/images-icon.svg" />
          <p className={classNames(styles.heading, 'tw-mt-6 tw-mb-4')}>
            {t('page.image.dragDropImagesHereOr')}
          </p>
          <div className={styles.buttonWrapper}>
            <AppButton
              onClick={onOk}
              className="tw-text-white tw-pb-3 tw-pt-3"
              twPadding="tw-px-14"
              full={true}
            >
              {t('workspace.browseFile')}
            </AppButton>
          </div>
          <div className={styles.descWrapper}>
            <p className={styles.desc}>
              {t('page.image.uploadThumbnailDescription')}
            </p>
            <p className={styles.desc}>{t('page.image.maxFileSize')}</p>
          </div>
        </div>
      }
    ></Modal>
  );
};

export default UploadIconModal;
