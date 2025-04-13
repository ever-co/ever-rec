import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import PanelAC from '../../app/store/panel/actions/PanelAC';
import redirect from 'misc/redirect';
import Auth from '.';
import { login, signOut } from '../../app/services/auth';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import { emailRule, requiredRule } from 'app/rules';
import AppButton from 'components/controls/AppButton';
import AppInput from 'components/controls/AppInput';
import AppLink from 'components/controls/AppLink';
import PasswordEye from 'components/pagesComponents/_signScreen/PasswordEye';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';

const defaultInput: IAppControl = {
  value: '',
  errors: [],
  touched: false,
};

const PanelLogin: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [email, setEmail] = useState(defaultInput);
  const [password, setPassword] = useState(defaultInput);
  const [valid, setValid] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail({ value: savedEmail, errors: [], touched: true });
      setRememberMe(true);
    }
  }, []);

  const emailRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter an email'),
    emailRule('Email is incorrect'),
  ];

  const passwordRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter a password'),
  ];

  useEffect(() => {
    if (!router.isReady) return;

    const { signedOut } = router.query;
    if (signedOut === 'true') {
      signOut();
      dispatch(PanelAC.resetWorkspaces());
    }
  }, [dispatch, router.isReady, router.query]);

  useEffect(() => {
    setValid(
      [email, password].every(
        (control) => control.touched && !control.errors.length,
      ),
    );
  }, [email, password]);

  const emailChangeHandler = ({ value, errors }: IAppControlData) => {
    setEmail({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const passwordChangeHandler = ({ value, errors }: IAppControlData) => {
    setPassword({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      submitHandler();
    }
  };

  const togglePassword = () => {
    setPasswordShown(!passwordShown);
  };

  // Updated the event handler to use CheckboxChangeEvent
  const handleRememberMeChange = (e: CheckboxChangeEvent) => {
    setRememberMe(e.target.checked);
  };

  const submitHandler = async (): Promise<void> => {
    if (!valid) return;

    const id = loadingMessage();
    const result = await login(email.value, password.value);

    if (result.status == 'success') {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email.value);
      } else {
        localStorage.removeItem('rememberedEmail');
        console.log('Email removed from localStorage');
      }

      if (router.query && router.query.type == 'slack') {
        router.push(`/integration/slack`);
      } else {
        redirect(router);
      }
      const { ext } = router.query;
      !ext && updateMessage(id, result.message, result.status);
    } else {
      updateMessage(id, result.message, 'error');
    }
  };

  return (
    <Auth componentType="login">
      <div>
        <AppInput
          value={email.value}
          placeholder="Email Address"
          inputClass="tw-placeholder-mid-grey"
          errors={email.errors}
          rules={emailRules}
          onChange={emailChangeHandler}
          onKeyDown={handleInputKeyDown}
        />

        <div className="tw-flex tw-justify-between tw-items-center tw-border-b tw-border-black">
          <AppInput
            value={password.value}
            type={passwordShown ? 'text' : 'password'}
            placeholder="Password"
            className="tw-w-full tw-mt-2"
            inputClass="tw-placeholder-mid-grey tw-border-b-0 tw-mt-4"
            errors={password.errors}
            rules={passwordRules}
            onChange={passwordChangeHandler}
            onKeyDown={handleInputKeyDown}
          />
          <PasswordEye
            className="tw-mt-6"
            togglePassword={togglePassword}
            passwordShown={passwordShown}
          />
        </div>

        <div className="tw-flex tw-justify-between tw-items-center tw-mt-8">
          <div className="tw-flex tw-gap-2 !tw-text-sm">
            <Checkbox checked={rememberMe} onChange={handleRememberMeChange} />
            <p>Remember me</p>
          </div>
          <AppLink
            className="tw-text-overlay-black !tw-font-extralight !tw-text-sm"
            onClick={() => router.push(`/auth/reset`)}
          >
            Forgot Password?
          </AppLink>
        </div>

        <AppButton
          full
          disabled={!valid}
          className="tw-mt-10"
          twPadding="tw-p-4"
          onClick={submitHandler}
        >
          Sign in with email
        </AppButton>
      </div>
    </Auth>
  );
};

export default PanelLogin;
