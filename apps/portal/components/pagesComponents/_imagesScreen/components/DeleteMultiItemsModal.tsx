import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import { MixedItemType } from 'app/interfaces/ItemType';
import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  let paragraph = t('modals.moveToTrash');

  if (type === 'item') {
    paragraph = t('modals.deletePermanently');
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-6">
          <AppButton
            onClick={onClose}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            bgColor={type === 'item' ? 'tw-bg-danger' : undefined}
            twTextColor={type === 'item' ? 'tw-text-white' : undefined}
          >
            {t('common.delete')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        <Trans values={{ type: type }} count={2} i18nKey="modals.deleteType" />
      </h2>
      <p>{paragraph}</p>
    </Modal>
  );
};

export default DeleteMultiItemsModal;
