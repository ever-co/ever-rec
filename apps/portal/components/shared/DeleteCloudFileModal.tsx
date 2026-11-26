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
        // Row reversed: the destructive action sits on the right, the markup order stays.
        <div
          className={classNames(
            'tw-flex tw-flex-row-reverse tw-justify-start tw-gap-2 tw-mt-6',
          )}
        >
          <AppButton
            onClick={onOk}
            bgColor="tw-bg-danger"
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
            // disabled={!valid}
          >
            {t('common.delete')}
          </AppButton>
          <AppButton
            onClick={onCancel}
            outlined
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            {t('common.cancel')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-0 tw-text-base tw-font-semibold">
        <Trans values={{ type: type }} i18nKey="modals.deleteFile" />
      </h2>
    </Modal>
  );
};

export default DeleteCloudFileModal;
