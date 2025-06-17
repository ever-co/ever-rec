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
        <div className="tw-flex tw-justify-end tw-mt-8">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1 tw-border"
            bgColor="tw-bg-danger"
            twTextColor="tw-text-white"
          >
            {t('modals.deleteItem')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-text-2xl tw-font-semibold">
        {t('modals.deleteItemConfirmation')}
      </h2>
    </Modal>
  );
};

export default DeleteItemModal;
