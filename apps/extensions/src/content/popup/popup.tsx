import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import './assets/tailwind.scss';
import './assets/antd.less';
import './assets/app.scss';
import Main from './Main';
import store from '@/app/store/popup';
import './utilities/messagesHandler';
import useTheme from '../utilities/hooks/useTheme';
import '@/app/utilities/initiateSentryReact';

const App: React.FC = () => {
  useTheme();

  return (
    <Provider store={store}>
      <Main />
    </Provider>
  );
};

const rootNode = document.getElementById('popup');
if (rootNode) {
  ReactDOM.render(<App />, rootNode);
}
