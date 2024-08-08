import { FC, ReactNode } from 'react';
import Head from 'next/head';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import useHeadTitle from 'hooks/useHeadTitle';
import useMonitorTokens from 'hooks/useMonitorTokens';
import DashboardLayout from '../../components/containers/dashboardLayout/DashboardLayout';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { mainMenuItems } from 'misc/menuItems';

interface IProps {
  children: ReactNode;
  isWorkspaceSettingsPage?: boolean;
}

const MediaIndex: FC<IProps> = ({
  children,
  isWorkspaceSettingsPage = false,
}) => {
  const user = useAuthenticateUser();
  const headTitle = useHeadTitle(mainMenuItems);

  useMonitorTokens();

  if (!user) {
    return <AppSpinner show={true} />;
  }

  return (
    <>
      <Head>
        <title>{`Rec${headTitle}`}</title>
      </Head>

      <DashboardLayout isWorkspaceSettingsPage={isWorkspaceSettingsPage}>
        {children}
      </DashboardLayout>
    </>
  );
};

export default MediaIndex;
