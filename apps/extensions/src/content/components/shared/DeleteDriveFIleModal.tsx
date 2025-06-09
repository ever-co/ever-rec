import React from 'react';
import { Modal } from 'antd';
import classNames from 'classnames';
import AppSvg from '../elements/AppSvg';
import AppButton from '../controls/appButton/AppButton';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onOk: (commentId: string) => void;
  onCancel: () => void;
}

const DeleteDriveFileModal: React.FC<Props> = ({ onOk, onCancel, visible }) => {
  const { t } = useTranslation();
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      closable={true}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className={classNames('tw-flex tw-justify-end tw-mt-14')}>
          <AppButton
            onClick={onOk}
            bgColor="tw-bg-danger"
            className="tw-px-8 tw-pb-1 tw-pt-1 tw-border tw-border-danger tw-border-solid tw-text-white"
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
        {t('modals.deleteGoogleFile')}
      </h2>
    </Modal>
  );
};

export default DeleteDriveFileModal;
