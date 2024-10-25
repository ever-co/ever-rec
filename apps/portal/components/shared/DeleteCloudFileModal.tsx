import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import classNames from 'classnames';
import AppSvg from 'components/elements/AppSvg';

interface Props {
  visible: boolean;
  type?: string;
  onOk: (commentId: string) => void;
  onCancel: () => void;
}

const DeleteCloudFileModal: React.FC<Props> = ({
  onOk,
  onCancel,
  visible,
  type = 'Google drive',
}) => {
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      closable={true}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className={classNames('tw-flex tw-justify-end tw-mt-14')}>
          <AppButton
            onClick={onOk}
            className="tw-px-8 tw-pb-1 tw-pt-1 tw-bg-danger tw-border tw-border-danger tw-border-solid"
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
        {`Are you sure you want to delete this file from ${type}?`}
      </h2>
    </Modal>
  );
};

export default DeleteCloudFileModal;
