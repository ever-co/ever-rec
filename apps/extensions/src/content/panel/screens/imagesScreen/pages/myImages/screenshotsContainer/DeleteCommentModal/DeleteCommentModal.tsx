import React from 'react';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
//@ts-ignore
import * as styles from './DeleteCommentModal.module.scss';
import AppSvg from '@/content/components/elements/AppSvg';
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
      wrapClassName={styles.wrapper}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className={styles.closeIcon}
        />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onOkHandler}
            className={classNames(
              styles.deleteButton,
              'tw-px-9 tw-pb-1 tw-pt-1 tw-text-white tw-border tw-border-danger tw-border-solid',
            )}
            bgColor="tw-bg-danger"
            // disabled={!valid}
          >
            {t('common.delete')}
          </AppButton>
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-white"
            outlined
            className="tw-px-9 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            {t('common.cancel')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">
        {t('modals.deleteComment')}
      </h2>
    </Modal>
  );
};

export default DeleteCommentModal;
