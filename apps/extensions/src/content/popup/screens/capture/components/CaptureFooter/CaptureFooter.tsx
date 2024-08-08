import browser from '@/app/utilities/browser';
import { FC, ReactElement } from 'react';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import CaptureFooterMenuItem from './CaptureFooterMenuItem/CaptureFooterMenuItem';
import AppSvg from '@/content/components/elements/AppSvg';

export interface ICaptureFooterItem {
  title: string;
  description: string;
  placement: string;
  icon: ReactElement;
  handler: () => void;
}

const CaptureFooter: FC = () => {
  const clickVideoHandler = () => {
    browser.tabs.create({
      url: panelRoutes.videos.path,
    });
  };

  const clickImagesHandler = () => {
    browser.tabs.create({
      url: panelRoutes.images.path,
    });
  };

  const clickIntegrationsHandler = () => {
    browser.tabs.create({
      url: panelRoutes.integrations.path,
    });
  };

  const clickSharedHandler = () => {
    browser.tabs.create({
      url: panelRoutes.imagesShared.path,
    });
  };

  const clickProfileHandler = () => {
    browser.tabs.create({
      url: panelRoutes.profile.path,
    });
  };

  /* Old Settings page button and actions
   const clickPreferencesHandler = () => {
     browser.tabs.create({
       url: panelRoutes.preferences.path,
     });
   };
   {
     title: 'Settings',
     icon: (
       <AppSvg
         path="images/popup/navigation/preferences.svg"
         size="20px"
         className="tw-text-primary-purple"
       />
     ),
     handler: clickPreferencesHandler,
     description: 'Choose your preferred settings for saving items.',
     placement: 'top',
   },
   */

  const captureFooterMenu: ICaptureFooterItem[] = [
    {
      title: 'Images',
      icon: (
        <AppSvg
          path="images/popup/navigation/myimages.svg"
          size="20px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickImagesHandler,
      description:
        'Allows you to store, organize, manage, and distribute images.',
      placement: 'topRight',
    },
    {
      title: 'Videos',
      icon: (
        <AppSvg
          path="images/popup/navigation/videoss.svg"
          size="22px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickVideoHandler,
      description:
        'Allows you to store, organize, manage, and distribute videos.',
      placement: 'topLeft',
    },
    {
      title: 'Integrations',
      icon: (
        <AppSvg
          path="images/popup/navigation/preferences.svg"
          size="20px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickIntegrationsHandler,
      description: 'Connect to your favorite third-party tools.',
      placement: 'top',
    },
    {
      title: 'Shared',
      icon: (
        <AppSvg
          path="images/popup/navigation/shared.svg"
          size="22px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickSharedHandler,
      description: 'Files and folders you have shared with others.',
      placement: 'topLeft',
    },
    {
      title: 'Profile',
      icon: (
        <AppSvg
          path="images/popup/navigation/profile.svg"
          size="22px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickProfileHandler,
      description: 'Change your username and profile image.',
      placement: 'topRight',
    },
  ];

  return (
    <div className="tw-flex tw-justify-around tw-mt-2.5 tw-items-end">
      {captureFooterMenu.map((item, index) => {
        return (
          <CaptureFooterMenuItem
            key={`footer_item_${index}`}
            item={item}
            icon={item.icon}
            itemClicked={item.handler}
          />
        );
      })}
    </div>
  );
};

export default CaptureFooter;
