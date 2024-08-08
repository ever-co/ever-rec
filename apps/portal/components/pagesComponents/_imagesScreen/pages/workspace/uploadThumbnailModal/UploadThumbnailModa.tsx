import { Modal } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import classNames from 'classnames';
import styles from './UploadThumbnailModal.module.scss';
import AppButton from 'components/controls/AppButton';

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
  return (
    <Modal
      visible={visible}
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
            Drag & drop images here or
          </p>
          <div className={styles.buttonWrapper}>
            <AppButton
              onClick={onOk}
              className="tw-text-white tw-pb-3 tw-pt-3"
              twPadding="tw-px-14"
              full={true}
            >
              Browse file
            </AppButton>
          </div>
          <div className={styles.descWrapper}>
            <p className={styles.desc}>
              Upload a thumbnail to your workspace. Supports JPG or PNG format
              only.
            </p>
          </div>
        </div>
      }
    ></Modal>
  );
};

export default UploadThumbnailModal;
