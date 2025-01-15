import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import IAppControl, { IAppControlData } from '@/app/interfaces/IAppControl';
import { requiredRule } from '@/app/rules';
import AppInput from '@/content/components/controls/appInput/AppInput';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';

interface IUploadToCloudModalProps {
  type?: string;
  visible: boolean;
  oldName?: string;
  onClose: () => void;
  onOk: (name: string, type?: string) => void;
}

const UploadToCloudModal: React.FC<IUploadToCloudModalProps> = ({
  visible,
  oldName,
  onClose,
  onOk,
  type,
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
      onOk(name.value, type);
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
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-4">
          <AppButton
            onClick={onClose}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-mx-4 tw-pb-1 tw-pt-1"
            twPadding="tw-px-8"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={onOkHandler}
            className="tw-pb-1 tw-pt-1"
            disabled={!valid}
            twPadding="tw-px-8"
          >
            Save
          </AppButton>
        </div>
      }
    >
      <div className="tw-flex tw-items-center tw-mb-6">
        {!type && (
          <AppSvg
            path="images/panel/common/google-drive-logo-dark.svg"
            size={30 + 'px'}
          />
        )}
        {type == 'dropbox' && (
          <AppSvg
            path="images/panel/common/dropbox-icon-dark.svg"
            size={30 + 'px'}
          />
        )}
        <h2 className="tw-text-2xl tw-font-semibold">
          Save to {type ? type : 'Google drive'}
        </h2>
      </div>
      <AppInput
        inputClass="tw-bg-transparent"
        placeholder="Name"
        value={name.value}
        errors={name.errors}
        onChange={nameChangeHandler}
        rules={nameRules}
      />
    </Modal>
  );
};

export default UploadToCloudModal;
