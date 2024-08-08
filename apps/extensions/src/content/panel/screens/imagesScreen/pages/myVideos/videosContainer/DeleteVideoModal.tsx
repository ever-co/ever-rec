import React from 'react';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
import IEditorVideo from '@/app/interfaces/IEditorVideo';


interface IDeleteVideoModalProps {
  visible: boolean;
  onOk: (video: IEditorVideo | null) => void;
  onCancel: () => void;
  video: IEditorVideo | null;
}

const DeleteVideoModal: React.FC<IDeleteVideoModalProps> = ({
  onOk,
  onCancel,
  visible,
  video,
}) => {
  const onOkHandler = () => {
    onOk(video);
  };

  return (
    <Modal
      visible={visible}
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
          <AppButton
            onClick={onOkHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            // disabled={!valid}
          >
            Delete Video
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        Do you want to delete this video?
      </h2>
    </Modal>
  );
};

export default DeleteVideoModal;
