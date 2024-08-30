import React from 'react';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
import classNames from 'classnames';

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
            onClick={onOk}
            className={classNames('tw-px-8 tw-pb-1 tw-pt-1', confirmClass)}
          >
            {confirmText}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">{title}</h2>
    </Modal>
  );
};

export default TrashModal;
