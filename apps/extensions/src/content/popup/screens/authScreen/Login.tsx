import { useEffect, useState } from 'react';
import { emailRule, requiredRule } from '@/app/rules';
import { signinUserWithCreds } from '@/app/services/auth';
import { AuthScreenType } from './AuthScreen';
import IAppControl from '@/app/interfaces/IAppControl';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppInput from '@/content/components/controls/appInput/AppInput';

interface ILoginProps {
  changeAuthScreen: (screen: AuthScreenType) => void;
}

const Login: React.FC<ILoginProps> = ({ changeAuthScreen }) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const [email, setEmail] = useState<IAppControl>(initialControl());
  const [password, setPassword] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);

  useEffect(() => {
    setValid(
      [email, password].every(
        (control) => control.touched && !control.errors.length,
      ),
    );
  }, [email, password]);

  const emailRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter email'),
    emailRule('Email is incorrect'),
  ];

  const passwordRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter pasword'),
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

  const passwordChangeHandler = ({
    value,
    errors,
  }: {
    value: string;
    errors?: string[];
  }) => {
    setPassword({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const login = (): void => {
    signinUserWithCreds({ email: email.value, password: password.value });
    setEmail(initialControl());
    setPassword(initialControl());
  };

  const changeScreenHandler = (screen: AuthScreenType): void => {
    changeAuthScreen(screen);
  };

  return (
    <div className="tw-flex tw-flex-col tw-items-end">
      <AppInput
        label="Email"
        rules={emailRules}
        value={email.value}
        errors={email.errors}
        onChange={emailChangeHandler}
      />
      <AppInput
        label="Password"
        type="password"
        rules={passwordRules}
        value={password.value}
        errors={password.errors}
        onChange={passwordChangeHandler}
      />
      <div className="tw-flex tw-justify-center tw-mb-4 tw-w-full">
        <AppButton onClick={login} bgColor="tw-bg-primary" disabled={!valid}>
          Login
        </AppButton>
      </div>
      <div className="tw-flex tw-justify-center">
        <AppButton
          onClick={() => changeScreenHandler(AuthScreenType.register)}
          bgColor="tw-bg-primary"
          outlined
          className="tw-mr-3"
        >
          {"I don't have account"}
        </AppButton>
        <AppButton
          onClick={() => changeScreenHandler(AuthScreenType.reset)}
          bgColor="tw-bg-secondary"
          outlined
        >
          I fogot my password
        </AppButton>
      </div>
    </div>
  );
};

export default Login;
