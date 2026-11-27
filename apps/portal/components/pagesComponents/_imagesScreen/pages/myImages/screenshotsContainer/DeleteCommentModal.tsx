import React from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
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
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton
            onClick={onOkHandler}
            bgColor="tw-bg-danger"
            // disabled={!valid}
          >
            {t('common.delete')}
          </AppButton>
          <AppButton onClick={onCancel} outlined>
            {t('common.cancel')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-pr-6 tw-text-base tw-font-semibold tw-text-foreground">
        {t('modals.deleteComment')}
      </h2>
    </Modal>
  );
};

export default DeleteCommentModal;
