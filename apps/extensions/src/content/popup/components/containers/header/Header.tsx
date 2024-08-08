import { ReactElement, useEffect, useState } from 'react';
import browser from '@/app/utilities/browser';
import { RootStateOrAny, useSelector } from 'react-redux';
import { IUser } from '@/app/interfaces/IUserData';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { AppMessagesEnum } from '@/app/messagess';
import Logo from '@/content/components/elements/Logo';
import UserShortInfoPopup from '../../UserShortInfoPopup';
import AppSvg from '@/content/components/elements/AppSvg';
import MenuItem from './MenuItem';

export interface IMenuItem {
  title: string;
  showTitle?: boolean;
  icon: ReactElement;
  active?: boolean;
  private: boolean;
  hideAuthenticated?: boolean;
  handler: () => void;
}

const Header: React.FC = () => {
  const currentUser: IUser = useSelector(
    (state: RootStateOrAny) => state.auth.user,
  );

  const signInHandler = () => {
    sendRuntimeMessage({
      action: AppMessagesEnum.createLoginTabSW,
      payload: { justInstalled: false },
    });
  };

  const signOutHandler = () => {
    sendRuntimeMessage({
      action: AppMessagesEnum.createLoginTabSW,
      payload: { signedOut: true },
    });
  };

  const menu: IMenuItem[] = [
    {
      title: 'Sign In',
      showTitle: true,
      icon: (
        <AppSvg
          path="images/panel/sign/login.svg"
          size="19px"
          className="tw-text-primary-purple"
        />
      ),
      private: false,
      hideAuthenticated: true,
      handler: signInHandler,
    },
    {
      title: 'Sign Out',
      icon: (
        <AppSvg
          path="images/panel/sign/logout.svg"
          size="19px"
          className="tw-text-primary-purple"
        />
      ),
      private: true,
      handler: signOutHandler,
    },
    // {
    //   title: 'More',
    //   icon: <FiMoreVertical size="22px" />,
    //   private: false,
    //   handler: () => {}, // TODO open menu
    // },
  ];

  const [calculatedMenu, setMenu] = useState([...menu]);

  useEffect(() => {
    setMenu(allowMenuItems());
  }, [currentUser]);

  const allowMenuItems = (): IMenuItem[] => {
    return menu.filter((item: IMenuItem) => {
      return (!currentUser && item.private) ||
        (!!currentUser && item.hideAuthenticated)
        ? false
        : true;
    });
  };

  const openDashboard = () => {
    browser.tabs.create({
      url: panelRoutes.images.path,
    });
  };

  return (
    <div className="tw-flex tw-items-center tw-px-5 tw-pt-3 tw-pb-2">
      <Logo className="tw-w-32" onClick={openDashboard} />
      <div className="tw-flex-1 tw-flex tw-justify-end tw-items-center">
        {currentUser && (
          <UserShortInfoPopup user={currentUser} avaSize={22} showInfoSmall />
        )}
        {calculatedMenu.map((item, index) => {
          return (
            <MenuItem
              key={`menu_item_${index}`}
              item={item}
              title={item.title}
              showTitle={item?.showTitle}
              onItemSelect={item.handler}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Header;
