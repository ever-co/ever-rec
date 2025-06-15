import React, { FC, useState } from 'react';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppInput from '@/content/components/controls/appInput/AppInput';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

interface IProps {
  visible: boolean;
  onClose: () => void;
  onOk: (name: string) => void;
}

const CreateWorkspaceTeamModal: FC<IProps> = ({ onClose, onOk, visible }) => {
  const { t } = useTranslation();
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
      open={visible}
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
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={() => confirm(name)}
            className="tw-px-8 tw-pb-1 tw-pt-1"
          >
            {t('common.create')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        {t('modals.createATeam')}
      </h2>
      <AppInput
        type="text"
        value={name || ''}
        onChange={({ value, errors }) => setName(value)}
        placeholder={t('modals.enterTeamName')}
        inputClass="tw-bg-transparent tw-placeholder-black"
      />
    </Modal>
  );
};

export default CreateWorkspaceTeamModal;
