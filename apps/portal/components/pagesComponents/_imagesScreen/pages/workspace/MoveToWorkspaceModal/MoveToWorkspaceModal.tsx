import AppButton from '../../../../../controls/AppButton';
import React, { useState } from 'react';
import { Modal } from 'antd';
import { X } from 'lucide-react';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import styles from './MoveToWorkspaceModal.module.scss';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      closeIcon={
        <span className="tw-flex tw-size-full tw-items-center tw-justify-center">
          <X className="tw-size-4" aria-hidden="true" />
        </span>
      }
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton
            onClick={() => {
              setSelectedWorkspace(null);
              selectedWorkspace && onSuccess(selectedWorkspace);
            }}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
            disabled={!selectedWorkspace}
          >
            {t('common.add')}
          </AppButton>
          <AppButton
            onClick={() => {
              setSelectedWorkspace(null);
              onCancel();
            }}
            outlined
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            {t('common.cancel')}
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
