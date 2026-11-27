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
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton onClick={onClose} bgColor="tw-bg-app-grey-darker" outlined>
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            bgColor={type === 'item' ? 'tw-bg-danger' : undefined}
            twTextColor={
              type === 'item' ? 'tw-text-destructive-foreground' : undefined
            }
          >
            {t('common.delete')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-2 tw-text-base tw-font-semibold">
        <Trans values={{ type: type }} count={2} i18nKey="modals.deleteType" />
      </h2>
      <p className="tw-mb-0 tw-text-sm tw-text-muted-foreground">{paragraph}</p>
    </Modal>
  );
};

export default DeleteMultiItemsModal;
