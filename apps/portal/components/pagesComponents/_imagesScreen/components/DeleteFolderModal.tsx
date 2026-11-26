import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton onClick={onOk}>{t('modals.deleteFolder')}</AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-0 tw-text-base tw-font-semibold">
        {t('modals.deleteFolderQuestion')}
      </h2>
    </Modal>
  );
};

export default DeleteFolderModal;
