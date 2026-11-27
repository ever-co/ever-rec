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

// A hairline under the last row of a group. Drawn as a pseudo-element in the gap below the row,
// so it stays straight under the row's rounded hover ground.
const GROUP_END =
  '[&.ant-dropdown-menu-item]:tw-mb-2 after:tw-absolute after:-tw-inset-x-1 after:-tw-bottom-1 after:tw-h-px after:tw-bg-border';

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
      {menuItems.map((item, index) => {
        // The one row that cannot be undone reads as a delete row.
        const rowColor =
          item.title === EWhiteboardCardMenuItems.REMOVE_FOREVER
            ? 'tw-text-destructive-text'
            : '';
        const iconColor = rowColor ? '' : 'tw-text-muted-foreground';
        const endsGroup =
          (item.id === 2 || item.id === 6) && index < menuItems.length - 1;

        return (
          <Menu.Item
            key={item.id}
            onClick={() => handleMenuItemClick(item, whiteboard)}
            className={classNames(endsGroup ? GROUP_END : '')}
          >
            {item.title === 'Open in new tab' ? (
              <a
                target="_blank"
                href={`/whiteboard/${whiteboard.id}`}
                className="tw-flex tw-items-center tw-gap-2 tw-text-inherit hover:tw-text-inherit"
                rel="noreferrer"
              >
                <AppSvg
                  size="16px"
                  path={item.icon.src}
                  className={iconColor}
                />{' '}
                {item.title}
              </a>
            ) : (
              <div
                className={classNames(
                  'tw-flex tw-items-center tw-gap-2',
                  rowColor,
                )}
              >
                <AppSvg
                  size="16px"
                  path={item.icon.src}
                  className={iconColor}
                />{' '}
                {item.title}
              </div>
            )}
          </Menu.Item>
        );
      })}
    </Menu>
  );

  return (
    <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
      <Button
        type="text"
        // The size is set here: a rule for the page's own dropdown trigger (antd.scss,
        // `.whiteboards .ant-dropdown-trigger`) would otherwise stretch and pad this button.
        style={{ width: 32, height: 32, margin: 0, padding: 0 }}
        icon={
          <AppSvg
            className="tw-flex tw-size-full tw-items-center tw-justify-center tw-text-muted-foreground tw-transition-colors tw-duration-150 [.ant-btn:hover_&]:tw-text-foreground [.ant-dropdown-open_&]:tw-text-foreground"
            size="20px"
            path={optionsIcon.src}
          />
        }
      ></Button>
    </Dropdown>
  );
};

export default WhiteboardCardMenu;
