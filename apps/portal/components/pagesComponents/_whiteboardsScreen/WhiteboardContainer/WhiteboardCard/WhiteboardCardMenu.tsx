import { FC } from 'react';
import classNames from 'classnames';
import { Menu, Dropdown, Button } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import {
  whiteboardCardMenuItemsTrash,
  whiteboardCardMenuItems,
  EWhiteboardCardMenuItems,
  IMenuItem,
  removeFromFavoritesMenuItem,
} from '../whiteboardCardMenuItems';
import optionsIcon from 'public/whiteboards/options.svg';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';

interface IProps {
  isTrash: boolean;
  favorite: boolean;
  whiteboard: IWhiteboard;
  handleMenuItemClick: (item: IMenuItem, whiteboard: IWhiteboard) => void;
}

const WhiteboardCardMenu: FC<IProps> = ({
  isTrash,
  favorite,
  whiteboard,
  handleMenuItemClick,
}) => {
  let menuItems = isTrash
    ? whiteboardCardMenuItemsTrash
    : whiteboardCardMenuItems;

  if (favorite) {
    menuItems = menuItems.map((item) => {
      if (item.title === EWhiteboardCardMenuItems.FAVORITES_ADD) {
        return removeFromFavoritesMenuItem;
      }

      return item;
    });
  }

  const menu = (
    <Menu className="tw-w-210px">
      {menuItems.map((item) => {
        return (
          <Menu.Item
            key={item.id}
            onClick={() => handleMenuItemClick(item, whiteboard)}
            className={classNames(
              item.id === 2 || item.id === 6
                ? 'tw-border-b tw-border-iron-grey'
                : '',
              'tw-text-grey-dark2 hover:tw-text-whiteboard-purple',
            )}
          >
            {item.title === 'Open in new tab' ? (
              <a
                target="_blank"
                href={`/whiteboard/${whiteboard.id}`}
                className="tw-flex tw-items-center tw-gap-2"
                rel="noreferrer"
              >
                <AppSvg size="24px" path={item.icon.src} /> {item.title}
              </a>
            ) : (
              <div className="tw-flex tw-items-center tw-gap-2">
                <AppSvg size="24px" path={item.icon.src} /> {item.title}
              </div>
            )}
          </Menu.Item>
        );
      })}
    </Menu>
  );

  return (
    <Dropdown
      overlay={menu}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
      trigger={['click']}
    >
      <Button
        className="!tw-border-0 !tw-m-0 !tw-p-0 "
        icon={
          <AppSvg
            className="tw-transition-all tw-text-wb-grey hover:tw-text-grey-dark2"
            size="27px"
            path={optionsIcon.src}
          />
        }
      ></Button>
    </Dropdown>
  );
};

export default WhiteboardCardMenu;
