import { ChangeEvent, useState } from 'react';
import styles from './CreateNewWorkspaceModal.module.scss';
import { Modal } from 'antd';
import AppButton from '../../../../controls/AppButton';
import AppSvg from '../../../../elements/AppSvg';
import { useTranslation } from 'react-i18next';

interface IProps {
  visible: boolean;
  onOk: (name: string) => void;
  onClose: () => void;
}

const CreateNewWorkspaceModal: React.FC<IProps> = ({
  visible,
  onOk,
  onClose,
}) => {
  const [name, setName] = useState('');
  const { t } = useTranslation();

  const okHandler = () => {
    setName('');
    onOk(name);
  };

  const cancelHandler = () => {
    setName('');
    onClose();
  };

  return (
    <Modal
      destroyOnClose
      open={visible}
      className={styles.modal}
      onCancel={cancelHandler}
      onOk={okHandler}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <AppButton
          className={styles.appButton}
          disabled={name === ''}
          onClick={okHandler}
        >
          {t('common.save')}
        </AppButton>
      }
    >
      <h2 className={styles.mainHeading}>{t('workspace.newWorkspaceName')}</h2>
      <h4 className={styles.subHeading}>{t('workspace.description')}</h4>
      <input
        type="text"
        placeholder={t('workspace.enterAWorkspaceName')}
        className={styles.input}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        maxLength={50}
      />
    </Modal>
  );
};

export default CreateNewWorkspaceModal;
