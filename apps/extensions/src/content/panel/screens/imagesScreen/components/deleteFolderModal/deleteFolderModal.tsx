import React from 'react';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';

interface IDeleteScreenshotModalProps {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
}

const DeleteFolderModal: React.FC<IDeleteScreenshotModalProps> = ({
  onOk,
  onCancel,
  visible,
}) => {
  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
          <AppButton onClick={onOk} className="tw-px-8 tw-pb-1 tw-pt-1">
            Delete Folder
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        Do you want to delete this folder?
      </h2>
    </Modal>
  );
};

export default DeleteFolderModal;
