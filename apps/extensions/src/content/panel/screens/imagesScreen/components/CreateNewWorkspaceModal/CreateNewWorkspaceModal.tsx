import { ChangeEvent, useState } from 'react';
import * as styles from './CreateNewWorkspaceModal.module.scss';
import { Modal } from 'antd';
import AppSvg from '@/content/components/elements/AppSvg';
import AppButton from '@/content/components/controls/appButton/AppButton';
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
  const { t } = useTranslation();
  const [name, setName] = useState('');

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
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div>
          <AppButton
            full
            disabled={name === ''}
            className={styles.appButton}
            onClick={okHandler}
          >
            {t('common.save')}
          </AppButton>
        </div>
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
