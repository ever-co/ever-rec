import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import IAppControl from 'app/interfaces/IAppControl';
import { emailRule, passwordPatternRule, requiredRule } from 'app/rules';
import AppButton from 'components/controls/AppButton';
import { getRequiredTerms, register } from 'app/services/auth';
import { ITermsAcceptanceDocument } from 'app/interfaces/ITermsAcceptance';
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
import { useTranslation } from 'react-i18next';

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

  /**
   * The legal documents this signup must accept, as published by the API.
   *
   * The TOS checkbox used to be a bare boolean that gated `valid` and went no
   * further — `submitHandler` called `register(email, password, username)` and
   * never referenced it again. These carry the identity of the exact text shown
   * next to the checkbox (document id, version, sha256, locale), which is what
   * the acceptance record is pinned to.
   */
  const [termsDocuments, setTermsDocuments] = useState<
    ITermsAcceptanceDocument[]
  >([]);
  const [termsLoaded, setTermsLoaded] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    getRequiredTerms().then((documents) => {
      if (cancelled) return;
      setTermsDocuments(documents);
      setTermsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setValid(
      [email, password, passwordConfirm].every(
        (control) => control.touched && !control.errors.length,
      ) &&
        TOS &&
        // Nothing to pin an acceptance to means nothing truthful to record, so
        // the form refuses rather than creating an account with no evidence.
        termsDocuments.length > 0,
    );
  }, [email, password, passwordConfirm, TOS, termsDocuments]);

  const emailRules: ((v: string) => boolean | string)[] = [
    requiredRule(t('page.auth.error.enterEmail')),
    emailRule(t('page.auth.error.emailCorrect')),
  ];

  const passwordRules: ((v: string) => boolean | string)[] = [
    passwordPatternRule(t('page.auth.error.minimumLength')),
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
      errors:
        value !== passwordConfirm.value
          ? [t('page.auth.error.passwordNotMatch')]
          : [],
    });
    setPassword({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  const passwordConfirmChangeHandler = ({ value }: AppInputType) => {
    const errArr: string[] = [];
    value !== password.value &&
      errArr.push(t('page.auth.error.passwordNotMatch'));
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
      // The fourth argument is the whole point of this change: the tick used to
      // stop at `valid`, and the account was created with no record that
      // anything had been accepted. The server re-checks every claim against
      // the published corpus before it becomes a row.
      const result = await register(
        email.value,
        password.value,
        username,
        termsDocuments.map(({ documentId, version, sha256, locale }) => ({
          documentId,
          version,
          sha256,
          locale,
        })),
      );
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
          placeholder={t('page.register.fields.fullName')}
          autoComplete="new-password"
          inputClass="tw-placeholder-mid-grey"
          onChange={usernameChangeHandler}
        />

        <AppInput
          value={email.value}
          placeholder={t('page.auth.common.email')}
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
            placeholder={t('page.auth.common.password')}
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
            placeholder={t('page.auth.common.confirmPassword')}
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
          {/*
            Disabled until the published documents are in hand. Ticking a box
            whose acceptance cannot be recorded is the appearance of consent
            with none of the evidence — which is what this used to be.
          */}
          {/* @ts-ignore */}
          <Checkbox
            checked={TOS}
            disabled={!termsLoaded || termsDocuments.length === 0}
            onChange={() => setTOS((prevTos) => !prevTos)}
          />
          <p>
            {t('page.register.terms.agree')}
            <a
              className="tw-underline tw-text-primary-purple"
              href="https://rec.com/tos"
              target="_blank"
              rel="noreferrer"
            >
              {t('page.register.terms.terms')}
            </a>
            {t('page.register.terms.and')}
            <a
              className="tw-underline tw-text-primary-purple"
              href="https://rec.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              {t('page.register.terms.privacy')}
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
            {t('page.register.title')}
          </AppButton>
        </div>

        <p className="tw-my-8 tw-font-medium tw-text-center">
          {t('page.register.continueOptions.title')}
        </p>

        <AppSpinner show={registering} />
      </div>
    </Auth>
  );
};

export default PanelRegister;
