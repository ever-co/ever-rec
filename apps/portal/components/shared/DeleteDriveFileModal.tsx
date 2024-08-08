import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';

interface Props {
  visible: boolean;
  onOk: (commentId: string) => void;
  onCancel: () => void;
}

const DeleteDriveFileModal: React.FC<Props> = ({ onOk, onCancel, visible }) => {
  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      closable={true}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onOk}
            className="tw-px-8 tw-pb-1 tw-pt-1 tw-text-danger tw-border tw-border-danger tw-border-solid"
            // disabled={!valid}
          >
            Delete
          </AppButton>
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-white"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">
        Are you sure you want to delete this file from Google Drive?
      </h2>
    </Modal>
  );
};

export default DeleteDriveFileModal;
