import { FC, useState } from 'react';
import { useRouter } from 'next/router';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ChevronDown, PanelLeft, X } from 'lucide-react';
import SidebarMenuItem from '../elements/SidebarMenuItems/SidebarMenuItem';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import UploadWorkspaceImageModal from 'components/pagesComponents/_imagesScreen/components/uploadWorkspaceImageModal/UploadWorkspaceImageModal';
import PanelAC from '../../../../app/store/panel/actions/PanelAC';
import { getExplorerData } from 'app/services/screenshots';
import { getExplorerDataVideo } from 'app/services/videos';
import { IMainMenuItem, useMenuItems } from 'misc/menuItems';
import { cn } from 'app/utilities/cn';
import SidebarBrand from 'components/shell/SidebarBrand';
import WorkspaceSwitcher from 'components/shell/WorkspaceSwitcher';
import StarredFolders from 'components/shell/StarredFolders';
import UserBlock from 'components/shell/UserBlock';
import { useShell } from 'components/shell/ShellContext';
import { Hint } from 'components/ui/tooltip';

interface IProps {
  isProfilePage?: boolean;
  isWorkspaceSettingsPage?: boolean;
  /** Drawn inside the phone drawer: always expanded, whatever the desktop choice is. */
  inDrawer?: boolean;
  /** In the drawer, the header's button closes the drawer instead of collapsing the sidebar. */
  onCloseDrawer?: () => void;
  /** Opens the "add workspace" dialog, which the layout owns. */
  onAddWorkspace: () => void;
}

/**
 * The app sidebar (shared Ever shell, A1/A2/A6): the Ever mark and the workspace switcher in its
 * header, the navigation, and the person's block at its foot.
 */
const Sidebar: FC<IProps> = ({
  isProfilePage,
  isWorkspaceSettingsPage,
  inDrawer = false,
  onCloseDrawer,
  onAddWorkspace,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const shell = useShell();
  const collapsed = inDrawer ? false : shell.collapsed;
  const { mainMenuItems, getWorkspaceSettingsMenuItems, settingsMenuItems } =
    useMenuItems();
  const explorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const [showStarredFolders, setShowStarredFolders] = useState(false);
  const [showWorkspaceImageModal] = useState(false); //? not fully implemented
  const [loaderState, setLoaderState] = useState(false);

  const sidebarItemClicked = async (item: any) => {
    // Reset active workspace on each route except workspace routes and starred folders UI
    if (item.type !== 'favFolders' && !item?.isWorkspaceRoute) {
      dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: null } as any));
    }

    // Lets bring him back to root folder on My Images/My Videos click to avoid issues with favorite folders navigations
    if (item.type === 'images') {
      // We are already in root folder
      if (!explorerData.currentFolder) return;

      setLoaderState(true);
      await getExplorerData(false);
      setLoaderState(false);
    }

    if (item.type === 'videos') {
      if (!explorerDataVideos.currentFolder) return;

      setLoaderState(true);
      await getExplorerDataVideo(false);
      setLoaderState(false);
    }
  };

  const isActive = (item: IMainMenuItem) => {
    if (item.type === 'back') return false;

    return router.asPath.includes(item.route);
  };

  const menuItems: IMainMenuItem[] = isWorkspaceSettingsPage
    ? getWorkspaceSettingsMenuItems(router.query.workspaceId as string)
    : isProfilePage
      ? [...settingsMenuItems]
      : [...mainMenuItems];
  // Not memoised: the handler has to see the folder that is open now, not the one at first render.
  const createClickHandler = (item: IMainMenuItem) => () => {
    void sidebarItemClicked(item);
  };

  const isSettings = isProfilePage || isWorkspaceSettingsPage;
  const backItem = isSettings
    ? menuItems.find((item) => item.type === 'back')
    : undefined;
  const navItems = menuItems.filter((item) => item !== backItem);
  const collapseLabel = collapsed
    ? t('shell.expandSidebar')
    : t('shell.collapseSidebar');

  const headerButtonClass =
    'tw-flex tw-size-7 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-md tw-bg-transparent tw-text-muted-foreground tw-outline-none tw-transition-colors tw-duration-150 hover:tw-bg-sidebar-accent hover:tw-text-sidebar-accent-foreground focus-visible:tw-ring-2 focus-visible:tw-ring-ring';
  const collapseButton = inDrawer ? (
    <button
      type="button"
      aria-label={t('shell.closeNavigation')}
      onClick={onCloseDrawer}
      className={headerButtonClass}
    >
      <X className="tw-size-4" aria-hidden="true" />
    </button>
  ) : (
    <Hint label={collapseLabel} side={collapsed ? 'right' : 'bottom'}>
      <button
        type="button"
        aria-label={collapseLabel}
        aria-expanded={!collapsed}
        onClick={shell.toggleCollapsed}
        className={headerButtonClass}
      >
        <PanelLeft className="tw-size-4 rtl:tw-rotate-180" aria-hidden="true" />
      </button>
    </Hint>
  );

  return (
    <aside
      className={cn(
        'tw-flex tw-h-full tw-shrink-0 tw-flex-col tw-bg-sidebar tw-text-sidebar-foreground',
        inDrawer ? 'tw-w-full' : collapsed ? 'tw-w-16' : 'tw-w-60',
      )}
    >
      <div
        className={cn(
          'tw-flex tw-shrink-0 tw-items-center tw-gap-0.5',
          collapsed ? 'tw-flex-col tw-px-3 tw-pb-1 tw-pt-3' : 'tw-h-16 tw-px-3',
        )}
      >
        <SidebarBrand className={collapsed ? 'tw-size-10' : undefined} />
        <WorkspaceSwitcher
          collapsed={collapsed}
          onAddWorkspace={onAddWorkspace}
        />
        {collapseButton}
      </div>

      <nav
        aria-label={
          isWorkspaceSettingsPage
            ? t('sidebar.administration')
            : isProfilePage
              ? t('shell.account')
              : undefined
        }
        className={cn(
          'tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-0.5 tw-overflow-y-auto tw-py-2',
          collapsed ? 'tw-items-center tw-px-3' : 'tw-px-3',
        )}
      >
        {backItem && (
          <>
            <SidebarMenuItem
              href={backItem.route}
              icon={backItem.icon}
              title={backItem.title}
              active={false}
              collapsed={collapsed}
              onClick={createClickHandler(backItem)}
            />
            {!collapsed && (
              <div className="tw-px-2.5 tw-pb-2 tw-pt-6 tw-text-xs tw-text-muted-foreground">
                {isProfilePage
                  ? t('shell.account')
                  : t('sidebar.administration')}
              </div>
            )}
          </>
        )}

        {navItems.map((item) => {
          const isStarred = item.type === 'favFolders';
          const starredLabel = showStarredFolders
            ? t('shell.hideStarredFolders')
            : t('shell.showStarredFolders');

          return (
            <div
              key={item.route}
              className={collapsed ? undefined : 'tw-w-full'}
            >
              <SidebarMenuItem
                href={item.route}
                icon={item.icon}
                title={item.title}
                active={isActive(item)}
                collapsed={collapsed}
                onClick={createClickHandler(item)}
                trailing={
                  isStarred ? (
                    // Beside the link, not inside it: the chevron only opens the list.
                    <button
                      type="button"
                      aria-label={starredLabel}
                      aria-expanded={showStarredFolders}
                      onClick={() => setShowStarredFolders((open) => !open)}
                      className="tw-mr-1.5 tw-flex tw-size-6 tw-shrink-0 tw-items-center tw-justify-center tw-rounded tw-bg-transparent tw-text-muted-foreground tw-outline-none hover:tw-text-foreground focus-visible:tw-ring-2 focus-visible:tw-ring-ring"
                    >
                      <ChevronDown
                        className={cn(
                          'tw-size-4 tw-transition-transform tw-duration-150',
                          showStarredFolders && 'tw-rotate-180',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  ) : undefined
                }
              />
              {isStarred && showStarredFolders && !collapsed && (
                <StarredFolders />
              )}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          'tw-shrink-0 tw-border-0 tw-border-t tw-border-solid tw-border-sidebar-border tw-p-3',
          collapsed && 'tw-flex tw-justify-center',
        )}
      >
        <UserBlock collapsed={collapsed} />
      </div>

      <UploadWorkspaceImageModal
        onOk={() => void 0}
        onClose={() => void 0}
        visible={showWorkspaceImageModal}
      />

      <AppSpinner show={loaderState} />
    </aside>
  );
};

export default Sidebar;
