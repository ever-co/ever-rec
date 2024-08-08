import React from 'react';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { MixedItemType } from '@/app/interfaces/ItemTypes';

interface IDelteMultiItemsModalProps {
  visible: boolean;
  onClose: () => void;
  onOkHandler: () => void;
  type: MixedItemType | 'item';
}

const DeleteMultiItemsModal: React.FC<IDelteMultiItemsModalProps> = ({
  onClose,
  onOkHandler,
  visible,
  type,
}) => {
  let paragraph =
    'Are you sure you want to move these files to the Trash folder?';

  if (type === 'item') {
    paragraph = 'Are you sure you want to delete these files permanently?';
  }

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-4">
          <AppButton
            onClick={onClose}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            bgColor={type === 'item' ? 'tw-bg-danger' : undefined}
            twTextColor={type === 'item' ? 'tw-text-white' : undefined}
          >
            Delete
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">Delete {type}s</h2>
      <p>{paragraph}</p>
    </Modal>
  );
};

export default DeleteMultiItemsModal;
