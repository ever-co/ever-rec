import AppSvg from 'components/elements/AppSvg';
import classNames from 'classnames';
import AppButton from 'components/controls/AppButton';
import { Modal } from 'antd';
import React, { ChangeEvent, useEffect, useState } from 'react';
import renameIcon from 'public/whiteboards/ContextMenuItems/rename.svg';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import AppInput from 'components/controls/AppInput';
import { requiredRule } from 'app/rules';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';
import { RootStateOrAny, useSelector } from 'react-redux';

interface Props {
  visible: boolean;
  onOk: (name: string) => void;
  onCancel: () => void;
}
const RenameModal: React.FC<Props> = ({ onOk, onCancel, visible }) => {
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
        name.value.length <= 35 &&
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
      open={visible}
      onCancel={() => {
        setName(initialControl());
        onCancel();
      }}
      destroyOnClose={true}
      closable={true}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className={classNames('tw-flex tw-justify-end tw-mt-5')}>
          <AppButton
            disabled={!valid ? true : false}
            onClick={onOkHandler}
            className="tw-px-12 tw-text-white tw-py-1 "
            bgColor="tw-bg-whiteboard-purple"
          >
            Save
          </AppButton>
        </div>
      }
    >
      <div className="tw-flex tw-gap-10px">
        <AppSvg size="26px" path={renameIcon.src} />
        <h2 className="tw-mb-6 tw-text-xl tw-font-bold">Rename</h2>
      </div>

      <AppInput
        placeholder="Enter a whiteboard name"
        value={name.value}
        errors={name.errors}
        onChange={folderNameChangeHandler}
        rules={nameRules}
        inputClass="tw-bg-transparent tw-placeholder-grey-dark2"
      />

      {/* <input
        style={{
          padding: '10px',
          width: '100%',
          background: 'transparent',
          borderBottom: '1px solid grey',
        }}
        type="text"
        placeholder="Enter a whiteboard name"
        onChange={changeHandler}
      /> */}
    </Modal>
  );
};

export default RenameModal;
