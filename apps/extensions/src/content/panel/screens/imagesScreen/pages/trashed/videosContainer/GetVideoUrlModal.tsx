import React from 'react';
import { Modal } from 'antd';

interface IGetVideoUrlModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
}

const GetVideoUrlModal: React.FC<IGetVideoUrlModalProps> = ({
  onClose,
  visible,
  url,
}) => {
  const onOkHandler = async (): Promise<void> => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <Modal
      title="Video URL"
      open={visible}
      onCancel={onClose}
      onOk={onOkHandler}
      okText="Copy"
      cancelText="Close"
    >
      {url}
    </Modal>
  );
};

export default GetVideoUrlModal;
