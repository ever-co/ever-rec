import React from 'react';
import Logo from 'components/elements/Logo';
import AppContainer from 'components/containers/appContainer/AppContainer';
import UserShortInfo from 'components/containers/dashboardLayout/elements/UserShortInfo/UserShortInfo';
import { panelRoutes, preRoutes } from 'components/_routes';
import { BiArrowBack } from 'react-icons/bi';
import { useRouter } from 'next/router';
import { IUser } from '../../../../app/interfaces/IUserData';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();

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
      className="tw-flex tw-h-14 tw-items-center tw-justify-between tw-bg-background"
    >
      <Logo className="tw-w-28" onClick={goToPage} />
      <div className="tw-flex tw-items-center">
        <div
          className="tw-me-3 tw-flex tw-h-9 tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-px-3 tw-text-sm tw-font-medium tw-text-foreground tw-transition-colors tw-duration-150 hover:tw-bg-accent"
          onClick={
            user
              ? () => goToPage()
              : () => goToPageUnauthenticated(customParameter)
          }
        >
          <BiArrowBack
            size={16}
            className="tw-text-muted-foreground rtl:-tw-scale-x-100"
          />
          {user ? t('navigation.back') : t('common.login')}
        </div>
        <UserShortInfo user={user} hideInfo avaSize={40} publicPage={false} />
      </div>
    </AppContainer>
  );
};

export default TopMenuBar;
