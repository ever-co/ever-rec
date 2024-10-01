import { ChangeEvent, useEffect, useState } from 'react';
import classNames from 'classnames';
import { Modal } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';

interface IProps {
  visible: boolean;
  workspaceName: string;
  onOk: (commentId: string | null) => void;
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
      open={visible}
      onCancel={onCancel}
      closable={true}
      destroyOnClose={true}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-8">
          <AppButton
            onClick={() => onOk(newName)}
            className="tw-text-white tw-pb-1 tw-pt-1"
            style={{ padding: '0.25rem 2rem' }}
          >
            Confirm
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-xl tw-font-bold">Rename Workspace</h2>
      <p style={{ margin: '0' }}>
        Name your workspace something that will represent its purpose
      </p>
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
