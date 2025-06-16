import { useEffect, useState } from 'react';
import styles from 'pagesScss/Modal.module.scss';
import { Modal } from 'antd';
import { passwordPatternRule } from 'app/rules';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import AppInput from 'components/controls/AppInput';
import ModalSaveChangesFooter from 'components/shared/modalComponents/ModalSaveChangesFooter';
import PasswordEye from '../_signScreen/PasswordEye';
import useEnterKeyPress from 'hooks/useEnterKeyPress';
import { useTranslation } from 'react-i18next';

const passwordRule = passwordPatternRule(
  'Must have at least eight characters and one number',
);

interface IProps {
  visible: boolean;
  onClose: () => void;
  onOk: (oldPassword: string, newPassword: string) => void;
}

const ChangePasswordModal: React.FC<IProps> = ({ visible, onClose, onOk }) => {
  const { t } = useTranslation();
  const [valid, setValid] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
  const [passwordState, setPasswordState] = useState<IAppControl>({
    value: '',
    errors: [],
    touched: false,
  });
  const [newPasswordState, setNewPasswordState] = useState<IAppControl>({
    value: '',
    errors: [],
    touched: false,
  });

  useEnterKeyPress(onOkHandler);

  useEffect(() => {
    const password = passwordState.value;
    const newPassword = newPasswordState.value;

    const passwordsAreNotTheSame = password !== newPassword;
    const passwordsNotEmpty = password.length > 0 && newPassword.length > 0;

    const passwordValid = passwordRule(newPassword);
    const newPasswordMatchesPattern = typeof passwordValid === 'boolean';

    setValid(
      [passwordState, newPasswordState].every(
        (control) => control.touched && !control.errors.length,
      ) &&
        passwordsAreNotTheSame &&
        passwordsNotEmpty &&
        newPasswordMatchesPattern,
    );
  }, [passwordState, newPasswordState]);

  const onPasswordChange = ({ value, errors }: IAppControlData) => {
    setPasswordState({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const onNewPasswordChange = ({ value, errors }: IAppControlData) => {
    setNewPasswordState({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const resetState = () => {
    setPasswordState({ value: '', errors: [], touched: false });
    setNewPasswordState({ value: '', errors: [], touched: false });
    setValid(false);
    setPasswordShown(false);
  };

  const onCancelHandler = () => {
    resetState();
    onClose();
  };

  async function onOkHandler() {
    if (!valid) return;

    onOk(passwordState.value, newPasswordState.value);
    resetState();
  }

  const togglePasswordShown = () => {
    setPasswordShown((prev) => !prev);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancelHandler}
      width={600}
      footer={
        <ModalSaveChangesFooter
          ok={onOkHandler}
          close={onCancelHandler}
          valid={valid}
        />
      }
    >
      <h2 className={styles.modalHeader}>{t('page.auth.common.password')}</h2>

      <div className={styles.inputField}>
        <label>{t('page.profile.deleteAccountModal.currentPassword')}</label>
        <div className={styles.inputFieldCombined}>
          <AppInput
            placeholder={t('page.profile.deleteAccountModal.enterPassword')}
            type={passwordShown ? 'text' : 'password'}
            autoComplete={'new-password'}
            rules={[]}
            value={passwordState.value}
            errors={passwordState.errors}
            inputClass={styles.appInputSecond}
            onChange={onPasswordChange}
          />
          <PasswordEye
            passwordShown={passwordShown}
            togglePassword={togglePasswordShown}
          />
        </div>
      </div>

      <div className={styles.inputField}>
        <label>{t('page.auth.newPassword.newPasswordColon')}</label>
        <div className={styles.inputFieldCombined}>
          <AppInput
            placeholder={t('page.profile.newPassword')}
            type={passwordShown ? 'text' : 'password'}
            autoComplete={'new-password'}
            rules={[]}
            value={newPasswordState.value}
            errors={newPasswordState.errors}
            inputClass={styles.appInputSecond}
            onChange={onNewPasswordChange}
          />
          <PasswordEye
            passwordShown={passwordShown}
            togglePassword={togglePasswordShown}
          />
        </div>
        <span>{t('page.profile.passwordValidation')}</span>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
