import { FC, ReactNode } from 'react';
import AppSvg from '@/content/components/elements/AppSvg';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import { Trans, useTranslation } from 'react-i18next';

interface IProps {
  workspaceName: string;
}

const EmptyWorkspaceItems: FC<IProps> = ({ workspaceName }) => {
  const { t } = useTranslation();
  let element: string | ReactNode = 'this organization';
  if (workspaceName) {
    element = `"${workspaceName}"`;
  }

  return (
    <DashboardCard className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-full">
      <AppSvg
        path={'images/panel/images/emptyItems/noshared.svg'}
        className="tw-w-max"
      />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">
        {t('unique.empty')}
      </h2>
      <p className="tw-text-center">
        <Trans
          i18nKey="unique.emptyItemMessage"
          values={{ workspaceName: element }}
          components={{ 1: <span /> }}
        />
        <br />
      </p>
    </DashboardCard>
  );
};

export default EmptyWorkspaceItems;
