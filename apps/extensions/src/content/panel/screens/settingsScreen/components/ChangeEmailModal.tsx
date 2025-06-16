import { useEffect } from 'react';
import * as styles from '../../../styles/Modal.module.scss';
import { Modal } from 'antd';
import { IAppControlData } from '@/app/interfaces/IAppControl';
import { emailRule, requiredRule } from '@/app/rules';
import AppInput from '@/content/components/controls/appInput/AppInput';
import ModalSaveChangesFooter from '@/content/panel/shared/modalComponents/ModalSaveChangesFooter';
import useEnterKeyPress from '@/content/utilities/hooks/useEnterKeyPress';
import useChangeModalForm from '@/content/utilities/hooks/useChangeModalForm';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const {
    fieldState: newEmail,
    setFieldState: setNewEmail,
    valid,
    setValid,
    onCancelHandler,
    onOkHandler,
  } = useChangeModalForm(email, onOk, onClose);
  const newEmailRules: ((v: string) => boolean | string)[] = [
    requiredRule(t('page.auth.error.enterEmail')),
    emailRule(t('page.auth.error.emailIncorrect')),
  ];

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
      open={visible}
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
      <h2 className={styles.modalHeader}>{t('page.profile.emailAddress')}</h2>

      <label>{t('page.profile.currentEmail')}</label>
      <AppInput
        placeholder={t('page.profile.newEmail')}
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
