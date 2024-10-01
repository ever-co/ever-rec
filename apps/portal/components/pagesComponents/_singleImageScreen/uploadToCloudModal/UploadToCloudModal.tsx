import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import { requiredRule } from 'app/rules';
import AppInput from 'components/controls/AppInput';
import AppButton from 'components/controls/AppButton';
import { MdOutlineAddToDrive } from 'react-icons/md';
import AppSvg from '../../../elements/AppSvg';
import { AiOutlineDropbox } from 'react-icons/ai';

interface IUploadToCloudModalProps {
  visible: boolean;
  oldName?: string;
  type?: string;
  onClose: () => void;
  onOk: (name: string, type?: string) => void;
}

const UploadToCloudModal: React.FC<IUploadToCloudModalProps> = ({
  visible,
  oldName,
  onClose,
  onOk,
  type = null,
}) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const [name, setName] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);

  useEffect(() => {
    oldName &&
      setName({
        value: oldName,
        touched: true,
        errors: [],
      });
  }, [oldName]);

  useEffect(() => {
    setValid(
      [name].every((control) => control.touched && !control.errors.length),
    );
  }, [name]);

  const nameRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter file name'),
  ];

  const onOkHandler = async (): Promise<void> => {
    if (valid) {
      onOk(name.value, type as string);
      setName(initialControl());
    }
  };

  const nameChangeHandler = ({ value, errors }: IAppControlData) => {
    setName({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-4">
          <AppButton
            onClick={onClose}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            disabled={!valid}
          >
            Save
          </AppButton>
        </div>
      }
    >
      <div className="tw-flex tw-items-center tw-mb-6">
        {!type && <MdOutlineAddToDrive size={30} className="tw-mr-2" />}
        {type == 'dropbox' && (
          <AiOutlineDropbox size={30} className="tw-mr-2" />
        )}
        <h2 className="tw-text-2xl tw-font-semibold">
          Save to {type ? type : 'Google drive'}
        </h2>
      </div>
      <AppInput
        placeholder="Name"
        inputClass="tw-bg-transparent"
        value={name.value}
        errors={name.errors}
        onChange={nameChangeHandler}
        rules={nameRules}
      />
    </Modal>
  );
};

export default UploadToCloudModal;
