import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import classNames from 'classnames';
import AppSvg from 'components/elements/AppSvg';
import { Trans, useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
            {t('common.delete')}
          </AppButton>
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-white"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            {t('common.cancel')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">
        <Trans values={{ type: type }} i18nKey="modals.deleteFile" />
      </h2>
    </Modal>
  );
};

export default DeleteCloudFileModal;
