import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSvg from '../elements/AppSvg';

interface IDisconnectServiceModalProps {
  onOk: () => void;
  onCancel: () => void;
  loading: boolean;
  title: string;
  subTitle: string;
}

const DisconnectServiceModal: React.FC<IDisconnectServiceModalProps> = ({
  onOk,
  onCancel,
  loading,
  title,
  subTitle,
}) => {
  const onOkHandler = () => {
    onOk();
  };

  return (
    <Modal
      open={true}
      onCancel={onCancel}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-8">
          <AppButton onClick={onOkHandler} disabled={loading} full={true}>
            Yes, disconnect
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-4 tw-text-xl tw-font-bold">{title}</h2>
      {subTitle}
    </Modal>
  );
};

export default DisconnectServiceModal;
