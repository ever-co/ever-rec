import browser from '@/app/utilities/browser';
import { FC, ReactElement } from 'react';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import CaptureFooterMenuItem from './CaptureFooterMenuItem/CaptureFooterMenuItem';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

export interface ICaptureFooterItem {
  title: string;
  description: string;
  placement: string;
  icon: ReactElement;
  handler: () => void;
}

const CaptureFooter: FC = () => {
  const { t } = useTranslation();
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
      title: t('common.images'),
      icon: (
        <AppSvg
          path="images/popup/navigation/myimages.svg"
          size="20px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickImagesHandler,
      description: t('ext.capture.allowStore'),
      placement: 'topRight',
    },
    {
      title: t('common.videos'),
      icon: (
        <AppSvg
          path="images/popup/navigation/videoss.svg"
          size="22px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickVideoHandler,
      description: t('ext.capture.allowStore'),
      placement: 'topLeft',
    },
    {
      title: t('navigation.integrations'),
      icon: (
        <AppSvg
          path="images/popup/navigation/preferences.svg"
          size="20px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickIntegrationsHandler,
      description: t('ext.capture.connectThirdParty'),
      placement: 'top',
    },
    {
      title: t('shared.shared'),
      icon: (
        <AppSvg
          path="images/popup/navigation/shared.svg"
          size="22px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickSharedHandler,
      description: t('ext.capture.filesFolderShared'),
      placement: 'topLeft',
    },
    {
      title: t('sidebar.profile'),
      icon: (
        <AppSvg
          path="images/popup/navigation/profile.svg"
          size="22px"
          className="tw-text-primary-purple"
        />
      ),
      handler: clickProfileHandler,
      description: t('ext.capture.changeUsernameProfile'),
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
