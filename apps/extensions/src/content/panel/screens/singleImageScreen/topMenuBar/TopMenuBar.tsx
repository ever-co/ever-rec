import { FC } from 'react';
import classNames from 'classnames';
import 'clipboard-polyfill/overwrite-globals';
import Logo from '@/content/components/elements/Logo';
import AppContainer from '@/content/components/containers/appContainer/AppContainer';
import UserShortInfo from '@/content/panel/components/containers/dashboardLayout/elements/UserShortInfo';
import { panelRoutes, RouteName } from '@/content/panel/router/panelRoutes';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppSvg from '@/content/components/elements/AppSvg';
import { IUser } from '@/app/interfaces/IUserData';
import { useTranslation } from 'react-i18next';

interface ITopMenuBarProps {
  user: IUser;
  fromPage?: RouteName;
  blockBack?: boolean;
}

const TopMenuBar: FC<ITopMenuBarProps> = ({
  user,
  fromPage = 'image',
  blockBack = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const goToPage = () => {
    if (blockBack) return;

    const fromPageParams = searchParams.get('fromPage');

    if (fromPageParams === 'imagesShared') {
      return navigate(`${panelRoutes.imagesShared.path}`);
    }
    if (fromPageParams === 'workspace') {
      return navigate(-1);
    }

    switch (fromPage) {
      case 'image':
        navigate(`${panelRoutes.images.path}`);
        break;
      case 'video':
        navigate(`${panelRoutes.videos.path}`);
        break;
      case 'workspace':
        navigate(-1);
        break;
      default:
        navigate(`${panelRoutes.images.path}`);
        break;
    }
  };

  return (
    <AppContainer
      isHeader={true}
      className="tw-flex tw-justify-between tw-h-20 tw-items-center tw-shadow-app-blocks"
    >
      <Logo className="tw-w-40" onClick={goToPage} />
      <div className="tw-flex tw-items-center">
        <div
          onClick={goToPage}
          className={classNames(
            'tw-flex tw-cursor-pointer tw-font-semibold tw-text-sm tw-mr-8',
            blockBack && 'tw-opacity-70 tw-cursor-not-allowed',
          )}
        >
          <AppSvg
            path="images/panel/common/arrow_back-light.svg"
            size="20px"
            className="tw-mr-2"
          />
          {t('navigation.back')}
        </div>
        <UserShortInfo
          user={user}
          hideInfo
          avaSize={50}
          disableGoToProfile={blockBack}
        />
      </div>
    </AppContainer>
  );
};

export default TopMenuBar;
