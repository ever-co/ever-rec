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
      <div className="tw-w-96">
        <AppHeader part1="Sign" part2="In" className="tw-mb-8" />
        <p>{t('page.install.pinnedDescription')}</p>
        {/*<SignFlow />*/}
      </div>
    </div>
  );
};

export default InstallSign;
