import { FC, useEffect, useState } from 'react';
import styles from '../styles/Modal.module.scss';
import { Modal } from 'antd';
import ModalSaveChangesFooter from './modalComponents/ModalSaveChangesFooter';
import useEnterKeyPress from '@/content/utilities/hooks/useEnterKeyPress';
import AppInput from '@/content/components/controls/appInput/AppInput';

interface IProps {
  visible: boolean;
  title: string;
  modalHeading: string;
  inputLabel: string;
  inputPlaceholder: string;
  onOk: (title: string) => void;
  onCancel: () => void;
}

const RenameItemModal: FC<IProps> = ({
  visible,
  title: initialTitle,
  modalHeading,
  inputLabel,
  inputPlaceholder,
  onOk,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [valid, setValid] = useState(false);

  useEnterKeyPress(onOkHandler);

  useEffect(() => {
    if (!initialTitle) return;

    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (!initialTitle) return;

    const titleIsNew = title !== initialTitle;
    const titleIsNotEmpty = title.length > 0;

    setValid(titleIsNew && titleIsNotEmpty);
  }, [initialTitle, title, setValid]);

  const nameChangeHandler = (value: string) => {
    setTitle(value);
  };

  function onOkHandler() {
    onOk(title);
    onCancel();
  }

  const onCancelHandler = () => {
    setTitle(initialTitle);
    onCancel();
  };

  return (
    <Modal
      open={visible}
      closable
      footer={
        <ModalSaveChangesFooter
          ok={onOkHandler}
          close={onCancelHandler}
          valid={valid}
        />
      }
      onCancel={onCancelHandler}
    >
      <h2 className={styles.modalHeader}>{modalHeading}</h2>

      <label>{inputLabel}</label>
      <AppInput
        placeholder={inputPlaceholder}
        value={title}
        errors={undefined}
        rules={undefined}
        inputClass={styles.appInputSecond}
        onChange={({ value }) => nameChangeHandler(value)}
      />
    </Modal>
  );
};

export default RenameItemModal;
