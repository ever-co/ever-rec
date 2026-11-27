import { ChangeEvent, useEffect, useState } from 'react';
import { Modal } from 'antd';
import { X } from 'lucide-react';
import AppButton from '../../controls/AppButton';
import { useTranslation } from 'react-i18next';

interface IProps {
  visible: boolean;
  workspaceName: string;
  onOk: (name: string) => void;
  onCancel: () => void;
}

const RenameWorkspaceModal: React.FC<IProps> = ({
  visible,
  workspaceName,
  onOk,
  onCancel,
}) => {
  const [newName, setNewName] = useState('');

  const { t } = useTranslation();
  useEffect(() => {
    setNewName(workspaceName);
  }, [workspaceName]);

  const changeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      destroyOnClose={true}
      closable={true}
      closeIcon={
        <span className="tw-flex tw-size-full tw-items-center tw-justify-center">
          <X className="tw-size-4" aria-hidden="true" />
        </span>
      }
      footer={
        <div className="tw-mt-6 tw-flex tw-justify-end">
          <AppButton
            onClick={() => onOk(newName)}
            twPadding="tw-px-4 tw-py-[7px]"
          >
            {t('workspace.confirm')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-m-0 tw-mb-2 tw-pr-6 tw-text-base tw-font-semibold tw-text-foreground">
        {t('workspace.renameWorkspace')}
      </h2>
      <p className="tw-m-0 tw-text-sm tw-text-muted-foreground">
        {t('workspace.nameYourWorkspaceDescription')}
      </p>
      <input
        value={newName}
        type="text"
        placeholder={t('workspace.enterAWorkspaceName')}
        className="tw-mt-4 tw-h-9 tw-w-full tw-rounded-md tw-border tw-border-solid tw-border-input tw-bg-transparent tw-px-3 tw-text-sm tw-text-foreground tw-outline-none tw-transition-[border-color,box-shadow] tw-duration-150 placeholder:tw-text-muted-foreground focus:tw-border-ring focus:tw-ring-2 focus:tw-ring-ring/20"
        onChange={changeHandler}
      />
    </Modal>
  );
};

export default RenameWorkspaceModal;
