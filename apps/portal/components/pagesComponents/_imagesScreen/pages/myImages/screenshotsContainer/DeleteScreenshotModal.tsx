import React from 'react';
import { Modal } from 'antd';
import IEditorImage from 'app/interfaces/IEditorImage';
import AppButton from 'components/controls/AppButton';
import { useTranslation } from 'react-i18next';

interface IDeleteScreenshotModalProps {
  visible: boolean;
  onOk: (screenshot: IEditorImage | null) => void;
  onCancel: () => void;
  screenshot: IEditorImage | null;
}

const DeleteScreenshotModal: React.FC<IDeleteScreenshotModalProps> = ({
  onOk,
  onCancel,
  visible,
  screenshot,
}) => {
  const { t } = useTranslation();
  const onOkHandler = () => {
    onOk(screenshot);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton onClick={onCancel} outlined>
            {t('common.cancel')}
          </AppButton>
          <AppButton onClick={onOkHandler}>
            {t('modals.deleteScreenshotSingle')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-pr-6 tw-text-base tw-font-semibold tw-text-foreground">
        {t('modals.deleteScreenshot')}
      </h2>
    </Modal>
  );
};

export default DeleteScreenshotModal;
