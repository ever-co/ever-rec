import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import { useTranslation } from 'react-i18next';

interface ITrashModalProps {
  visible: boolean;
  title: string;
  confirmText?: string;
  confirmClass?: string;
  onOk: () => void;
  onCancel: () => void;
}

const TrashModal: React.FC<ITrashModalProps> = ({
  visible,
  title,
  confirmText = 'Confirm',
  confirmClass = null,
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();
  const textConfirm =
    confirmText == 'Confirm' ? t('common.confirm') : confirmText;
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton onClick={onCancel} outlined>
            {t('page.image.cancel')}
          </AppButton>
          {/* A class AppButton knows as a look ("tw-bg-red") makes the button destructive,
              with the right text and hover; any other class is the caller's own ground. */}
          <AppButton onClick={onOk} bgColor={confirmClass || undefined}>
            {textConfirm}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-pr-6 tw-text-base tw-font-semibold tw-text-foreground">
        {title}
      </h2>
    </Modal>
  );
};

export default TrashModal;
