import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import { requiredRule } from 'app/rules';
import AppInput from 'components/controls/AppInput';
import AppButton from 'components/controls/AppButton';
import { MdOutlineAddToDrive } from 'react-icons/md';
import AppSvg from '../../../elements/AppSvg';
import { AiOutlineDropbox } from 'react-icons/ai';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
    requiredRule(t('extras.enterFileName')),
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
          <AppButton onClick={onClose} outlined className="tw-mr-2">
            {t('common.cancel')}
          </AppButton>
          <AppButton onClick={onOkHandler} disabled={!valid}>
            {t('common.save')}
          </AppButton>
        </div>
      }
    >
      <div className="tw-flex tw-items-center tw-mb-6">
        {!type && (
          <MdOutlineAddToDrive
            size={20}
            className="tw-mr-2 tw-shrink-0 tw-text-muted-foreground"
          />
        )}
        {type == 'dropbox' && (
          <AiOutlineDropbox
            size={20}
            className="tw-mr-2 tw-shrink-0 tw-text-muted-foreground"
          />
        )}
        <h2 className="tw-text-base tw-font-semibold tw-text-foreground">
          {t('page.image.saveTo')}
          {type ? type : 'Google drive'}
        </h2>
      </div>
      <AppInput
        placeholder={t('common.name')}
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
