import React, { DragEvent } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSvg from '../elements/AppSvg';

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
          <p className="tw-mt-6 tw-mb-4">Drag & drop images here or</p>
          <AppButton
            onClick={onOk}
            className="tw-text-white tw-pb-2 tw-pt-2"
            twPadding="tw-px-14"
          >
            Browse file
          </AppButton>
          <p className="tw-mt-4">Supports .jpeg, .jpg, .png</p>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">Upload Images</h2>
    </Modal>
  );
};

export default UploadImageModal;
