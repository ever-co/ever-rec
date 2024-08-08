import React from 'react';
import Logo from 'components/elements/Logo';
import AppContainer from 'components/containers/appContainer/AppContainer';
import UserShortInfo from 'components/containers/dashboardLayout/elements/UserShortInfo/UserShortInfo';
import { panelRoutes, preRoutes } from 'components/_routes';
import { BiArrowBack } from 'react-icons/bi';
import { useRouter } from 'next/router';
import { IUser } from '../../../../app/interfaces/IUserData';

interface ITopMenuBarProps {
  user: IUser;
  fromPage?: any;
  customParameter?: string;
}

const TopMenuBar: React.FC<ITopMenuBarProps> = ({
  user,
  fromPage = 'image',
  customParameter = '',
}) => {
  const router = useRouter();

  const goToPage = () => {
    const { fromPage: fromPageQuery } = router.query;

    if (fromPageQuery === 'shared') {
      return router.push(preRoutes.media + panelRoutes.shared);
    }
    if (fromPageQuery === 'workspace') {
      return router.back();
    }

    switch (fromPage) {
      case 'image':
        router.push(preRoutes.media + panelRoutes.images);
        break;
      case 'video':
        router.push(preRoutes.media + panelRoutes.videos);
        break;
      default:
        router.push(preRoutes.media + panelRoutes.images);
        break;
    }
  };

  const goToPageUnauthenticated = (parameter?: string) => {
    let param = '';

    if (parameter) {
      param = '?' + parameter;
    }

    // Setting parameter for redirect function in redirect.ts
    router.push(preRoutes.auth + panelRoutes.login + param);
  };

  return (
    <AppContainer
      isHeader={true}
      className="tw-flex tw-justify-between tw-h-20 tw-items-center tw-shadow-app-blocks"
    >
      <Logo className="tw-w-40" onClick={goToPage} />
      <div className="tw-flex tw-items-center">
        <div
          className="tw-flex tw-cursor-pointer tw-font-semibold tw-text-sm tw-mr-8"
          onClick={
            user
              ? () => goToPage()
              : () => goToPageUnauthenticated(customParameter)
          }
        >
          <BiArrowBack size={20} className="tw-mr-2" />
          {user ? 'Back' : 'Login'}
        </div>
        <UserShortInfo user={user} hideInfo avaSize={50} publicPage={false} />
      </div>
    </AppContainer>
  );
};

export default TopMenuBar;
