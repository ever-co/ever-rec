import IAppControl from 'app/interfaces/IAppControl';
import { passwordPatternRule } from 'app/rules';
import { newPassword, verifyPasswordResetCode } from 'app/services/auth';
import {
  infoMessage,
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import AppButton from 'components/controls/AppButton';
import AppInput, { AppInputType } from 'components/controls/AppInput';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Auth from '.';
import { useTranslation } from 'react-i18next';

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { oobCode, apiKey } = context.query;

  if (oobCode && typeof oobCode === 'string') {
    const response = await verifyPasswordResetCode(oobCode);
    if (response.status == 'success') {
      return { props: { veryfied: true } };
    } else {
      return { props: { veryfied: false } };
    }
  }
  return {
    props: {},
  };
};

interface IPanelNewPasswordProps {
  veryfied: boolean;
}

const PanelNewPassword: React.FC<IPanelNewPasswordProps> = ({ veryfied }) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: false,
  });
  const router = useRouter();
  const [password, setPassword] = useState<IAppControl>(initialControl());
  const [passwordConfirm, setPasswordConfirm] =
    useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);

  const { t } = useTranslation();
  const passwordRules: ((v: string) => boolean | string)[] = [
    passwordPatternRule(t('page.auth.error.minimumLength')),
  ];

  useEffect(() => {
    setValid(
      [password, passwordConfirm].every(
        (control) =>
          control.touched &&
          !control.errors.length &&
          password.value != '' &&
          passwordConfirm.value != '',
      ),
    );
  }, [password, passwordConfirm]);

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

  useEffect(() => {
    if (!veryfied) infoMessage('');
  }, [veryfied]);

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

  const setNewPasswordHandler = async () => {
    const { oobCode } = router.query;
    if (typeof oobCode === 'string') {
      const id = loadingMessage();
      const response = await newPassword(oobCode, password.value);
      setPassword(initialControl());
      setPasswordConfirm(initialControl());

      updateMessage(id, response.message, response.status);
      if (response.status == 'success') {
        router.push('/auth/login');
      }
    }
  };

  return (
    <Auth componentType={'newResetPassword'}>
      {veryfied ? (
        <div>
          <AppInput
            placeholder={t('page.auth.newPassword.newPassword')}
            type="password"
            rules={passwordRules}
            errors={password.errors}
            value={password.value}
            onChange={passwordChangeHandler}
            className="tw-mt-4"
          />

          <AppInput
            placeholder={t('page.auth.newPassword.newPasswordConfirm')}
            type="password"
            errors={passwordConfirm.errors}
            value={passwordConfirm.value}
            onChange={passwordConfirmChangeHandler}
            className="tw-mt-4"
          />

          <AppButton
            onClick={setNewPasswordHandler}
            full
            disabled={!valid}
            className="tw-mt-8"
            twPadding="tw-p-4"
          >
            {t('page.auth.newPassword.setNewPassword')}
          </AppButton>
        </div>
      ) : (
        <div>
          <p className="tw-mb-6 tw-text-sm">
            {t('page.auth.error.resetLinkExpired')}
            <br />
            {t('page.auth.error.pleaseTryAgain')}
          </p>

          <AppButton
            onClick={() => {
              router.push('/auth/login');
            }}
            full
            className="tw-mt-8"
            twPadding="tw-p-4"
          >
            {t('page.auth.error.backToLogin')}
          </AppButton>
        </div>
      )}
    </Auth>
  );
};

export default PanelNewPassword;
