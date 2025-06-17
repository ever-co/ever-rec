import 'clipboard-polyfill/overwrite-globals';
import DashboardLayout from '../../components/containers/dashboardLayout/DashboardLayout';
import { panelRoutes } from '../../router/panelRoutes';
import { Route, Routes, useLocation } from 'react-router';
import ProfilePage from './pages/ProfilePage';
import browser from '@/app/utilities/browser';
import useLoggedInNotification from '@/content/utilities/hooks/useLoggedInNotification';
import { useMenuItems } from '../../misc/menuItems';

const SettingsScreen: React.FC = () => {
  const { pathname } = useLocation();
  const { settingsMenuItems } = useMenuItems();

  useLoggedInNotification();

  const activeImage = () => {
    const currentItem = settingsMenuItems.find(
      (item) => item.route === pathname,
    );

    return browser.runtime.getURL(
      `images/panel/settings/${
        currentItem ? currentItem.imgName : 'profile.svg'
      }`,
    );
  };

  const activeImagePath = activeImage();

  return (
    <DashboardLayout isProfilePage>
      <div className="tw-inline-grid tw-grid-cols-10 tw-w-full">
        <div className="tw-col-span-10">
          <Routes>
            <Route
              path={panelRoutes.profile.nestedPath}
              element={<ProfilePage imagePath={activeImagePath} />}
            ></Route>
          </Routes>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsScreen;
