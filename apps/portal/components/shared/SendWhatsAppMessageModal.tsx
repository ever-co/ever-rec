import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import { sendWhatsAppMessage } from 'app/services/screenshots';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import AppInput from 'components/controls/AppInput';
import { requiredRule } from 'app/rules';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import styles from './SendWhatsAppMessageModal.module.scss';
import { useTranslation } from 'react-i18next';

interface ISlackChannelModalProps {
  selectedItemId: string;
  type?: string;
  onCancel: () => void;
  forEditor?: boolean;
  onSave?: () => void;
}

const SendWhatsAppMessageModal: React.FC<ISlackChannelModalProps> = ({
  onCancel,
  selectedItemId,
  type = 'image',
  forEditor,
  onSave,
}) => {
  const { t } = useTranslation();
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });
  const [phoneInput, setPhoneInput] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const newPhoneRules: ((v: string) => boolean | string)[] = [
    requiredRule(t('extras.enterWhatsAppNumber')),
  ];

  useEffect(() => {
    if (phoneInput.value.length > 12) {
      setPhoneInput({
        errors: [t('toasts.whatsAppTooLong')],
        touched: true,
        value: phoneInput.value,
      });
    } else if (phoneInput.value.length < 1 && phoneInput.touched) {
      setPhoneInput({
        errors: [t('toasts.whatsAppEmpty')],
        touched: true,
        value: phoneInput.value,
      });
    } else {
      setPhoneInput({
        errors: [],
        touched: true,
        value: phoneInput.value,
      });
    }
  }, [phoneInput.value]);

  useEffect(() => {
    setValid([phoneInput].every((control) => control.value.length >= 1));
  }, [phoneInput]);

  const sendWhatsAppScreenShot = async (
    selectedItemId: string,
    phone: string,
  ) => {
    if (selectedItemId) {
      try {
        setLoading(true);
        if (forEditor && onSave) {
          await onSave();
        }
        const res = await sendWhatsAppMessage(selectedItemId, phone, type);
        if (res && res.status != 'error') {
          infoMessage(t('toasts.itemSharedSuccess'));
          onCancel();
        } else {
          if (res && res.message) {
            errorMessage(res.message);
          }
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOnsubmit = useCallback(async () => {
    if (phoneInput && phoneInput.errors.length == 0) {
      sendWhatsAppScreenShot(selectedItemId, phoneInput.value);
    }
  }, [phoneInput]);

  const oldPhoneChangeHandler = ({ value, errors }: IAppControlData) => {
    setPhoneInput({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  return (
    <Modal
      open={true}
      onCancel={onCancel}
      footer={
        <div className={styles.headerContainer}>
          <AppButton
            onClick={onCancel}
            bgColor={styles.bgColor}
            outlined
            className={styles.btn}
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={handleOnsubmit}
            className={styles.btnContainer}
            disabled={loading || !valid}
          >
            {t('common.send')}
          </AppButton>
        </div>
      }
    >
      <h2 className={styles.title}>{t('modals.shareOnWhatsApp')}</h2>
      <AppInput
        type={'number'}
        placeholder={t('modals.enterWhatsApp')}
        value={phoneInput.value}
        errors={phoneInput.errors}
        onChange={oldPhoneChangeHandler}
        rules={newPhoneRules}
        inputClass={styles.inputContainer}
      />
    </Modal>
  );
};

export default SendWhatsAppMessageModal;
