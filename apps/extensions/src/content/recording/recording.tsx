import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Routes } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { panelRoutes } from '../panel/router/panelRoutes';
import CameraOnlyScreen from './screens/cameraOnlyScreen/CameraOnlyScreen';
import DesktopCaptureScreen from './screens/desktopCaptureScreen/DesktopCaptureScreen';
import '@/content/popup/assets/tailwind.scss';
import '@/app/utilities/initiateSentryReact';

const Recording: React.FC = () => {
  //? add authentication?
  const routes = (
    <BrowserRouter>
      <Routes>
        <Route
          path={panelRoutes.cameraonly.path}
          element={<CameraOnlyScreen />}
        ></Route>
        <Route
          path={panelRoutes.desktopCapture.path}
          element={<DesktopCaptureScreen />}
        ></Route>
      </Routes>
    </BrowserRouter>
  );

  return routes;
};

const rootNode = document.getElementById('recording');
if (rootNode) {
  ReactDOM.render(<Recording />, rootNode);
}
