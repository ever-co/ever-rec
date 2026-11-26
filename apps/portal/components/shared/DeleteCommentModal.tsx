import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSvg from '../elements/AppSvg';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

interface IDeleteScreenshotModalProps {
  visible: boolean;
  onOk: (commentId: string) => void;
  onCancel: () => void;
  commentId: string;
}

const DeleteCommentModal: React.FC<IDeleteScreenshotModalProps> = ({
  onOk,
  onCancel,
  visible,
  commentId,
}) => {
  const { t } = useTranslation();
  const onOkHandler = () => {
    onOk(commentId);
  };

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
            onClick={onOkHandler}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
            bgColor="tw-bg-danger"
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
        {t('modals.deleteComment')}
      </h2>
    </Modal>
  );
};

export default DeleteCommentModal;
