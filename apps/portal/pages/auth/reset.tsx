import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import { emailRule, requiredRule } from 'app/rules';
import { resetUserEmail } from 'app/services/auth';
import AppButton from 'components/controls/AppButton';
import AppInput from 'components/controls/AppInput';
import React, { useEffect, useState } from 'react';
import Auth from '.';

const PanelResetPassword: React.FC = () => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const [email, setEmail] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);

  const emailRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter an email'),
    emailRule('Email is incorrect'),
  ];

  useEffect(() => {
    setValid(
      [email].every((control) => control.touched && !control.errors.length),
    );
  }, [email]);

  const emailChangeHandler = ({ value, errors }: IAppControlData) => {
    setEmail({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const resetEmail = (): void => {
    resetUserEmail(email.value);
    setEmail(initialControl());
  };

  return (
    <Auth componentType={'resetPassword'}>
      <div>
        <AppInput
          placeholder="Email Address"
          value={email.value}
          errors={email.errors}
          onChange={emailChangeHandler}
          rules={emailRules}
        />

        <AppButton
          onClick={resetEmail}
          full
          disabled={!valid}
          className="tw-mt-8"
          twPadding="tw-p-4"
        >
          Send email
        </AppButton>
      </div>
    </Auth>
  );
};

export default PanelResetPassword;
