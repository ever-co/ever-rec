import * as styles from './Integrations.module.scss';
import classNames from 'classnames';
import DashboardCard from '../../components/containers/dashboardLayout/elements/DashboardCard';
import DrivePage from '../imagesScreen/pages/integrations/DrivePage';
import DropboxPage from '../imagesScreen/pages/integrations/DropboxPage';
import JiraPage from '../imagesScreen/pages/integrations/JiraPage';
import SlackPage from '../imagesScreen/pages/integrations/SlackPage';
import TrelloPage from '../imagesScreen/pages/integrations/TrelloPage';
import { RootStateOrAny, useSelector } from 'react-redux';
import { IUser } from '@/app/interfaces/IUserData';
import SCHeader from '../../shared/SCHeader/SCHeader';
import { useTranslation } from 'react-i18next';

const IntegrationsScreen = () => {
  const { t } = useTranslation();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  return (
    <DashboardCard className={styles.mainWrapper}>
      <SCHeader
        text={t('navigation.integrations')}
        userPhotoURL={user?.photoURL}
        showSearch={false}
      />
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
