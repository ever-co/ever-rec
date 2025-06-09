import React, { useEffect } from 'react';
import '@/content/content';
import '@/content/popup/assets/tailwind.scss';
import '@/content/popup/assets/antd.less';
import '@/content/popup/assets/app.scss';
import '@/content/popup/assets/toastify.scss';
import '@/content/popup/assets/react-multi-email.scss';
import '@/content/popup/assets/emojitoolPanel.scss';
import 'clipboard-polyfill/overwrite-globals';
import { RootStateOrAny, useSelector } from 'react-redux';
import './messagesHandler';
import { BrowserRouter as Router } from 'react-router-dom';
import { Route, Routes } from 'react-router';
import PrivateRoute from './router/PrivateRoute';
import { panelRoutes } from './router/panelRoutes';
import InstallScreen from './screens/installScreen/InstallScreen';
import EditorScreen from './screens/editorScreen/EditorScreen';
import AllMediaRoutes from './AllMediaRoutes';
import SettingsScreen from './screens/settingsScreen/SettingsScreen';
import SingleImageScreen from './screens/singleImageScreen/SingleImageScreen';
import AppSpinner from '../components/containers/appSpinner/AppSpinner';
import PreferencesScreen from './screens/preferences/PreferencesScreen';
import VideoEditorScreen from './screens/videoEditorScreen/VideoEditorScreen';
import GrantAccess from './screens/grantAccess/GrantAccess';
import { ToastContainer } from 'react-toastify';
import UploadScreen from './screens/uploadScreen/UploadScreen';
import { IUser } from '@/app/interfaces/IUserData';
import { updateUserAuthAC } from '@/app/utilities/user';
import PanelRoutesWrapper from '@/content/panel/PanelRoutesWrapper';
import WorkspaceSingleVideoScreen from './screens/WorkspaceSingleVideoScreen/WorkspaceSingleVideoScreen';
import WorkspaceSingleImageScreen from './screens/WorkspaceSingleImageScreen/WorkspaceSingleImageScreen';
import NoAccessScreen from '@/content/panel/screens/NoAccessScreen';

const PanelMain: React.FC = () => {
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);

  const loaderState: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.loaderState,
  );
  useEffect(() => {
    if (user) return;

    updateUserAuthAC();
  }, [user]);

  return (
    <>
      <ToastContainer />
      <Router>
        <PanelRoutesWrapper />
        <Routes>
          <Route path={panelRoutes.install.path} element={<InstallScreen />} />
          <Route
            path={panelRoutes.mediaRoutes.path}
            element={<PrivateRoute component={AllMediaRoutes} />}
          />
          <Route
            path={panelRoutes.workspaceImage.path}
            element={<PrivateRoute component={WorkspaceSingleImageScreen} />}
          />
          <Route
            path={panelRoutes.workspaceVideo.path}
            element={<PrivateRoute component={WorkspaceSingleVideoScreen} />}
          />
          <Route
            path={panelRoutes.image.path}
            element={<PrivateRoute component={SingleImageScreen} />}
          />
          <Route
            path={panelRoutes.video.path}
            element={<PrivateRoute component={VideoEditorScreen} />}
          />
          <Route
            path={panelRoutes.preferences.path}
            element={<PreferencesScreen />}
          />
          <Route
            path={panelRoutes.settings.path}
            element={<PrivateRoute component={SettingsScreen} />}
          />
          <Route
            path={panelRoutes.noAccess.path}
            element={<NoAccessScreen />}
          />
          <Route path={panelRoutes.edit.path} element={<EditorScreen />} />
          <Route path={panelRoutes.grant.path} element={<GrantAccess />} />
          <Route path={panelRoutes.upload.path} element={<UploadScreen />} />
        </Routes>
      </Router>
      <AppSpinner show={loaderState} />
    </>
  );
};

export default PanelMain;
