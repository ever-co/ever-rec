import classNames from 'classnames';
import { Modal } from 'antd';
import { X } from 'lucide-react';
import AppButton from '../../controls/AppButton';
import { LeaveDeleteActions } from '../../../pages/media/workspaces/manage';
import { Trans, useTranslation } from 'react-i18next';

interface IProps {
  visible: boolean;
  action: LeaveDeleteActions;
  onOk: (commentId: string) => void;
  onCancel: () => void;
}

const LeaveWorkspaceModal: React.FC<IProps> = ({
  visible,
  action,
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      closable={true}
      closeIcon={
        <span className="tw-flex tw-size-full tw-items-center tw-justify-center">
          <X className="tw-size-4" aria-hidden="true" />
        </span>
      }
      // The markup is [confirm] [cancel]; the row is reversed so the action sits on the right
      // and the cancel to its left, as in the other dialogs.
      footer={
        <div className={classNames('tw-mt-6 tw-flex tw-justify-end tw-gap-2')}>
          <AppButton
            onClick={onCancel}
            outlined
            twPadding="tw-px-4 tw-py-[7px]"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={onOk}
            twPadding="tw-px-4 tw-py-[7px]"
            bgColor="tw-bg-danger"
          >
            {t('common.confirm')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-m-0 tw-mb-2 tw-pr-6 tw-text-base tw-font-semibold tw-text-foreground">
        <Trans
          values={{
            action: action === 'leave' ? t('common.leave') : t('common.delete'),
          }}
          i18nKey="modals.confirmModalDelete"
        />
      </h2>
      <p className="tw-m-0 tw-text-sm tw-text-muted-foreground">
        {t('modals.lastWarning')}
      </p>
    </Modal>
  );
};

export default LeaveWorkspaceModal;
