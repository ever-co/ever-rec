import { preRoutes } from 'components/_routes';
import { ISettingsMenuItem } from './menuItems';

const activeImage = (
  router: any,
  settingsMenuItems: ISettingsMenuItem[],
): string => {
  const currentItem: ISettingsMenuItem | undefined = settingsMenuItems.find(
    (item) => preRoutes.settings + item.route === router.pathname,
  );

  return `/settings/${currentItem ? currentItem.imgName : 'profile.svg'}`;
};

export default activeImage;
