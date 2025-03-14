import classNames from 'classnames';
import { Modal } from 'antd';
import AppSvg from '../../elements/AppSvg';
import AppButton from '../../controls/AppButton';
import { LeaveDeleteActions } from '../../../pages/media/workspaces/manage';

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
            Confirm
          </AppButton>
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-white"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">
        Are you sure you want to {action === 'leave' ? 'leave' : 'delete'} this
        workspace?
      </h2>
      <p>This action cannot be undone.</p>
    </Modal>
  );
};

export default LeaveWorkspaceModal;
