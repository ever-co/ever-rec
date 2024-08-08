import { FC, useEffect, useRef, useState } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import { AppMessagesEnum } from '@/app/messagess';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { IUser } from '@/app/interfaces/IUserData';
import { getStorageItems } from '@/app/services/localStorage';
import { panelRoutes } from './panelRoutes';

interface IProps {
  component: FC<any>;
}

const PrivateRoute: FC<IProps> = ({ component: Component }) => {
  const savedIdTokenRef = useRef<string | null>(null);
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);

  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      const changedItems = Object.keys(changes);

      for (const item of changedItems) {
        if (item !== 'idToken') continue;

        const newIdToken = changes[item].newValue;

        if (!newIdToken) {
          location.assign(panelRoutes.signin.path + '?ext=true');
        }

        if (!savedIdTokenRef.current) {
          savedIdTokenRef.current = newIdToken;
          return;
        }

        // User logged in - reload page
        if (changes[item].newValue !== savedIdTokenRef.current) {
          location.reload();
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const updateTab = async () => {
    const replaceTab = await chrome.tabs.getCurrent();

    setTab(replaceTab);
  };

  useEffect(() => {
    updateTab();
  }, []);

  const redirectToLogin = async (tab: chrome.tabs.Tab) => {
    try {
      const tokens = await getStorageItems(['idToken', 'refreshToken']);

      if (tokens.idToken && tokens.refreshToken) {
        savedIdTokenRef.current = tokens.idToken;
        return; // we have tokens - wait for user to get initiated
      }

      sendRuntimeMessage({
        action: AppMessagesEnum.createLoginTabSW,
        payload: { justInstalled: false, tab },
      });
    } catch (err) {
      console.log(err);
    }
  };

  if (user) {
    return <Component />;
  } else if (tab) {
    redirectToLogin(tab);
  }

  return null;
};

export default PrivateRoute;
