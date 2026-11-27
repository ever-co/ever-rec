import AppHeader from 'components/elements/AppHeader';
import React, { useEffect } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import { IStepProps } from './steps';
import { IUser } from 'app/interfaces/IUserData';
import { useTranslation } from 'react-i18next';

const InstallSign: React.FC<IStepProps> = ({ nextStep }) => {
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const { t } = useTranslation();

  useEffect(() => {
    user && nextStep();
  }, [user]);

  return (
    <div className="tw-w-full">
      <div className="tw-w-full">
        <AppHeader
          part1={t('page.auth.common.sign')}
          part2={t('page.auth.common.in')}
          textSize="2xl"
          className="tw-mb-2"
        />
        <p className="tw-m-0 tw-text-sm tw-text-muted-foreground">
          {t('page.install.pinnedDescription')}
        </p>
        {/*<SignFlow />*/}
      </div>
    </div>
  );
};

export default InstallSign;
