import classNames from 'classnames';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import Drive from 'components/pagesComponents/integrations/Drive';
import Dropbox from 'components/pagesComponents/integrations/Dropbox';
import Jira from 'components/pagesComponents/integrations/Jira';
import Slack from 'components/pagesComponents/integrations/Slack';
import Trello from 'components/pagesComponents/integrations/Trello';
import MediaIndex from 'pages/media/index';
import styles from '../../pagesScss/media/Integrations.module.scss';
import { useTranslation } from 'react-i18next';

const Integrations = () => {
  const { t } = useTranslation();
  return (
    <MediaIndex>
      <DashboardCard className={styles.mainWrapper}>
        <div className={styles.mainHeader}>
          {t('page.integrations.pageTitle')}
        </div>
        <div className={classNames(styles.innerWrapper, 'scroll-div')}>
          <Drive />
          <Dropbox />
          <Jira />
          <Slack />
          <Trello />
        </div>
      </DashboardCard>
    </MediaIndex>
  );
};

export default Integrations;
