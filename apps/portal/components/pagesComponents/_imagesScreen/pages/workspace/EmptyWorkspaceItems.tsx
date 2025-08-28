import AppSvg from 'components/elements/AppSvg';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import { Trans, useTranslation } from 'react-i18next';

const EmptyWorkspaceItems = ({ workspace }: { workspace: IWorkspace }) => {
  const { t } = useTranslation();
  return (
    <DashboardCard className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-full">
      <AppSvg path={'/images/emptyItems/noshared.svg'} className="tw-w-max" />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">
        {t('unique.empty')}
      </h2>
      <p className="tw-text-center">
        <Trans
          i18nKey="unique.emptyItemMessage"
          values={{ workspaceName: workspace?.name }}
          components={{ 1: <b /> }}
        />
        <br />
      </p>
    </DashboardCard>
  );
};

export default EmptyWorkspaceItems;
