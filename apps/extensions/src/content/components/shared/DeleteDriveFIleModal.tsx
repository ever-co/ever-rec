import React from 'react';
import { Modal } from 'antd';
import classNames from 'classnames';
import AppSvg from '../elements/AppSvg';
import AppButton from '../controls/appButton/AppButton';

interface Props {
  visible: boolean;
  onOk: (commentId: string) => void;
  onCancel: () => void;
}

const DeleteDriveFileModal: React.FC<Props> = ({ onOk, onCancel, visible }) => {
  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      closable={true}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className={classNames('tw-flex tw-justify-end tw-mt-14')}>
          <AppButton
            onClick={onOk}
            bgColor="tw-bg-danger"
            className="tw-px-8 tw-pb-1 tw-pt-1 tw-border tw-border-danger tw-border-solid tw-text-white"
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
        Are you sure you want to delete this file from Google Drive?
      </h2>
    </Modal>
  );
};

export default DeleteDriveFileModal;
