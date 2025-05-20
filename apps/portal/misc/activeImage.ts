import { preRoutes } from 'components/_routes';
import { ISettingsMenuItem } from './menuItems';
import { NextRouter } from 'next/router';

const activeImage = (
  router: NextRouter,
  settingsMenuItems: ISettingsMenuItem[],
): string => {
  const currentItem: ISettingsMenuItem | undefined = settingsMenuItems.find(
    (item) => preRoutes.settings + item.route === router.pathname,
  );

  return `/settings/${currentItem ? currentItem.imgName : 'profile.svg'}`;
};

export default activeImage;
