import { useEffect } from 'react';
import styles from '../../../styles/Modal.module.scss';
import { Modal } from 'antd';
import { IAppControlData } from '@/app/interfaces/IAppControl';
import { emailRule, requiredRule } from '@/app/rules';
import AppInput from '@/content/components/controls/appInput/AppInput';
import ModalSaveChangesFooter from '@/content/panel/shared/modalComponents/ModalSaveChangesFooter';
import useEnterKeyPress from '@/content/utilities/hooks/useEnterKeyPress';
import useChangeModalForm from '@/content/utilities/hooks/useChangeModalForm';

const newEmailRules: ((v: string) => boolean | string)[] = [
  requiredRule('Please enter email'),
  emailRule('Please enter a correct email address'),
];

interface ICreateFolderModalProps {
  visible: boolean;
  email: string;
  onClose: () => void;
  onOk: (email: string) => void;
}

const ChangeEmailModal: React.FC<ICreateFolderModalProps> = ({
  visible,
  email,
  onClose,
  onOk,
}) => {
  const {
    fieldState: newEmail,
    setFieldState: setNewEmail,
    valid,
    setValid,
    onCancelHandler,
    onOkHandler,
  } = useChangeModalForm(email, onOk, onClose);

  useEnterKeyPress(onOkHandler);

  useEffect(() => {
    const emailIsNew = email !== newEmail.value;

    setValid(
      [newEmail].every(
        (control) => control.touched && !control.errors.length,
      ) && emailIsNew,
    );
  }, [newEmail, email]);

  const onEmailChange = ({ value, errors }: IAppControlData) => {
    setNewEmail({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      width={600}
      footer={
        <ModalSaveChangesFooter
          ok={onOkHandler}
          close={onCancelHandler}
          valid={valid}
        />
      }
    >
      <h2 className={styles.modalHeader}>Email Address</h2>

      <label>Current email address:</label>
      <AppInput
        placeholder="Enter new email"
        value={newEmail.value}
        errors={newEmail.errors}
        onChange={onEmailChange}
        inputClass={styles.appInputSecond}
        rules={newEmailRules}
      />
    </Modal>
  );
};

export default ChangeEmailModal;
