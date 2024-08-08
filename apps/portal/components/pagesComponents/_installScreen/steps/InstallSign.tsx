import AppHeader from 'components/elements/AppHeader';
import React, { useEffect } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import { IStepProps } from './steps';
import { IUser } from 'app/interfaces/IUserData';

const InstallSign: React.FC<IStepProps> = ({ nextStep }) => {
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);

  useEffect(() => {
    user && nextStep();
  }, [user]);

  return (
    <div className="tw-w-full">
      <div className="tw-w-96">
        <AppHeader part1="Sign" part2="In" className="tw-mb-8" />
        <p>
          Thanks for adding our extension! To get the most out of this
          service,&nbsp; staying signed-in is strongly recommended! Keep
          screenshots synced across devices.&nbsp; Access and share them
          anywhere, anytime.
        </p>
        {/*<SignFlow />*/}
      </div>
    </div>
  );
};

export default InstallSign;
