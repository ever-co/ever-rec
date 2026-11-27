import React, { DragEvent } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSvg from '../elements/AppSvg';
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
      footer={
        <div
          onDrop={onDrop}
          onDragOver={enableDropping}
          className="tw-flex tw-flex-col tw-items-center tw-mt-4 tw-px-4 tw-pt-8 tw-pb-6 tw-border tw-border-input tw-border-dashed tw-rounded-lg tw-text-center"
        >
          <AppSvg
            path="/common/images-icon.svg"
            className="tw-text-muted-foreground [&_path]:tw-fill-current"
          />
          <p className="tw-mt-4 tw-mb-4 tw-text-sm tw-text-foreground">
            {t('workspace.dragAndDropImagesHereOr')}
          </p>
          <AppButton
            onClick={onOk}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            {t('workspace.browseFile')}
          </AppButton>
          <p className="tw-mt-4 tw-mb-0 tw-text-xs tw-text-muted-foreground">
            {t('page.image.uploadDescription')}
          </p>
        </div>
      }
    >
      <h2 className="tw-mb-0 tw-pr-6 tw-text-base tw-font-semibold">
        {t('page.image.uploadImages')}
      </h2>
    </Modal>
  );
};

export default UploadImageModal;
