import classNames from 'classnames';
import { Modal } from 'antd';
import AppSvg from '../../elements/AppSvg';
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
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className={classNames('tw-flex tw-justify-end tw-mt-8')}>
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
          values={{ action: action === 'leave' ? 'leave' : 'delete' }}
          i18nKey="modals.confirmModalDelete"
        />
      </h2>
      <p>{t('modals.lastWarning')}</p>
    </Modal>
  );
};

export default LeaveWorkspaceModal;
