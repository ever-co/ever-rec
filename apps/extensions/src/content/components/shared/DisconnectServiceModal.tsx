import React from 'react';
import { Modal } from 'antd';
import AppButton from '../controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const onOkHandler = () => {
    onOk();
  };

  return (
    <Modal
      open={true}
      onCancel={onCancel}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-8">
          <AppButton onClick={onOkHandler} disabled={loading} full={true}>
            {t('modals.disconnect')}
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
