import IPageMenuItems from '@/app/interfaces/IPageMenuItems';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

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
export const useMenuItems = () => {
  const { t } = useTranslation();
  const mainMenuItems: IMainMenuItem[] = [
    {
      type: 'images',
      title: t('navigation.myImages'),
      route: panelRoutes.images.path,
      icon: <AppSvg path="images/panel/sidebar/new/library.svg" size="18px" />,
    },
    {
      type: 'videos',
      title: t('navigation.myVideos'),
      route: panelRoutes.videos.path,
      icon: <AppSvg path="images/panel/sidebar/new/videos.svg" size="20px" />,
    },
    {
      type: 'shared',
      title: t('navigation.sharedByMe'),
      route: panelRoutes.imagesShared.path,
      icon: <AppSvg path="images/panel/sidebar/new/shared.svg" size="20px" />,
    },
    {
      type: 'favFolders',
      title: t('navigation.favorites'),
      route: panelRoutes.favorites.path,
      icon: <AppSvg path="images/panel/sidebar/new/starred.svg" size="20px" />,
    },
    {
      type: 'integrations',
      title: t('navigation.integrations'),
      route: panelRoutes.integrations.path,
      icon: (
        <AppSvg path="images/panel/sidebar/new/integrations.svg" size="18px" />
      ),
    },
    {
      type: 'trashed',
      title: t('navigation.bin'),
      route: panelRoutes.imagesTrashed.path,
      icon: <AppSvg path="images/panel/sidebar/new/bin.svg" size="18px" />,
    },
  ];
  const settingsMenuItems: IMainMenuItem[] = [
    {
      type: 'back',
      title: t('navigation.back'),
      route: panelRoutes.images.path,
      icon: (
        <AppSvg path="images/panel/common/arrow_back-light.svg" size="20px" />
      ),
      imgName: '',
    },
    {
      type: 'profile',
      title: t('navigation.profileSettings'),
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

  const getWorkspaceSettingsMenuItems = (workspaceId: string) => {
    const workspaceSettingsMenuItems: IMainMenuItem[] = [
      {
        type: 'back',
        title: t('navigation.back'),
        route: `${panelRoutes.workspace.path}?workspaceId=${workspaceId}`,
        isWorkspaceRoute: true,
        icon: (
          <AppSvg path="images/panel/common/arrow_back-light.svg" size="20px" />
        ),
      },
      {
        type: 'company-profile',
        title: t('navigation.companyProfile'),
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

  return {
    mainMenuItems,
    settingsMenuItems,
    getWorkspaceSettingsMenuItems,
  };
};
