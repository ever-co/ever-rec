import { FC, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { IUser } from '@/app/interfaces/IUserData';
import browser from '@/app/utilities/browser';
import AppSvg from '@/content/components/elements/AppSvg';
import Logo from '@/content/components/elements/Logo';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import DashboardCard from '../DashboardCard';
import SidebarMenuItem from '../SidebarMenuItems/SidebarMenuItem';
import UserShortInfo from '../UserShortInfo';
import * as styles from './Sidebar.module.scss';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import UploadWorkspaceImageModal from '@/content/panel/screens/imagesScreen/components/UploadWorkspaceImage/UploadWorkspaceImage';
import {
  IMainMenuItem,
  getWorkspaceSettingsMenuItems,
  mainMenuItems,
  settingsMenuItems,
} from '@/content/panel/misc/menuItems';
import FavFoldersSidebarSection from '../FavFoldersSidebarSection/FavFoldersSidebarSection';
import { getExplorerData } from '@/app/services/screenshots';
import { getExplorerDataVideo } from '@/app/services/videos';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import SidebarWorkspaces from '../SidebarWorkspaces/SidebarWorkspaces';
import { Link } from 'react-router-dom';
import useClickOrKeyOutside from '@/content/utilities/hooks/useClickOrKeyOutside';
import { useCreateWorkspace } from '@/content/utilities/hooks/useCreateWorkspace';

interface SidebarProps {
  isProfilePage?: boolean;
}

const Sidebar: FC<SidebarProps> = ({ isProfilePage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const favFoldersRef = useRef<any>(null);
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const explorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const [showWorkspaceImageModal, setShowWorkspaceImageModal] = useState(false);
  const [favFoldersVisible, setFavFoldersVisible] = useState(false);
  const [loaderState, setLoaderState] = useState(false);
  const { Modal: CreateWSModal, setShowCreateWorkspaceModal } =
    useCreateWorkspace(true);

  const isWorkspaceSettingsPage = location.pathname.includes(
    panelRoutes.workspaceSettings.path,
  );

  useClickOrKeyOutside(
    favFoldersRef,
    () => {
      setFavFoldersVisible(false);
    },
    'Escape',
  );

  const sidebarItemClicked = async (item: IMainMenuItem) => {
    // Reset active workspace on each route except workspace routes and starred folders UI
    if (item.type !== 'favFolders' && !item?.isWorkspaceRoute) {
      dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: null }));
    }

    item.type === 'favFolders' && setFavFoldersVisible(true);

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
    if (item.type === 'favFolders') return false;

    return item.route.includes(location.pathname);
  };

  const renderMenuItems = () => {
    let menuItems: IMainMenuItem[] = [];

    if (isWorkspaceSettingsPage) {
      const workspaceId = location.search.split('=')[1];
      menuItems = [...getWorkspaceSettingsMenuItems(workspaceId)];
    } else if (isProfilePage) {
      menuItems = [...settingsMenuItems];
    } else {
      menuItems = [...mainMenuItems];
    }

    return menuItems.map((item, index) => {
      const sidebarItem = (
        <SidebarMenuItem
          key={`menu_item${index}`}
          title={item.title}
          icon={item.icon}
          active={isActive(item)}
          onClick={() => sidebarItemClicked(item)}
        />
      );

      // We don't need to wrap Starred in <Link> component as it open an absolute positioned UI
      if (item.type === 'favFolders') {
        return sidebarItem;
      }

      return (
        <Link to={item.route} key={`menu_item${index}`}>
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
            <Logo onClick={() => navigate(panelRoutes.images.path)} />
          </div>

          {/* <hr className={styles.lineSeparator} /> */}

          {(isProfilePage || isWorkspaceSettingsPage) && (
            <div className={styles.sidebarHeading}>
              <h1>{isProfilePage ? 'Profile' : 'Administration'}</h1>
            </div>
          )}

          <div>
            <div ref={favFoldersRef}>
              <FavFoldersSidebarSection
                visible={favFoldersVisible}
                setVisible={setFavFoldersVisible}
              />
            </div>

            <div className="tw-mt-24">{renderMenuItems()}</div>
          </div>
        </div>

        {user && !isProfilePage && (
          <>
            {/* <ProfileSidebarButton navigate={navigate} user={user} /> */}
            <Version />
          </>
        )}
      </div>

      {CreateWSModal}

      <UploadWorkspaceImageModal
        onOk={() => void 0}
        onClose={() => setShowWorkspaceImageModal(false)}
        visible={showWorkspaceImageModal}
      />

      <AppSpinner show={loaderState} />
    </DashboardCard>
  );
};

export default Sidebar;

interface ProfileSidebarButtonProps {
  navigate: any;
  user: IUser;
}

const ProfileSidebarButton: React.FC<ProfileSidebarButtonProps> = ({
  navigate,
  user,
}) => {
  const handleProfileClick = () => {
    navigate(panelRoutes.profile.path);
  };

  return (
    <div
      // TODO: use .profilePageWrapper
      className="tw-relative tw-rounded-xl hover:tw-bg-blue-grey tw-cursor-pointer tw-px-4 tw-py-2 tw-mx-2"
      onClick={handleProfileClick}
    >
      <UserShortInfo user={user} />
      <AppSvg
        path="images/panel/common/Chevron_right.svg"
        className="tw-absolute tw-right-2 tw-top-5"
      />
    </div>
  );
};

const Version = () => {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const mVersion = browser.runtime.getManifest().version;
    if (mVersion) setVersion(mVersion);
  }, []);

  if (!version) return null;

  return (
    <div className="tw-w-11/12 tw-pt-2 tw-mt-2 tw-mb-2 tw-text-sm tw-text-semibold tw-text-center tw-m-auto tw-opacity-60 tw-border-t-2 tw-border-primary-purple tw-border-opacity-20">
      v{version}
    </div>
  );
};
