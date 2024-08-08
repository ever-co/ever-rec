import { ChangeEvent, useState } from 'react';
import styles from './CreateNewWorkspaceModal.module.scss';
import { Modal } from 'antd';
import AppSvg from '@/content/components/elements/AppSvg';
import AppButton from '@/content/components/controls/appButton/AppButton';

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
      visible={visible}
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
            Save
          </AppButton>
        </div>
      }
    >
      <h2 className={styles.mainHeading}>New Workspace Name</h2>
      <h4 className={styles.subHeading}>
        Collaboration made easy with a workspace to share images and videos
        instantly.
      </h4>

      <input
        type="text"
        placeholder="Enter a workspace name"
        className={styles.input}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        maxLength={50}
      />
    </Modal>
  );
};

export default CreateNewWorkspaceModal;
