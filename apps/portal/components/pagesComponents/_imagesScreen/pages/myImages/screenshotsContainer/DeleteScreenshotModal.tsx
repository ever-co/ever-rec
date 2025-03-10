import React from 'react';
import { Modal } from 'antd';
import IEditorImage from 'app/interfaces/IEditorImage';
import AppButton from 'components/controls/AppButton';

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
            Cancel
          </AppButton>
          <AppButton onClick={onOkHandler} className="tw-px-8 tw-pb-1 tw-pt-1">
            Delete Screenshot
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        Do you want to delete this screenshot?
      </h2>
    </Modal>
  );
};

export default DeleteScreenshotModal;
