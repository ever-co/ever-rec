import React, { FC, useState } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppInput from 'components/controls/AppInput';
import { useTranslation } from 'react-i18next';

interface IProps {
  visible: boolean;
  onClose: () => void;
  onOk: (n: string | null) => void;
}

const CreateWorkspaceTeamModal: FC<IProps> = ({ onClose, onOk, visible }) => {
  const [name, setName] = useState('');

  const { t } = useTranslation();
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
      open={visible}
      onCancel={close}
      destroyOnClose={true}
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton onClick={close} bgColor="tw-bg-app-grey-darker" outlined>
            {t('common.cancel')}
          </AppButton>
          <AppButton onClick={() => confirm(name)}>
            {t('modals.create')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-4 tw-text-base tw-font-semibold">
        {t('modals.createATeam')}
      </h2>
      <AppInput
        type="text"
        value={name}
        onChange={({ value, errors }) => setName(value)}
        placeholder={t('modals.enterTeamName')}
        inputClass="tw-bg-transparent"
      />
    </Modal>
  );
};

export default CreateWorkspaceTeamModal;
