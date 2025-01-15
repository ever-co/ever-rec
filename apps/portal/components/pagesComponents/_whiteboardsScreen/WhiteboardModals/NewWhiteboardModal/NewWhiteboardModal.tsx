/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import React, { ChangeEvent, useEffect, useState } from 'react';
import styles from './NewWhiteboardModal.module.scss';
import AppSvg from 'components/elements/AppSvg';
import { errorHandler } from 'app/services/helpers/errors';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import { RootStateOrAny, useSelector } from 'react-redux';
import { requiredRule } from 'app/rules';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';
import AppInput from 'components/controls/AppInput';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOk: (name: string) => void;
}
const NewWhiteboardModal: React.FC<Props> = ({ visible, onClose, onOk }) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const [name, setName] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);

  const whiteboards: IWhiteboard[] = useSelector(
    (state: RootStateOrAny) => state.whiteboard.whiteboards,
  );

  useEffect(() => {
    const existingWhiteboards = whiteboards?.filter(
      (whiteboard) => whiteboard.name === name?.value,
    );

    if (existingWhiteboards?.length > 0) {
      setName({
        errors: ['This whiteboard already exists'],
        touched: true,
        value: name.value,
      });
    } else if (name.value.length > 35) {
      setName({
        errors: ['Whiteboard name can not contain more than 35 characters'],
        touched: true,
        value: name.value,
      });
    } else if (name.value.length < 1 && name.touched) {
      setName({
        errors: ['Whiteboard name can not be empty'],
        touched: true,
        value: name.value,
      });
    } else {
      setName({
        errors: [],
        touched: true,
        value: name.value,
      });
    }
  }, [name.value]);

  useEffect(() => {
    setValid(
      [name].every((control) => control.touched && !control.errors.length) &&
        name.value.length < 35 &&
        name.value.length > 0,
    );
  }, [name]);

  const nameRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter whiteboard name'),
  ];

  const onOkHandler = async (): Promise<void> => {
    if (valid) {
      onOk(name.value);
      setName(initialControl());
    }
  };

  const folderNameChangeHandler = ({ value, errors }: IAppControlData) => {
    if (value.length < 35) {
      setName({
        value,
        errors: errors || [],
        touched: true,
      });
    }
  };

  return (
    <Modal
      className={styles.modal}
      open={visible}
      destroyOnClose={true}
      onCancel={() => {
        setName(initialControl());
        onClose();
      }}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end  ">
          <AppButton
            disabled={!valid ? true : false}
            onClick={onOkHandler}
            className={styles.appButton}
          >
            Create
          </AppButton>
        </div>
      }
    >
      <h2 className={styles.mainHeading}>New Whiteboard</h2>
      {/* <h4 className={styles.subHeading}>
        Collaboration made easy with a workspace to share images and videos
        instantly.
      </h4> */}

      <AppInput
        placeholder="Enter a whiteboard name"
        value={name.value}
        errors={name.errors}
        onChange={folderNameChangeHandler}
        rules={nameRules}
        inputClass="tw-bg-transparent tw-placeholder-grey-dark2"
      />
    </Modal>
  );
};

export default NewWhiteboardModal;
