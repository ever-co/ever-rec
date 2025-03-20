import { panelRoutes, preRoutes } from 'components/_routes';
import AppSvg from 'components/elements/AppSvg';
import IPageMenuItems from 'app/interfaces/IPageMenuItems';

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

export const mainMenuItems: IMainMenuItem[] = [
  {
    type: 'images',
    title: 'My Images',
    route: preRoutes.media + panelRoutes.images,
    icon: <AppSvg path="/sidebar/new/library.svg" size="18px" />,
  },
  {
    type: 'videos',
    title: 'My Videos',
    route: preRoutes.media + panelRoutes.videos,
    icon: <AppSvg path="/sidebar/new/videos.svg" size="20px" />,
  },
  {
    type: 'shared',
    title: 'Shared by me',
    route: preRoutes.media + panelRoutes.shared,
    icon: <AppSvg path="/sidebar/new/shared.svg" size="20px" />,
  },
  {
    type: 'favFolders',
    title: 'Favorites',
    route: preRoutes.media + panelRoutes.favorites,
    icon: <AppSvg path="/sidebar/new/starred.svg" size="20px" />,
  },
  {
    type: 'integrations',
    title: 'Integrations',
    route: preRoutes.media + panelRoutes.integrations,
    icon: <AppSvg path="/sidebar/new/integrations.svg" size="18px" />,
  },
  {
    type: 'trashed',
    title: 'Bin',
    route: preRoutes.media + panelRoutes.trashed,
    icon: <AppSvg path="/sidebar/new/bin.svg" size="18px" />,
  },
];

export const settingsMenuItems: ISettingsMenuItem[] = [
  {
    type: 'back',
    title: 'Back',
    route: preRoutes.media + panelRoutes.images,
    icon: <AppSvg path="/common/arrow_back-light.svg" size="20px" />,
    imgName: '',
  },
  {
    type: 'profile',
    title: 'Profile settings',
    route: preRoutes.settings + panelRoutes.profile,
    icon: <AppSvg path="/settings/profile/profile-settings.svg" size="20px" />,
    imgName: 'profile.svg',
  },
];

export const getWorkspaceSettingsMenuItems = (workspaceId: string) => {
  const workspaceSettingsMenuItems: IMainMenuItem[] = [
    {
      type: 'back',
      title: 'Back',
      route: preRoutes.media + panelRoutes.getWorkspaceMain(workspaceId),
      isWorkspaceRoute: true,
      icon: <AppSvg path="/common/arrow_back-light.svg" size="20px" />,
    },
    {
      type: 'company-profile',
      title: 'Company Profile',
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
