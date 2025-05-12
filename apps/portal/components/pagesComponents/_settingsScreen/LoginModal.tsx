import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import IAppControl, { IAppControlData } from 'app/interfaces/IAppControl';
import { requiredRule } from 'app/rules';
import AppInput from 'components/controls/AppInput';
import GoogleBtn from 'components/pagesComponents/_signScreen/GoogleBtn';
import { login } from '../../../app/services/auth';
import { IUser, IUserData } from '../../../app/interfaces/IUserData';
import { errorHandler } from '../../../app/services/helpers/errors';
import { IDataResponse } from 'app/interfaces/IApiResponse';
import AppSvg from 'components/elements/AppSvg';
import jwt_decode from 'jwt-decode';
import { useTranslation } from 'react-i18next';

export interface ILoginModalOkProps {
  email: string;
  password: string;
}

interface ILoginModalProps {
  visible: boolean;
  onClose: () => void;
  onOk: (props?: ILoginModalOkProps) => void;
  user?: IUser;
  onDelete?: boolean;
}

const LoginModal: React.FC<ILoginModalProps> = ({
  visible,
  onClose,
  onOk,
  user,
  onDelete,
}) => {
  const initialControl = (): IAppControl => ({
    value: '',
    errors: [],
    touched: true,
  });
  const [password, setPassword] = useState<IAppControl>(initialControl());
  const [valid, setValid] = useState<boolean>(false);
  const [shouldHaveGoogleLogin, setShouldHaveGoogleLogin] = useState(false);

  const { t } = useTranslation();
  const passwordChangeHandler = ({ value, errors }: IAppControlData) => {
    setPassword({
      value,
      errors: errors || [],
      touched: true,
    });
  };

  useEffect(() => {
    setValid(
      [password].every((control) => control.touched && !control.errors.length),
    );
  }, [password]);

  useEffect(() => {
    if (user) {
      setShouldHaveGoogleLogin(user.provider === 'google.com');
    }
  }, [user]);

  const passwordRules: ((v: string) => boolean | string)[] = [
    requiredRule('Please enter a password'),
  ];

  const onLoginHandler = async (): Promise<void> => {
    let response: IDataResponse | null = null;
    let reAuthorizedUser: IUserData | null = null;
    let isSameUser: boolean | null = null;

    if (valid && user) {
      response = await login(user.email, password.value);
      reAuthorizedUser = {
        ...response.data,
      };
      isSameUser = reAuthorizedUser?.id === user.id;
    }

    if (reAuthorizedUser && isSameUser) {
      try {
        setPassword(initialControl());
        onOk();
      } catch (error: any) {
        console.log(error);
      }
    } else {
      errorHandler({ message: t('toasts.wrongCredentials') });
      onClose();
    }
  };

  const googleLogin = async (credentials: any) => {
    const decodedCreds = jwt_decode<any>(credentials.credential);

    if (decodedCreds?.email !== user?.email) {
      errorHandler({ message: t('toasts.accountsNotSame') });
      return;
    }

    if (valid) {
      try {
        setPassword(initialControl());
        onOk();
      } catch (error: any) {
        console.log(error);
      }
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      closeIcon={
        <AppSvg path="/images/close-icon.svg" className="modalCloseButton" />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          {!shouldHaveGoogleLogin &&
            (onDelete ? (
              <AppButton
                onClick={onOk}
                className="tw-pt-2 tw-text-white tw-bg-danger tw-border tw-border-danger tw-border-solid"
                disabled={!valid}
                bgColor="tw-bg-danger"
              >
                {t('page.setting.deleteAccount')}
              </AppButton>
            ) : (
              <AppButton
                onClick={onLoginHandler}
                className="tw-px-10"
                disabled={!valid}
              >
                {t('common.confirm')}
              </AppButton>
            ))}
          {shouldHaveGoogleLogin && (
            <div className="tw-text-center tw-mb-3 tw-w-full tw-mt-5">
              <GoogleBtn onSuccess={googleLogin} />
            </div>
          )}
        </div>
      }
    >
      <div className="tw-mb-30px">
        {!onDelete ? (
          <h2 className="tw-mb-8 tw-text-2xl tw-font-bold">
            {t('page.setting.reEnterCredentials')}
          </h2>
        ) : !shouldHaveGoogleLogin ? (
          <h2 className="tw-mb-8 tw-text-2xl tw-font-bold">
            {t('page.setting.passwordBeforeRemove')}
          </h2>
        ) : (
          <h2 className="tw-mb-8 tw-text-2xl tw-font-bold">
            {t('page.setting.accountToBeRemoved')}
          </h2>
        )}
      </div>
      {!shouldHaveGoogleLogin && (
        <div>
          <AppInput
            placeholder={t('page.profile.deleteAccountModal.enterPassword')}
            type="password"
            value={password.value}
            errors={password.errors}
            onChange={passwordChangeHandler}
            rules={passwordRules}
            inputClass="tw-bg-transparent tw-border-mid-grey tw-placeholder-black"
          />
        </div>
      )}
    </Modal>
  );
};

export default LoginModal;
