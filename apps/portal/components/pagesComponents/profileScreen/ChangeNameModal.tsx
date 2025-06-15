import { useEffect } from 'react';
import styles from 'pagesScss/Modal.module.scss';
import { Modal } from 'antd';
import { requiredRule } from 'app/rules';
import { IAppControlData } from 'app/interfaces/IAppControl';
import AppInput from 'components/controls/AppInput';
import ModalSaveChangesFooter from 'components/shared/modalComponents/ModalSaveChangesFooter';
import useEnterKeyPress from 'hooks/useEnterKeyPress';
import useChangeModalForm from 'hooks/useChangeModalForm';
import { useTranslation } from 'react-i18next';

interface IProps {
  name: string;
  visible: boolean;
  onClose: () => void;
  onOk: (name: string) => void;
}

const ChangeNameModal: React.FC<IProps> = ({
  name,
  visible,
  onClose,
  onOk,
}) => {
  const { t } = useTranslation();
  const displayNameRules: ((v: string) => boolean | string)[] = [
    requiredRule(t('page.auth.error.enterName')),
  ];
  const {
    fieldState: newName,
    setFieldState: setNewName,
    valid,
    setValid,
    onCancelHandler,
    onOkHandler,
  } = useChangeModalForm(name, onOk, onClose);

  useEnterKeyPress(onOkHandler);

  useEffect(() => {
    const nameIsNew = newName.value !== name;

    setValid(
      [newName].every((control) => control.touched && !control.errors.length) &&
        nameIsNew,
    );
  }, [name, newName, setValid]);

  const onNameChange = ({ value, errors }: IAppControlData) => {
    if (value.length > 32) {
      setNewName({
        value,
        errors: [t('toasts.nameTooLong')],
        touched: true,
      });
    } else
      setNewName({
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
      <h2 className={styles.modalHeader}>{t('common.name')}</h2>

      <label>{t('page.profile.nameModal.currentName')}</label>
      <AppInput
        placeholder={t('page.profile.newName')}
        value={newName.value}
        errors={newName.errors}
        rules={displayNameRules}
        inputClass={styles.appInputSecond}
        onChange={onNameChange}
      />
    </Modal>
  );
};

export default ChangeNameModal;
