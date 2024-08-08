import { useEffect, useState } from 'react';
import IAppControl from '@/app/interfaces/IAppControl';
import { emailRule, requiredRule } from '@/app/rules';
import { resetUserEmail } from '@/app/services/auth';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppInput from '@/content/components/controls/appInput/AppInput';
import { AuthScreenType } from './AuthScreen';

interface ILoginProps {
  changeAuthScreen: (screen: AuthScreenType) => void;
}

const ResetEmail: React.FC<ILoginProps> = ({ changeAuthScreen }) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });

  const [email, setEmail] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);

  useEffect(() => {
    setValid(
      [email].every((control) => control.touched && !control.errors.length),
    );
  }, [email]);

  const emailRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter email'),
    emailRule('Email is incorrect'),
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

  const resetEmail = (): void => {
    resetUserEmail(email.value);
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
      <div className="tw-flex tw-justify-center tw-mb-4 tw-w-full">
        <AppButton
          onClick={resetEmail}
          bgColor="tw-bg-primary"
          className="tw-mr-3"
          disabled={!valid}
        >
          {/* <MdEmail className="tw-mr-2" /> */}
          Send email
        </AppButton>
      </div>
      <div className="tw-flex tw-justify-center">
        <AppButton
          onClick={() => changeScreenHandler(AuthScreenType.login)}
          bgColor="tw-bg-primary"
          outlined
          className="tw-mr-5"
        >
          {/* <MdLogin className="tw-mr-2" /> */}
          To Login
        </AppButton>
        <AppButton
          onClick={() => changeScreenHandler(AuthScreenType.register)}
          bgColor="tw-bg-secondary"
          outlined
        >
          {/* <MdHowToReg className="tw-mr-2" /> */}
          To Register
        </AppButton>
      </div>
    </div>
  );
};

export default ResetEmail;
