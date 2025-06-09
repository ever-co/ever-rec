import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { Modal } from 'antd';
import classNames from 'classnames';
import { LeaveDeleteActions } from '../WorkspacesManageScreen';
import { Trans, useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onOk: (commentId: string) => void;
  action?: LeaveDeleteActions;
}
const LeaveDeleteWorkspaceModal: React.FC<Props> = ({
  onOk,
  onCancel,
  visible,
  action,
}) => {
  const {t} = useTranslation()
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
            className="tw-px-8 tw-text-white tw-pb-1 tw-pt-1 tw-border tw-border-danger tw-border-solid"
            bgColor="tw-bg-danger"
          >
           {t('common.confirm')}
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
       <Trans
          values={{
            action: action === 'leave' ? t('common.leave') : t('common.delete'),
          }}
          i18nKey="modals.confirmModalDelete"
        />
      </h2>
    </Modal>
  );
};

export default LeaveDeleteWorkspaceModal;
