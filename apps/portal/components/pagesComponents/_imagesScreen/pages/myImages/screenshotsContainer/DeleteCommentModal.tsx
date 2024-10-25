import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';

interface IDeleteScreenshotModalProps {
  visible: boolean;
  onOk: (commentId: string) => void;
  onCancel: () => void;
  commentId: string;
}

const DeleteCommentModal: React.FC<IDeleteScreenshotModalProps> = ({
  onOk,
  onCancel,
  visible,
  commentId,
}) => {
  const onOkHandler = () => {
    onOk(commentId);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onOkHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1 tw-text-danger tw-border tw-border-danger tw-border-solid"
            bgColor="tw-bg-white"
            // disabled={!valid}
          >
            Delete
          </AppButton>
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-white"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">
        Are you sure you want to delete this comment?
      </h2>
    </Modal>
  );
};

export default DeleteCommentModal;
