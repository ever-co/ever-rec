import React from 'react';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { Modal } from 'antd';
import { ItemType } from '@/app/interfaces/ItemTypes';
import AppSvg from '@/content/components/elements/AppSvg';

interface IDeleteItemModalProps {
  visible: boolean;
  item: any | null;
  itemType: ItemType | null;
  onOk: (item: any | null, itemType: ItemType | null) => void;
  onCancel: () => void;
}

const DeleteItemModal: React.FC<IDeleteItemModalProps> = ({
  visible,
  item,
  itemType,
  onOk,
  onCancel,
}) => {
  const onOkHandler = () => {
    onOk(item, itemType);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-8">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-mx-4 tw-pb-1 tw-pt-1"
            twPadding="tw-px-8"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-pb-1 tw-pt-1 tw-border"
            bgColor="tw-bg-danger"
            twTextColor="tw-text-white"
            twPadding="tw-px-8"
          >
            Delete item
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-text-2xl tw-font-semibold">
        Do you want to delete this item?
      </h2>
    </Modal>
  );
};

export default DeleteItemModal;
