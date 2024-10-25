import { ChangeEvent, useState } from 'react';
import styles from './CreateNewWorkspaceModal.module.scss';
import { Modal } from 'antd';
import AppButton from '../../../../controls/AppButton';
import AppSvg from '../../../../elements/AppSvg';

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
          Save
        </AppButton>
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
