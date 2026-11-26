import React from 'react';
import { Modal } from 'antd';
import { ItemType } from 'app/interfaces/ItemType';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

interface IDeleteItemModalProps {
  visible: boolean;
  item: any | null;
  itemType: ItemType;
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
  const { t } = useTranslation();
  const onOkHandler = () => {
    onOk(item, itemType);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      closable={true}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton
            onClick={onCancel}
            outlined
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
            bgColor="tw-bg-danger"
          >
            {t('modals.deleteItem')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-0 tw-text-base tw-font-semibold">
        {t('modals.deleteItemConfirmation')}
      </h2>
    </Modal>
  );
};

export default DeleteItemModal;
