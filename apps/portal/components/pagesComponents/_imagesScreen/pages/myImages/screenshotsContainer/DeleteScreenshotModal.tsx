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
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton onClick={onOkHandler} className="tw-px-8 tw-pb-1 tw-pt-1">
            {t('modals.deleteScreenshotSingle')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        {t('modals.deleteScreenshot')}
      </h2>
    </Modal>
  );
};

export default DeleteScreenshotModal;
