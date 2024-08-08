import { ChangeEvent, useEffect, useState } from 'react';
import { Modal } from 'antd';
import AppSvg from '../../elements/AppSvg';
import AppButton from '../../controls/AppButton';

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

  useEffect(() => {
    setNewName(workspaceName);
  }, [workspaceName]);

  const changeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value);
  };

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      destroyOnClose={true}
      closable={true}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-8">
          <AppButton
            onClick={() => onOk(newName)}
            className="tw-px-8 tw-text-white tw-pb-1 tw-pt-1"
          >
            Confirm
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">Rename Workspace</h2>
      <p className="tw-pb-0">Name your workspace something that will represent its purpose</p>
      <input
        value={newName}
        type="text"
        placeholder="Enter a workspace name"
        style={{
          marginTop: '20px',
          padding: '10px',
          width: '100%',
          background: 'transparent',
          borderBottom: '1px solid grey',
        }}
        onChange={changeHandler}
      />
    </Modal>
  );
};

export default RenameWorkspaceModal;
