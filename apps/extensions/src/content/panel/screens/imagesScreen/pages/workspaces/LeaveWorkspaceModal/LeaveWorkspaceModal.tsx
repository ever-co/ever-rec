import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { Modal } from 'antd';
import classNames from 'classnames';
import { LeaveDeleteActions } from '../WorkspacesManageScreen';

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
  return (
    <Modal
      visible={visible}
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
    </Modal>
  );
};

export default LeaveDeleteWorkspaceModal;
