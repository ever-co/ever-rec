import React from 'react';
import ReactDOM from 'react-dom';
import store from '@/app/store/panel';
import '@/content/content';
import '@/content/popup/assets/tailwind.scss';
import '@/content/popup/assets/antd.less';
import '@/content/popup/assets/slider.less';
import '@/content/popup/assets/app.scss';
import 'clipboard-polyfill/overwrite-globals';
import { Provider } from 'react-redux';
import PanelMain from './PanelMain';
import useTheme from '../utilities/hooks/useTheme';

import '@/app/utilities/initiateSentryReact';

const App: React.FC = () => {
  useTheme();

  return (
    <Provider store={store}>
      <PanelMain />
    </Provider>
  );
};

const rootNode = document.getElementById('panel');

if (rootNode) {
  window.ondragover = function (e) {
    e.preventDefault();
    return false;
  };
  window.ondrop = function (e) {
    e.preventDefault();
    return false;
  };

  ReactDOM.render(<App />, rootNode);
}
