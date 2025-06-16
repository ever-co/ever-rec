import React, { DragEvent } from 'react';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  enableDropping: (e: DragEvent<HTMLDivElement>) => void;
}

const UploadImageModal: React.FC<Props> = ({
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
          onDragOver={enableDropping}
          className="tw-flex tw-flex-col tw-items-center tw-mt-4 tw-pt-10 tw-pb-4 tw-border tw-border-mid-grey tw-border-dashed tw-rounded-md"
          onDrop={onDrop}
        >
          <AppSvg path="images/panel/common/images-icon.svg" />
          <p className="tw-mt-6 tw-mb-4">
            {t('workspace.dragAndDropImagesHereOr')}
          </p>
          <AppButton
            onClick={onOk}
            className="tw-text-white tw-pb-2 tw-pt-2"
            twPadding="tw-px-14"
          >
            {t('workspace.browseFile')}
          </AppButton>
          <p className="tw-mt-4">{t('page.image.uploadDescription')}</p>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">
        {t('page.image.uploadImages')}
      </h2>
    </Modal>
  );
};

export default UploadImageModal;
