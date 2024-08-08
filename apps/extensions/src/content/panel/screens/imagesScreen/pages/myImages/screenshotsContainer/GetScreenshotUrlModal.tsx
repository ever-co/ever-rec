import React from 'react';
import { Modal } from 'antd';


interface IGetScreenshotUrlModalProps {
  visible: boolean,
  onClose: () => void,
  url: string,
}

const GetScreenshotUrlModal: React.FC<IGetScreenshotUrlModalProps> = ({ onClose, visible, url }) => {  

  const onOkHandler = async ():Promise<void> => {
    await navigator.clipboard.writeText(url);
  }

  return (
    <Modal 
    title="Screenshot URL" 
    visible={visible} 
    onCancel={onClose}
    onOk={onOkHandler}
    okText="Copy"
    cancelText="Close"
    >
      {url}
    </Modal>
  );
        
}

export default GetScreenshotUrlModal;