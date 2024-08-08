import AppSvg from '../../../../../elements/AppSvg';
import AppButton from '../../../../../controls/AppButton';
import React, { useState } from 'react';
import { Modal } from 'antd';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import styles from './MoveToWorkspaceModal.module.scss';
import classNames from 'classnames';

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
      visible={visible}
      onCancel={onCancel}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={() => {
              setSelectedWorkspace(null);
              onSuccess(selectedWorkspace);
            }}
            className="tw-px-8 tw-pb-1 tw-pt-1"
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
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
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
