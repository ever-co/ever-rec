import { useState } from 'react';
import useEnterKeyPress from './useEnterKeyPress';
import IAppControl from '@/app/interfaces/IAppControl';

export const useChangeModalForm = (
  initialValue: string,
  onOk: (value: string) => void,
  onClose: () => void,
) => {
  const [valid, setValid] = useState(false);
  const [fieldState, setFieldState] = useState<IAppControl>({
    value: initialValue,
    errors: [],
    touched: false,
  });

  useEnterKeyPress(onOkHandler);

  const onCancelHandler = () => {
    setFieldState({ value: initialValue, errors: [], touched: false });
    setValid(false);

    onClose();
  };

  async function onOkHandler() {
    if (!valid) return;

    setFieldState({ value: fieldState.value, errors: [], touched: false });
    setValid(false);

    onOk(fieldState.value);
  }

  return {
    fieldState,
    setFieldState,
    valid,
    setValid,
    onCancelHandler,
    onOkHandler,
  };
};

export default useChangeModalForm;
