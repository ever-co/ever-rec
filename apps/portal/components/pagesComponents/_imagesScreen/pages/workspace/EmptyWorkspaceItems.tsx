import AppSvg from 'components/elements/AppSvg';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import { Trans, useTranslation } from 'react-i18next';

const EmptyWorkspaceItems = ({ workspace }: { workspace: IWorkspace }) => {
  const { t } = useTranslation();
  // Centred in what is left of the items section. The auto margins (not `justify-center`) keep
  // the top of the picture reachable when the section is shorter than the block.
  return (
    <DashboardCard className="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-items-center tw-overflow-y-auto tw-px-6 tw-py-8">
      <AppSvg
        path={'/images/emptyItems/noshared.svg'}
        className="tw-mt-auto tw-w-max"
      />
      <h2 className="tw-mt-6 tw-mb-1 tw-text-lg tw-font-semibold tw-text-foreground">
        {t('unique.empty')}
      </h2>
      <p className="tw-mb-auto tw-max-w-md tw-text-center tw-text-sm tw-text-muted-foreground">
        <Trans
          i18nKey="unique.emptyItemMessage"
          values={{ workspaceName: workspace?.name }}
          components={{ 1: <b className="tw-font-medium tw-text-foreground" /> }}
        />
        <br />
      </p>
    </DashboardCard>
  );
};

export default EmptyWorkspaceItems;
