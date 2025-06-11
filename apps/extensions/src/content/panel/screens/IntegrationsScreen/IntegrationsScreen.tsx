import * as styles from './Integrations.module.scss';
import classNames from 'classnames';
import DashboardCard from '../../components/containers/dashboardLayout/elements/DashboardCard';
import DrivePage from '../imagesScreen/pages/integrations/DrivePage';
import DropboxPage from '../imagesScreen/pages/integrations/DropboxPage';
import JiraPage from '../imagesScreen/pages/integrations/JiraPage';
import SlackPage from '../imagesScreen/pages/integrations/SlackPage';
import TrelloPage from '../imagesScreen/pages/integrations/TrelloPage';
import { useTranslation } from 'react-i18next';

const IntegrationsScreen = () => {
  const { t } = useTranslation();
  const getLang = () => {
    return localStorage.getItem('lang') || 'en';
  };

  const setLang = (lang: string) => {
    localStorage.setItem('lang', lang);
  };
  return (
    <DashboardCard className={styles.mainWrapper}>
      <div className={styles.mainHeader}>
        data {JSON.stringify(getLang())}
        <button onClick={() => setLang('ar')}>setLang</button>
      </div>
      <div className={classNames(styles.innerWrapper, 'scroll-div')}>
        <DrivePage />
        <DropboxPage />
        <JiraPage />
        <SlackPage />
        <TrelloPage />
      </div>
    </DashboardCard>
  );
};

export default IntegrationsScreen;
