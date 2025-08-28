import React from 'react';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

interface IGetScreenshotUrlModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
}

const GetScreenshotUrlModal: React.FC<IGetScreenshotUrlModalProps> = ({
  onClose,
  visible,
  url,
}) => {
  const { t } = useTranslation();
  const onOkHandler = async (): Promise<void> => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <Modal
      title={t('modals.screenShotUrl')}
      open={visible}
      onCancel={onClose}
      onOk={onOkHandler}
      okText={t('page.image.copy')}
      cancelText={t('common.close')}
    >
      {url}
    </Modal>
  );
};

export default GetScreenshotUrlModal;
