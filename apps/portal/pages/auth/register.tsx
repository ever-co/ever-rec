import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import IAppControl from 'app/interfaces/IAppControl';
import { emailRule, passwordPatternRule, requiredRule } from 'app/rules';
import AppButton from 'components/controls/AppButton';
import { register } from 'app/services/auth';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import AppInput, { AppInputType } from 'components/controls/AppInput';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import Auth from '.';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import redirect from 'misc/redirect';
import PasswordEye from 'components/pagesComponents/_signScreen/PasswordEye';

const defaultInput: IAppControl = {
  value: '',
  errors: [],
  touched: false,
};

const PanelRegister: React.FC = () => {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(defaultInput);
  const [password, setPassword] = useState(defaultInput);
  const [passwordConfirm, setPasswordConfirm] = useState(defaultInput);
  const [passwordShown, setPasswordShown] = useState(false);
  const [TOS, setTOS] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    setValid(
      [email, password, passwordConfirm].every(
        (control) => control.touched && !control.errors.length,
      ) && TOS,
    );
  }, [email, password, passwordConfirm, TOS]);

  const emailRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter an email'),
    emailRule('Email is incorrect'),
  ];

  const passwordRules: ((v: string) => boolean | string)[] = [
    passwordPatternRule('Minimum eight characters and at least one number'),
  ];

  const usernameChangeHandler = async ({ value }: AppInputType) => {
    setUsername(value);
  };

  const emailChangeHandler = ({ value, errors }: AppInputType) => {
    setEmail({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const passwordChangeHandler = async ({ value, errors }: AppInputType) => {
    setPasswordConfirm({
      ...passwordConfirm,
      errors: value !== passwordConfirm.value ? ['Passwords do not match'] : [],
    });
    setPassword({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const passwordConfirmChangeHandler = ({ value }: AppInputType) => {
    const errArr: string[] = [];
    value !== password.value && errArr.push('Passwords do not match');
    setPasswordConfirm({
      value,
      errors: errArr,
      touched: true,
    });
  };

  const togglePassword = () => {
    setPasswordShown(!passwordShown);
  };

  const submitHandler = async (): Promise<void> => {
    setRegistering(true);

    if (valid) {
      const id = loadingMessage();
      const result = await register(email.value, password.value, username);
      updateMessage(id, result.message, result.status);
      if (result.status == 'success') {
        redirect(router);
      }
    }

    setRegistering(false);
    setEmail(defaultInput);
    setPassword(defaultInput);
    setPasswordConfirm(defaultInput);
    setUsername('');
  };

  return (
    <Auth componentType="register">
      <div className="tw-flex tw-flex-col">
        <AppInput
          value={username}
          placeholder="Full name"
          autoComplete="new-password"
          inputClass="tw-placeholder-mid-grey"
          onChange={usernameChangeHandler}
        />

        <AppInput
          value={email.value}
          placeholder="Email Address"
          autoComplete="new-password"
          className="tw-mt-2"
          inputClass="tw-placeholder-mid-grey"
          rules={emailRules}
          errors={email.errors}
          onChange={emailChangeHandler}
        />

        <div className="tw-flex tw-justify-between tw-items-center tw-border-b tw-border-black">
          <AppInput
            value={password.value}
            placeholder="Password"
            autoComplete="new-password"
            className="tw-w-full"
            inputClass="tw-placeholder-mid-grey tw-border-b-0 tw-mt-4"
            errorClass="tw-mt-2"
            type={passwordShown ? 'text' : 'password'}
            rules={passwordRules}
            errors={password.errors}
            onChange={passwordChangeHandler}
          />
          <PasswordEye
            className="tw-mt-5"
            passwordShown={passwordShown}
            togglePassword={togglePassword}
          />
        </div>

        <div className="tw-flex tw-justify-between tw-items-center tw-border-b tw-border-black">
          <AppInput
            value={passwordConfirm.value}
            type={passwordShown ? 'text' : 'password'}
            placeholder="Confirm Password"
            className="tw-w-full tw-mt-4"
            inputClass="tw-placeholder-mid-grey tw-border-b-0 tw-mt-4"
            errors={passwordConfirm.errors}
            onChange={passwordConfirmChangeHandler}
          />
          <PasswordEye
            className="tw-mt-8"
            passwordShown={passwordShown}
            togglePassword={togglePassword}
          />
        </div>

        <div className="tw-flex tw-mt-10 tw-gap-4">
          {/* @ts-ignore */}
          <Checkbox
            checked={TOS}
            onChange={() => setTOS((prevTos) => !prevTos)}
          />
          <p>
            {'Agree to '}
            <a
              className="tw-underline tw-text-primary-purple"
              href="https://rec.com/tos"
              target="_blank"
              rel="noreferrer"
            >
              Terms & Conditions
            </a>
            {' and '}
            <a
              className="tw-underline tw-text-primary-purple"
              href="https://rec.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy
            </a>
          </p>
        </div>

        <div className="tw-flex tw-justify-end">
          <AppButton
            full
            disabled={!valid}
            className="tw-mt-8"
            twPadding="tw-p-4"
            onClick={submitHandler}
          >
            Register
          </AppButton>
        </div>

        <p className="tw-my-8 tw-font-medium tw-text-center">
          Or continue with
        </p>

        <AppSpinner show={registering} />
      </div>
    </Auth>
  );
};

export default PanelRegister;
