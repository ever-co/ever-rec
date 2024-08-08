import IPageMenuItems from '@/app/interfaces/IPageMenuItems';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import AppSvg from '@/content/components/elements/AppSvg';

type MenuItemTypeId =
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

export const mainMenuItems: IMainMenuItem[] = [
  {
    type: 'images',
    title: 'My Images',
    route: panelRoutes.images.path,
    icon: <AppSvg path="images/panel/sidebar/new/library.svg" size="18px" />,
  },
  {
    type: 'videos',
    title: 'My Videos',
    route: panelRoutes.videos.path,
    icon: <AppSvg path="images/panel/sidebar/new/videos.svg" size="20px" />,
  },
  {
    type: 'shared',
    title: 'Shared by me',
    route: panelRoutes.imagesShared.path,
    icon: <AppSvg path="images/panel/sidebar/new/shared.svg" size="20px" />,
  },
  {
    type: 'favFolders',
    title: 'Starred',
    route: '',
    icon: <AppSvg path="images/panel/sidebar/new/starred.svg" size="20px" />,
  },
  {
    type: 'integrations',
    title: 'Integrations',
    route: panelRoutes.integrations.path,
    icon: (
      <AppSvg path="images/panel/sidebar/new/integrations.svg" size="18px" />
    ),
  },
  {
    type: 'trashed',
    title: 'Bin',
    route: panelRoutes.imagesTrashed.path,
    icon: <AppSvg path="images/panel/sidebar/new/bin.svg" size="18px" />,
  },
];

export const settingsMenuItems: IMainMenuItem[] = [
  {
    type: 'back',
    title: 'Back',
    route: panelRoutes.images.path,
    icon: (
      <AppSvg path="images/panel/common/arrow_back-light.svg" size="20px" />
    ),
    imgName: '',
  },
  {
    type: 'profile',
    title: 'Profile settings',
    route: panelRoutes.profile.path,
    icon: (
      <AppSvg
        path="images/panel/settings/profile/profile-settings.svg"
        size="20px"
      />
    ),
    imgName: 'profile.svg',
  },
];

export const getWorkspaceSettingsMenuItems = (workspaceId: string) => {
  const workspaceSettingsMenuItems: IMainMenuItem[] = [
    {
      type: 'back',
      title: 'Back',
      route: `${panelRoutes.workspace.path}?workspaceId=${workspaceId}`,
      isWorkspaceRoute: true,
      icon: (
        <AppSvg path="images/panel/common/arrow_back-light.svg" size="20px" />
      ),
    },
    {
      type: 'company-profile',
      title: 'Company Profile',
      route: `${panelRoutes.workspaceSettings.path}?workspaceId=${workspaceId}`,
      isWorkspaceRoute: true,
      icon: (
        <AppSvg
          path="images/panel/sidebar/new/company-profile.svg"
          size="20px"
        />
      ),
    },
    // {
    //   type: 'company-members',
    //   title: 'Members',
    //   route: preRoutes.media + panelRoutes.getWorkspaceMembers(workspaceId),
    // isWorkspaceRoute: true,
    //   icon: <AppSvg path="/sidebar/new/shared.svg" size="20px" />,
    // },
    // {
    //   type: 'company-teams',
    //   title: 'Teams',
    //   route: preRoutes.media + panelRoutes.getWorkspaceTeams(workspaceId),
    //    isWorkspaceRoute: true,
    //   icon: <AppSvg path="/common/teams-icon.svg" size="20px" />,
    // },
  ];

  return workspaceSettingsMenuItems;
};
