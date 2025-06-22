import { FC, useCallback, useRef, useState } from 'react';
import styles from './Sidebar.module.scss';
import { useRouter } from 'next/router';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';
import Link from 'next/link';
import Logo from '../../../elements/Logo';
import SidebarMenuItem from '../elements/SidebarMenuItems/SidebarMenuItem';
import DashboardCard from '../elements/DashboardCard';
import SidebarWorkspaces from '../SidebarWorkspaces/SidebarWorkspaces';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import UploadWorkspaceImageModal from 'components/pagesComponents/_imagesScreen/components/uploadWorkspaceImageModal/UploadWorkspaceImageModal';
import PanelAC from '../../../../app/store/panel/actions/PanelAC';
import { getExplorerData } from 'app/services/screenshots';
import { getExplorerDataVideo } from 'app/services/videos';
import { panelRoutes, preRoutes } from '../../../_routes';
import { IMainMenuItem, useMenuItems } from 'misc/menuItems';
import useClickOrKeyOutside from 'hooks/useClickOrKeyOutside';
import { useCreateWorkspace } from 'hooks/useCreateWorkspaceHandler';
import { useTranslation } from 'react-i18next';

interface IProps {
  isProfilePage?: boolean;
  isWorkspaceSettingsPage?: boolean;
}

const Sidebar: FC<IProps> = ({ isProfilePage, isWorkspaceSettingsPage }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const favFoldersRef = useRef(null);
  const { mainMenuItems, getWorkspaceSettingsMenuItems, settingsMenuItems } =
    useMenuItems();
  const explorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const [showFavoriteFolders, setShowFavoriteFolders] = useState(false);
  const [showWorkspaceImageModal, setShowWorkspaceImageModal] = useState(false); //? not fully implemented
  const [loaderState, setLoaderState] = useState(false);
  const { Modal: CreateWSModal, setShowCreateWorkspaceModal } =
    useCreateWorkspace(true);

  useClickOrKeyOutside(
    favFoldersRef,
    () => {
      setShowFavoriteFolders(false);
    },
    'Escape',
  );

  const sidebarItemClicked = async (item: any) => {
    // Reset active workspace on each route except workspace routes and starred folders UI
    if (item.type !== 'favFolders' && !item?.isWorkspaceRoute) {
      dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: null } as any));
    }

    item.type === 'favFolders' && setShowFavoriteFolders(true);

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
  const handleItemClick = useCallback(
    (item: any) => {
      sidebarItemClicked(item);
    },
    [sidebarItemClicked], // Dependency array
  );

  const renderMenuItems = () => {
    let menuItems: any[] = [];

    if (isWorkspaceSettingsPage) {
      const { workspaceId } = router.query;
      menuItems = getWorkspaceSettingsMenuItems(workspaceId as string);
    } else if (isProfilePage) {
      menuItems = [...settingsMenuItems];
    } else {
      menuItems = [...mainMenuItems];
    }

    return menuItems.map((item: any, index: number) => {
      const sidebarItem = (
        <SidebarMenuItem
          key={`menu_item${index}`}
          icon={item.icon}
          title={item.title}
          active={isActive(item)}
          onClick={() => handleItemClick(item)}
        />
      );

      return (
        <Link href={item.route} key={`menu_item${index}`}>
          {sidebarItem}
        </Link>
      );
    });
  };

  return (
    <DashboardCard className={classNames(styles.dashboardCard)}>
      <SidebarWorkspaces
        addNewWorkspaceClicked={() => setShowCreateWorkspaceModal(true)}
      />

      <div className={styles.sidebarContainer}>
        <div className={`${styles.sidebarWrapper} tw-px-4`}>
          <div className={styles.logoWrapper}>
            <Logo
              className="tw-w-full"
              onClick={() => router.push(preRoutes.media + panelRoutes.images)}
            />
          </div>

          {/* <hr className={styles.lineSeparator} /> */}

          {(isProfilePage || isWorkspaceSettingsPage) && (
            <div className={styles.sidebarHeading}>
              <h1>
                {isProfilePage
                  ? t('sidebar.profile')
                  : t('sidebar.administration')}
              </h1>
            </div>
          )}

          <div>
            {/* <div ref={favFoldersRef}>
              <FavFoldersSidebarSection
                visible={showFavoriteFolders}
                setVisible={setShowFavoriteFolders}
              />
            </div>*/}

            {/* <WhiteboardsButton
              isActive={isActive}
              setFavFoldersVisible={setFavFoldersVisible}
            /> */}

            <div className="tw-mt-20">{renderMenuItems()}</div>
          </div>
        </div>
      </div>

      {/* <CreateNewWorkspaceModal
        onOk={createWorkspaceHandler}
        onClose={() => setShowAddWorkspaceModal(false)}
        visible={showAddWorkspaceModal}
      /> */}
      {CreateWSModal}

      <UploadWorkspaceImageModal
        onOk={() => void 0}
        onClose={() => void 0}
        visible={showWorkspaceImageModal}
      />

      <AppSpinner show={loaderState} />
    </DashboardCard>
  );
};

export default Sidebar;

// Used to go to unfinished whiteboards section of the project.
// const WhiteboardsButton: FC<any> = ({ isActive, setFavFoldersVisible }) => {
//   return (
//     <div className="tw-mb-30px">
//       <Link href={topMenuItems[0].route} passHref>
//         <SidebarMenuItem
//           className="!tw-bg-sub-btn  hover:!tw-bg-white"
//           title={topMenuItems[0].title}
//           icon={topMenuItems[0].icon}
//           active={isActive(topMenuItems[0])}
//           onClick={() => {
//             topMenuItems[0].type === 'favFolders' && setFavFoldersVisible(true);
//           }}
//           key={`menu_item${topMenuItems[0]}`}
//         />
//       </Link>
//     </div>
//   );
// };
