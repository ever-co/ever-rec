import classNames from 'classnames';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import Drive from 'components/pagesComponents/integrations/Drive';
import Dropbox from 'components/pagesComponents/integrations/Dropbox';
import Jira from 'components/pagesComponents/integrations/Jira';
import Slack from 'components/pagesComponents/integrations/Slack';
import Trello from 'components/pagesComponents/integrations/Trello';
import MediaIndex from 'pages/media/index';
import styles from '../../pagesScss/media/Integrations.module.scss';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import { IUser } from 'app/interfaces/IUserData';
import { RootStateOrAny, useSelector } from 'react-redux';
const Integrations = () => {
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  return (
    <MediaIndex>
      <DashboardCard className={styles.mainWrapper}>
        <SCHeader
          text={'Integrations'}
          userPhotoURL={user?.photoURL}
          showSearch={false}
        />
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
