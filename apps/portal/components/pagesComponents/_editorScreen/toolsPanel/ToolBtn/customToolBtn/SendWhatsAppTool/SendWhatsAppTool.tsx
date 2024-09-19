import React, { useEffect, useRef, useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import AppButton from 'components/controls/AppButton';
import { errorMessage } from 'app/services/helpers/toastMessages';
import { sendWhatsAppMessage } from 'app/services/screenshots';
import { infoMessage } from 'app/services/helpers/toastMessages';
import { requiredRule } from 'app/rules';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppInput from 'components/controls/AppInput';
import IEditorImage from 'app/interfaces/IEditorImage';
import styles from './SendWhatsAppTool.module.scss';

interface ISendWhatsAppToolProps {
  active: boolean;
  isOpenTool: boolean;
  onSelect: (tool: ITool | null) => void;
  onSave: () => void;
  history: any;
}

const SendWhatsAppTool: React.FC<ISendWhatsAppToolProps> = ({
  active,
  isOpenTool,
  onSelect,
  onSave,
  history,
}) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });
  const [phoneInput, setPhoneInput] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const subPanelRef = useRef<{
    closePanel: () => void;
  }>(null);
  const closeSubPanelHandler = () => onSelect(null);
  const closeSubPanel = () => subPanelRef?.current?.closePanel();
  // const [searchParams, setSearchParams] = useSearchParams();

  const newPhoneRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter an WhatsApp Number'),
  ];
  const image: IEditorImage = useSelector(
    (state: RootStateOrAny) => state.panel.editorImage,
  );
  useEffect(() => {
    if (phoneInput.value.length > 12) {
      setPhoneInput({
        errors: ['WhatsApp Number can not contain more than 12 characters'],
        touched: true,
        value: phoneInput.value,
      });
    } else if (phoneInput.value.length < 1 && phoneInput.touched) {
      setPhoneInput({
        errors: ['WhatsApp Number can not be empty'],
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

  const oldPhoneChangeHandler = ({ value, errors }: IAppControlData) => {
    setPhoneInput({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const sendSlackScreenShot = async () => {
    const id = image.dbData?.id;
    if (id && phoneInput && phoneInput.errors.length == 0) {
      try {
        setLoading(true);
        if (history.length > 1) await onSave();
        const res = await sendWhatsAppMessage(id, phoneInput.value, 'image');
        if (res && res.status != 'error') {
          infoMessage('Item shared successfully');
          closeSubPanel();
        } else {
          errorMessage(res.message);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ToolBtn
      isOpenEditTool={isOpenTool}
      onSelect={() => onSelect(tools.whatsApp)}
      icon={tools.whatsApp.icon}
      active={active}
      onSubpanelClose={closeSubPanelHandler}
      ref={subPanelRef}
      placement="right"
      toolTitle={tools.whatsApp.title}
    >
      <div className={styles.parentContainer}>
        <div className={styles.flexContainer}>
          <h2 className={styles.title}>Share with WhatsApp</h2>
          <AppInput
            type={'number'}
            placeholder="Enter WhatsApp Number with country code"
            value={phoneInput.value}
            errors={phoneInput.errors}
            onChange={oldPhoneChangeHandler}
            rules={newPhoneRules}
            className={styles.inputContainer}
          />
          <div className={styles.innerContainer}>
            <div className={styles.container}>
              <AppButton
                className={styles.buttonContainer}
                onClick={async () => {
                  await sendSlackScreenShot();
                }}
                disabled={loading || !valid}
              >
                <span>Send</span>
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </ToolBtn>
  );
};

export default SendWhatsAppTool;
