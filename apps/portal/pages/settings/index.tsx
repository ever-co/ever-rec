import { FC, ReactNode } from 'react';
import Head from 'next/head';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import DashboardLayout from '../../components/containers/dashboardLayout/DashboardLayout';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import useHeadTitle from 'hooks/useHeadTitle';
import useMonitorTokens from 'hooks/useMonitorTokens';
import { useMenuItems } from 'misc/menuItems';

interface IProps {
  children: ReactNode;
}

const Settings: FC<IProps> = ({ children }) => {
  const user = useAuthenticateUser();
  const { settingsMenuItems } = useMenuItems();
  const headTitle = useHeadTitle(settingsMenuItems);

  useMonitorTokens();

  if (!user) {
    return <AppSpinner show={true} />;
  }

  return (
    <>
      <Head>
        <title>{`Rec${headTitle}`}</title>
      </Head>

      <DashboardLayout isProfilePage>{children}</DashboardLayout>
    </>
  );
};

export default Settings;
