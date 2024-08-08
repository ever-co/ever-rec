import { FC } from 'react';
import 'clipboard-polyfill/overwrite-globals';
import DashboardLayout from './components/containers/dashboardLayout/DashboardLayout';
import { panelRoutes } from './router/panelRoutes';
import { Route, Routes } from 'react-router';
import MyImages from './screens/imagesScreen/pages/myImages/MyImages';
import MyVideos from './screens/imagesScreen/pages/myVideos/MyVideos';
import SharedImages from './screens/imagesScreen/pages/shared/SharedImagesAndVideos';
import TrashedImagesVideos from './screens/imagesScreen/pages/trashed/TrashedImagesVideos';
import Workspace from '@/content/panel/screens/imagesScreen/pages/workspace/WorkspaceScreen';
import WorkspacesManageScreen from '@/content/panel/screens/imagesScreen/pages/workspaces/WorkspacesManageScreen';
import IntegrationsScreen from './screens/IntegrationsScreen/IntegrationsScreen';
import WorkspaceTeams from './screens/imagesScreen/pages/workspaces/WorkspacesTeams';
import useLoggedInNotification from '@/content/utilities/hooks/useLoggedInNotification';
import WorkspaceSettings from './screens/imagesScreen/pages/workspace/WorkspaceSettingsScreen';

const AllMediaRoutes: FC = () => {
  useLoggedInNotification();

  return (
    <>
      <DashboardLayout>
        <Routes>
          <Route
            path={panelRoutes.images.nestedPath}
            element={<MyImages />}
          ></Route>
          <Route
            path={panelRoutes.videos.nestedPath}
            element={<MyVideos />}
          ></Route>
          <Route
            path={panelRoutes.imagesShared.nestedPath}
            element={<SharedImages />}
          ></Route>
          <Route
            path={panelRoutes.imagesTrashed.nestedPath}
            element={<TrashedImagesVideos />}
          ></Route>
          <Route
            path={panelRoutes.integrations.nestedPath}
            element={<IntegrationsScreen />}
          />
          <Route
            path={panelRoutes.workspace.nestedPath}
            element={<Workspace />}
          ></Route>
          <Route
            path={panelRoutes.workspaceSettings.nestedPath}
            element={<WorkspaceSettings />}
          />
          <Route
            path={panelRoutes.manageWorkspace.nestedPath}
            element={<WorkspacesManageScreen />}
          />
          <Route
            path={panelRoutes.manageWorkspaceTeams.nestedPath}
            element={<WorkspaceTeams />}
          />
        </Routes>
      </DashboardLayout>
    </>
  );
};

export default AllMediaRoutes;
