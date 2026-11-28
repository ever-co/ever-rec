import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
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
      footer={
        <div className="tw-flex tw-justify-end tw-mt-6">
          <AppButton
            onClick={onOkHandler}
            disabled={loading}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            {t('modals.disconnect')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-2 tw-pe-6 tw-text-base tw-font-semibold">{title}</h2>
      {subTitle}
    </Modal>
  );
};

export default DisconnectServiceModal;
