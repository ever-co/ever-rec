import { useEffect } from 'react';
import * as styles from '../../../styles/Modal.module.scss';
import { Modal } from 'antd';
import { IAppControlData } from '@/app/interfaces/IAppControl';
import { requiredRule } from '@/app/rules';
import AppInput from '@/content/components/controls/appInput/AppInput';
import ModalSaveChangesFooter from '@/content/panel/shared/modalComponents/ModalSaveChangesFooter';
import useEnterKeyPress from '@/content/utilities/hooks/useEnterKeyPress';
import useChangeModalForm from '@/content/utilities/hooks/useChangeModalForm';

const displayNameRules: ((v: string) => boolean | string)[] = [
  requiredRule('Please enter a name'),
];

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
  }, [name, newName]);

  const onNameChange = ({ value, errors }: IAppControlData) => {
    if (value.length > 32) {
      setNewName({
        value,
        errors: ['Name can not contain more than 32 characters'],
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
      <h2 className={styles.modalHeader}>Name</h2>

      <label>Current name:</label>
      <AppInput
        placeholder="Enter new name"
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
