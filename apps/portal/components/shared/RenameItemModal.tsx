import { FC, useEffect, useState } from 'react';
import styles from 'pagesScss/Modal.module.scss';
import { Modal } from 'antd';
import AppInput from 'components/controls/AppInput';
import ModalSaveChangesFooter from './modalComponents/ModalSaveChangesFooter';
import useEnterKeyPress from 'hooks/useEnterKeyPress';

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

  const nameChangeHandler = ({ value }) => {
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
      visible={visible}
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
        errors={[]}
        rules={[]}
        inputClass={styles.appInputSecond}
        onChange={nameChangeHandler}
      />
    </Modal>
  );
};

export default RenameItemModal;
