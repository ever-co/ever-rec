import { IWorkspace } from '@/app/interfaces/IWorkspace';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { Modal } from 'antd';
import classNames from 'classnames';
import { useState } from 'react';
//@ts-ignore
import * as styles from './MoveToWorkspaceModal.module.scss';

interface Props {
  visible: boolean;
  onSuccess: (workspace: IWorkspace) => void;
  onCancel: () => void;
  workspaces: IWorkspace[];
}
const MoveToWorkspaceModal: React.FC<Props> = ({
  visible,
  onSuccess,
  onCancel,
  workspaces,
}) => {
  const [selectedWorkspace, setSelectedWorkspace] = useState<IWorkspace | null>(
    null,
  );

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      closeIcon={
        <AppSvg
          path="/images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={() => {
              setSelectedWorkspace(null);
              selectedWorkspace && onSuccess(selectedWorkspace);
            }}
            className="tw-pb-1 tw-pt-1"
            twPadding="tw-px-8"
            disabled={!selectedWorkspace}
          >
            Add
          </AppButton>
          <AppButton
            onClick={() => {
              setSelectedWorkspace(null);
              onCancel();
            }}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-mx-4 tw-pb-1 tw-pt-1"
            twPadding="tw-px-8"
          >
            Cancel
          </AppButton>
        </div>
      }
    >
      {workspaces.map((x) => {
        return (
          <div
            className={classNames(
              styles.workspaceItem,
              selectedWorkspace?.id === x.id && styles.active,
            )}
            onClick={() => {
              setSelectedWorkspace(x);
            }}
            key={x.id}
          >
            {x.name}
          </div>
        );
      })}
    </Modal>
  );
};

export default MoveToWorkspaceModal;
