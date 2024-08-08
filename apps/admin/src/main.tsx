import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';

import App from './app/app';

ReactDOM.render(
  <StrictMode>
    <HashRouter>
            <App />
    </HashRouter>
  </StrictMode>,
  document.getElementById('root')
);
