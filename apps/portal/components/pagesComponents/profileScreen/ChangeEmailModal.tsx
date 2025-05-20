import { useEffect } from 'react';
import styles from 'pagesScss/Modal.module.scss';
import { Modal } from 'antd';
import { emailRule, requiredRule } from 'app/rules';
import { IAppControlData } from 'app/interfaces/IAppControl';
import AppInput from 'components/controls/AppInput';
import ModalSaveChangesFooter from 'components/shared/modalComponents/ModalSaveChangesFooter';
import useEnterKeyPress from 'hooks/useEnterKeyPress';
import useChangeModalForm from 'hooks/useChangeModalForm';
import { useTranslation } from 'react-i18next';

interface ICreateFolderModalProps {
  email: string;
  visible: boolean;
  onClose: () => void;
  onOk: (email: string) => void;
}

const ChangeEmailModal: React.FC<ICreateFolderModalProps> = ({
  email,
  visible,
  onClose,
  onOk,
}) => {
  const { t } = useTranslation();
  const newEmailRules: ((v: string) => boolean | string)[] = [
    requiredRule(t('page.auth.error.enterEmail')),
    emailRule(t('page.auth.error.emailIncorrect')),
  ];
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
  }, [newEmail, email, setValid]);

  const onEmailChange = ({ value, errors }: IAppControlData) => {
    setNewEmail({
      value,
      errors: errors || [],
      touched: true,
    });
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
      <h2 className={styles.modalHeader}>{t('page.profile.emailAddress')}</h2>

      <label>{t('page.profile.currentEmail')}</label>
      <AppInput
        placeholder={t('page.profile.newEmail')}
        value={newEmail.value}
        rules={newEmailRules}
        errors={newEmail.errors}
        inputClass={styles.appInputSecond}
        onChange={onEmailChange}
      />
    </Modal>
  );
};

export default ChangeEmailModal;
