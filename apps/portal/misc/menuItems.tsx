import { panelRoutes, preRoutes } from 'components/_routes';
import {
  ArrowLeft,
  Blocks,
  Building2,
  Image as ImageIcon,
  Layers,
  Share2,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
  Video,
} from 'lucide-react';
import IPageMenuItems from 'app/interfaces/IPageMenuItems';
import { useTranslation } from 'react-i18next';
import useEverPlatformAvailable from 'hooks/useEverPlatformAvailable';

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
  | 'preferences'
  | 'ever-platform'
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
  const everPlatformAvailable = useEverPlatformAvailable();
  const mainMenuItems: IMainMenuItem[] = [
    {
      type: 'images',
      // title: 'My Images',
      title: t('navigation.myImages'),
      route: preRoutes.media + panelRoutes.images,
      icon: <ImageIcon />,
    },
    {
      type: 'videos',
      //title: 'My Videos',
      title: t('navigation.myVideos'),
      route: preRoutes.media + panelRoutes.videos,
      icon: <Video />,
    },
    {
      type: 'shared',
      //title: 'Shared by me',
      title: t('navigation.sharedByMe'),
      route: preRoutes.media + panelRoutes.shared,
      icon: <Share2 />,
    },
    {
      type: 'favFolders',
      //title: 'Starred',
      title: t('navigation.starred'),
      route: preRoutes.media + panelRoutes.favorites,
      icon: <Star />,
    },
    {
      type: 'integrations',
      //title: 'Integrations',
      title: t('navigation.integrations'),
      route: preRoutes.media + panelRoutes.integrations,
      icon: <Blocks />,
    },
    {
      type: 'trashed',
      //title: 'Bin',
      title: t('navigation.bin'),
      route: preRoutes.media + panelRoutes.trashed,
      icon: <Trash2 />,
    },
  ];
  const settingsMenuItems: ISettingsMenuItem[] = [
    {
      type: 'back',
      title: t('shell.backToApp'),
      route: preRoutes.media + panelRoutes.images,
      icon: <ArrowLeft className="rtl:tw-rotate-180" />,
      imgName: '',
    },
    {
      type: 'profile',
      //title: 'Profile settings',
      title: t('navigation.profileSettings'),
      route: preRoutes.settings + panelRoutes.profile,
      icon: <UserRound />,
      imgName: 'profile.svg',
    },
    {
      type: 'preferences',
      title: t('page.preference.preferences'),
      route: preRoutes.settings + panelRoutes.preferences,
      icon: <SlidersHorizontal />,
      imgName: '',
    },
  ];
  // Shown to the operator of the installation only, when the API has the statistics loaded.
  if (everPlatformAvailable) {
    settingsMenuItems.push({
      type: 'ever-platform',
      title: t('navigation.everPlatform'),
      route: preRoutes.settings + panelRoutes.everPlatform,
      icon: <Layers />,
      imgName: '',
    });
  }
  const getWorkspaceSettingsMenuItems = (workspaceId: string) => {
    const workspaceSettingsMenuItems: IMainMenuItem[] = [
      {
        type: 'back',
        title: t('shell.backToApp'),
        route: preRoutes.media + panelRoutes.getWorkspaceMain(workspaceId),
        isWorkspaceRoute: true,
        icon: <ArrowLeft className="rtl:tw-rotate-180" />,
      },
      {
        type: 'company-profile',
        //title: 'Company Profile',
        title: t('navigation.companyProfile'),
        route: preRoutes.media + panelRoutes.getWorkspaceSettings(workspaceId),
        isWorkspaceRoute: true,
        icon: <Building2 />,
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
