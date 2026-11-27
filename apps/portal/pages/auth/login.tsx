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
import { useTranslation } from 'react-i18next';

const defaultInput: IAppControl = {
  value: '',
  errors: [],
  touched: false,
};

const PanelLogin: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
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
    requiredRule(t('page.auth.error.enterEmail')),
    emailRule(t('page.auth.error.emailCorrect')),
  ];

  const passwordRules: ((v: string) => boolean | string)[] = [
    requiredRule(t('page.auth.error.enterPassword')),
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
          placeholder={t('page.auth.common.email')}
          errors={email.errors}
          rules={emailRules}
          onChange={emailChangeHandler}
          onKeyDown={handleInputKeyDown}
        />

        {/* The eye sits inside the field's right end. */}
        <div className="tw-mt-2 tw-flex tw-items-center">
          <AppInput
            value={password.value}
            type={passwordShown ? 'text' : 'password'}
            placeholder={t('page.auth.common.password')}
            className="tw-w-full"
            inputClass="tw-pr-10"
            errors={password.errors}
            rules={passwordRules}
            onChange={passwordChangeHandler}
            onKeyDown={handleInputKeyDown}
          />
          <PasswordEye
            className="tw-relative tw-right-2"
            togglePassword={togglePassword}
            passwordShown={passwordShown}
          />
        </div>

        <div className="tw-mt-4 tw-flex tw-items-center tw-justify-between tw-gap-4">
          <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-foreground">
            <Checkbox checked={rememberMe} onChange={handleRememberMeChange} />
            <p className="tw-m-0"> {t('page.auth.login.rememberMe')}</p>
          </div>
          <AppLink
            className="tw-text-sm"
            onClick={() => router.push(`/auth/reset`)}
          >
            {t('page.auth.login.forgotPassword')}
          </AppLink>
        </div>

        <AppButton
          full
          disabled={!valid}
          className="tw-mt-6 tw-flex tw-h-10 tw-items-center tw-justify-center"
          twPadding="tw-px-4"
          onClick={submitHandler}
        >
          {t('page.auth.login.signInWithEmail')}
        </AppButton>
      </div>
    </Auth>
  );
};

export default PanelLogin;
