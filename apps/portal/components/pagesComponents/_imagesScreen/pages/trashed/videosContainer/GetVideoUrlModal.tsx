import React from 'react';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const onOkHandler = async (): Promise<void> => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <Modal
      title={t('modals.videoUrl')}
      open={visible}
      onCancel={onClose}
      onOk={onOkHandler}
      okText={t('page.image.copy')}
      cancelText={t('common.cancel')}
    >
      {url}
    </Modal>
  );
};

export default GetVideoUrlModal;
