import React from 'react';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
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
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton onClick={onOk} className="tw-px-8 tw-pb-1 tw-pt-1">
            {t('modals.deleteFolder')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        {t('modals.deleteFolderQuestion')}
      </h2>
    </Modal>
  );
};

export default DeleteFolderModal;
