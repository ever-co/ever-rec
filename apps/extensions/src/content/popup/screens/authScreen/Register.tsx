import IAppControl from '@/app/interfaces/IAppControl';
import { emailRule, passwordPatternRule, requiredRule } from '@/app/rules';
import { createUserWithCreds } from '@/app/services/auth';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppInput from '@/content/components/controls/appInput/AppInput';
import React, { useEffect, useState } from 'react';
import { AuthScreenType } from './AuthScreen';

interface IRegisterProps {
  changeAuthScreen: (screen: AuthScreenType) => void;
}

const Register: React.FC<IRegisterProps> = ({ changeAuthScreen }) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const [email, setEmail] = useState<IAppControl>(initialControl());
  const [password, setPassword] = useState<IAppControl>(initialControl());
  const [passwordConfirm, setPasswordConfirm] = useState<IAppControl>(
    initialControl(),
  );
  const [valid, setValid] = useState<boolean>(false);

  useEffect(() => {
    setValid(
      [email, password, passwordConfirm].every(
        (control) => control.touched && !control.errors.length,
      ),
    );
  }, [email, password, passwordConfirm]);

  const emailRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter email'),
    emailRule('Email is incorrect'),
  ];

  const passwordRules: ((v: string) => boolean | string)[] = [
    passwordPatternRule('Minimum eight characters and at least one number'),
  ];

  const emailChangeHandler = ({
    value,
    errors,
  }: {
    value: string;
    errors?: string[];
  }) => {
    setEmail({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const passwordChangeHandler = async ({
    value,
    errors,
  }: {
    value: string;
    errors?: string[];
  }) => {
    setPasswordConfirm({
      ...passwordConfirm,
      errors: value !== passwordConfirm.value ? ['Passwords not mutch'] : [],
    });
    await setPassword({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const passwordConfirmChangeHandler = ({ value }: { value: string }) => {
    const errArr: string[] = [];
    value !== password.value && errArr.push('Passwords not mutch');
    setPasswordConfirm({
      value,
      errors: errArr,
      touched: true,
    });
  };

  const register = (): void => {
    createUserWithCreds({ email: email.value, password: password.value });
    setEmail(initialControl());
    setPassword(initialControl());
    setPasswordConfirm(initialControl());
  };

  const changeScreenHandler = (): void => {
    changeAuthScreen(AuthScreenType.login);
  };

  return (
    <div className="tw-flex tw-flex-col tw-items-end">
      <AppInput
        label="Email"
        rules={emailRules}
        errors={email.errors}
        value={email.value}
        onChange={emailChangeHandler}
        inputContainerClass="tw-w-44"
      />
      <AppInput
        label="Password"
        type="password"
        rules={passwordRules}
        errors={password.errors}
        value={password.value}
        onChange={passwordChangeHandler}
        inputContainerClass="tw-w-44"
      />

      <AppInput
        label="Password Confirm"
        type="password"
        errors={passwordConfirm.errors}
        value={passwordConfirm.value}
        onChange={passwordConfirmChangeHandler}
        inputContainerClass="tw-w-44"
      />

      <div className="tw-flex tw-justify-end">
        <AppButton
          onClick={register}
          bgColor="tw-bg-primary"
          className="tw-mr-3"
          disabled={!valid}
        >
          Register
        </AppButton>
        <AppButton
          onClick={changeScreenHandler}
          bgColor="tw-bg-secondary"
          outlined
        >
          I already have account
        </AppButton>
      </div>
    </div>
  );
};

export default Register;
