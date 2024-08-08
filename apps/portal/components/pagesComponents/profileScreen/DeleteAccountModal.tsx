import { FC, useEffect, useState } from 'react';
import styles from 'pagesScss/Modal.module.scss';
import classNames from 'classnames';
import { Modal } from 'antd';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import AppInput, { onChangeInputType } from 'components/controls/AppInput';
import ModalSaveChangesFooter from 'components/shared/modalComponents/ModalSaveChangesFooter';
import PasswordEye from '../_signScreen/PasswordEye';
import useEnterKeyPress from 'hooks/useEnterKeyPress';

interface IProps {
  email: string;
  loggedIn: boolean;
  visible: boolean;
  onLogin: (password: string) => void;
  onDeleteAccount: () => void;
  onClose: () => void;
}

const DeleteAccountModal: React.FC<IProps> = ({
  email,
  loggedIn,
  visible,
  onLogin,
  onDeleteAccount,
  onClose,
}) => {
  // First UI step state
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
  const [passwordState, setPasswordState] = useState<IAppControl>({
    value: '',
    errors: [],
    touched: false,
  });
  // Second UI step state
  const [deleteValid, setDeleteValid] = useState(false);
  const [deleteInputState, setDeleteInputState] = useState('');

  useEnterKeyPress(onOkHandler);

  // First UI step - login with password
  useEffect(() => {
    const password = passwordState.value;
    const passwordsNotEmpty = password.length > 0;

    setPasswordValid(
      [passwordState].every(
        (control) => control.touched && !control.errors.length,
      ) && passwordsNotEmpty,
    );
  }, [passwordState]);

  // Second UI step - type delete my account
  useEffect(() => {
    if (deleteInputState !== 'delete my account') {
      setDeleteValid(false);
      return;
    }

    setDeleteValid(true);
  }, [deleteInputState]);

  const onPasswordChange = ({ value, errors }: IAppControlData) => {
    setPasswordState({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const resetState = () => {
    setPasswordState({ value: '', errors: [], touched: false });
    setDeleteInputState('');
    setPasswordValid(false);
    setDeleteValid(false);
    setPasswordShown(false);
  };

  const onCancelHandler = () => {
    resetState();
    onClose();
  };

  async function onOkHandler() {
    if (!loggedIn && !passwordValid) return;
    if (loggedIn && !deleteValid) return;

    !loggedIn ? onLogin(passwordState.value) : onDeleteAccount();
    resetState();
  }

  // Helper
  const togglePasswordShown = () => {
    setPasswordShown((prev) => !prev);
  };

  return (
    <Modal
      visible={visible}
      onCancel={onCancelHandler}
      width={600}
      footer={
        <ModalSaveChangesFooter
          valid={!loggedIn ? passwordValid : deleteValid}
          buttonTitle={!loggedIn ? 'Next' : 'Permanently delete account'}
          danger={loggedIn}
          ok={onOkHandler}
          close={onCancelHandler}
        />
      }
    >
      <h2 className={styles.modalHeader}>Permanently Delete Account</h2>

      {!loggedIn ? (
        <EnterCurrentPassword
          passwordShown={passwordShown}
          passwordState={passwordState}
          togglePassword={togglePasswordShown}
          onPasswordChange={onPasswordChange}
        />
      ) : (
        <PermanentlyDeleteAccount
          email={email}
          deleteInputValue={deleteInputState}
          onDeleteInputChange={({ value }) => setDeleteInputState(value)}
        />
      )}
    </Modal>
  );
};

export default DeleteAccountModal;

interface IEnterCurrentPasswordProps {
  passwordShown: boolean;
  passwordState: IAppControl;
  togglePassword: () => void;
  onPasswordChange: onChangeInputType;
}

// First UI step
const EnterCurrentPassword: FC<IEnterCurrentPasswordProps> = ({
  passwordShown,
  passwordState,
  togglePassword,
  onPasswordChange,
}) => {
  return (
    <div className={styles.inputField}>
      <label>Current password:</label>
      <div className={styles.inputFieldCombined}>
        <AppInput
          placeholder="Enter password"
          type={passwordShown ? 'text' : 'password'}
          autoComplete={'new-password'}
          rules={null}
          value={passwordState.value}
          errors={passwordState.errors}
          inputClass={styles.appInputSecond}
          onChange={onPasswordChange}
        />
        <PasswordEye
          passwordShown={passwordShown}
          togglePassword={togglePassword}
        />
      </div>
    </div>
  );
};

interface IPermanentlyDeleteAccountProps {
  email: string;
  deleteInputValue: string;
  onDeleteInputChange: onChangeInputType;
}

// Second UI step
const PermanentlyDeleteAccount: FC<IPermanentlyDeleteAccountProps> = ({
  email,
  deleteInputValue,
  onDeleteInputChange,
}) => {
  return (
    <div className={styles.permanentlyDeleteAccount}>
      <p>
        Are you sure you want to delete your Rec account? Deleting your
        <b> {email}</b> account will delete all your associated data such as
        your images, videos, folders, and creative spaces, including content you
        have shared with others. You cannot undo this operation.
      </p>

      <p>
        For more information about how we treat your data, please see our
        Privacy Policy.
      </p>

      <p>To confirm, please type &quot;delete my account&quot; below.</p>

      <AppInput
        placeholder=""
        type="text"
        value={deleteInputValue}
        inputClass={classNames(
          styles.appInputSecond,
          styles.appInputSecondDanger,
        )}
        onChange={onDeleteInputChange}
      />
    </div>
  );
};
