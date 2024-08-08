import { preRoutes } from 'components/_routes';
import { ISettingsMenuItem, settingsMenuItems } from './menuItems';

const activeImage = (router): string => {
  const currentItem: ISettingsMenuItem | undefined = settingsMenuItems.find(
    (item) => preRoutes.settings + item.route === router.pathname,
  );

  return `/settings/${currentItem ? currentItem.imgName : 'profile.svg'}`;
};

export default activeImage;
