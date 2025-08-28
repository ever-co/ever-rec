import { panelRoutes, preRoutes } from 'components/_routes';
import AppSvg from 'components/elements/AppSvg';
import IPageMenuItems from 'app/interfaces/IPageMenuItems';
import { useTranslation } from 'react-i18next';

type MenuItemTypeId =
  | 'whiteboards'
  | 'images'
  | 'videos'
  | 'shared'
  | 'trashed'
  | 'integrations'
  | 'favFolders'
  | 'back'
  | 'profile'
  | 'company-profile'
  | 'company-members'
  | 'company-teams';

export interface IMainMenuItem extends IPageMenuItems {
  type: MenuItemTypeId;
}

export interface ISettingsMenuItem extends IMainMenuItem {
  imgName: string;
}

export const useMenuItems = () => {
  const { t } = useTranslation();
  const mainMenuItems: IMainMenuItem[] = [
    {
      type: 'images',
      // title: 'My Images',
      title: t('navigation.myImages'),
      route: preRoutes.media + panelRoutes.images,
      icon: <AppSvg path="/sidebar/new/library.svg" size="18px" />,
    },
    {
      type: 'videos',
      //title: 'My Videos',
      title: t('navigation.myVideos'),
      route: preRoutes.media + panelRoutes.videos,
      icon: <AppSvg path="/sidebar/new/videos.svg" size="20px" />,
    },
    {
      type: 'shared',
      //title: 'Shared by me',
      title: t('navigation.sharedByMe'),
      route: preRoutes.media + panelRoutes.shared,
      icon: <AppSvg path="/sidebar/new/shared.svg" size="20px" />,
    },
    {
      type: 'favFolders',
      //title: 'Starred',
      title: t('navigation.starred'),
      route: preRoutes.media + panelRoutes.favorites,
      icon: <AppSvg path="/sidebar/new/starred.svg" size="20px" />,
    },
    {
      type: 'integrations',
      //title: 'Integrations',
      title: t('navigation.integrations'),
      route: preRoutes.media + panelRoutes.integrations,
      icon: <AppSvg path="/sidebar/new/integrations.svg" size="18px" />,
    },
    {
      type: 'trashed',
      //title: 'Bin',
      title: t('navigation.bin'),
      route: preRoutes.media + panelRoutes.trashed,
      icon: <AppSvg path="/sidebar/new/bin.svg" size="18px" />,
    },
  ];
  const settingsMenuItems: ISettingsMenuItem[] = [
    {
      type: 'back',
      //title: 'Back',
      title: t('navigation.back'),
      route: preRoutes.media + panelRoutes.images,
      icon: <AppSvg path="/common/arrow_back-light.svg" size="20px" />,
      imgName: '',
    },
    {
      type: 'profile',
      //title: 'Profile settings',
      title: t('navigation.profileSettings'),
      route: preRoutes.settings + panelRoutes.profile,
      icon: (
        <AppSvg path="/settings/profile/profile-settings.svg" size="20px" />
      ),
      imgName: 'profile.svg',
    },
  ];
  const getWorkspaceSettingsMenuItems = (workspaceId: string) => {
    const workspaceSettingsMenuItems: IMainMenuItem[] = [
      {
        type: 'back',
        //title: 'Back',
        title: t('navigation.back'),
        route: preRoutes.media + panelRoutes.getWorkspaceMain(workspaceId),
        isWorkspaceRoute: true,
        icon: <AppSvg path="/common/arrow_back-light.svg" size="20px" />,
      },
      {
        type: 'company-profile',
        //title: 'Company Profile',
        title: t('navigation.companyProfile'),
        route: preRoutes.media + panelRoutes.getWorkspaceSettings(workspaceId),
        isWorkspaceRoute: true,
        icon: <AppSvg path="/sidebar/new/company-profile.svg" size="20px" />,
      },
      // {
      //   type: 'company-members',
      //   title: 'Members',
      //   route: preRoutes.media + panelRoutes.getWorkspaceMembers(workspaceId),
      //   isWorkspaceRoute: true,
      //   icon: <AppSvg path="/sidebar/new/shared.svg" size="20px" />,
      // },
      // {
      //   type: 'company-teams',
      //   title: 'Teams',
      //   route: preRoutes.media + panelRoutes.getWorkspaceTeams(workspaceId),
      //   isWorkspaceRoute: true,
      //   icon: <AppSvg path="/common/teams-icon.svg" size="20px" />,
      // },
    ];

    return workspaceSettingsMenuItems;
  };
  return {
    mainMenuItems,
    settingsMenuItems,
    getWorkspaceSettingsMenuItems,
  };
};
