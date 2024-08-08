import React, { FC, useState } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppInput from 'components/controls/AppInput';

interface IProps {
  visible: boolean;
  onClose: () => void;
  onOk: (n: string | null) => void;
}

const CreateWorkspaceTeamModal: FC<IProps> = ({ onClose, onOk, visible }) => {
  const [name, setName] = useState('');

  const close = () => {
    onClose();
    setName('');
  };

  const confirm = (name: string) => {
    onOk(name);
    setName('');
  };

  return (
    <Modal
      visible={visible}
      onCancel={close}
      destroyOnClose={true}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-4">
          <AppButton
            onClick={close}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={() => confirm(name)}
            className="tw-px-8 tw-pb-1 tw-pt-1"
          >
            Create
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">Create a team</h2>
      <AppInput
        type="text"
        value={name}
        onChange={({ value, errors }) => setName(value)}
        placeholder="Enter team's name"
        inputClass="tw-bg-transparent tw-placeholder-black"
      />
    </Modal>
  );
};

export default CreateWorkspaceTeamModal;
