import { FC, ReactNode } from 'react';
import AppSvg from '@/content/components/elements/AppSvg';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';

interface IProps {
  workspaceName: string;
}

const EmptyWorkspaceItems: FC<IProps> = ({ workspaceName }) => {
  let element: string | ReactNode = 'this organization';
  if (workspaceName) {
    element = <b>{workspaceName}</b>;
  }

  return (
    <DashboardCard className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-full">
      <AppSvg
        path={'images/panel/images/emptyItems/noshared.svg'}
        className="tw-w-max"
      />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">
        {"It's empty here..."}
      </h2>
      <p className="tw-text-center">
        Add items in {element} by adding them from Add Image/Video button or
        from your images/videos context menu.
        <br />
      </p>
    </DashboardCard>
  );
};

export default EmptyWorkspaceItems;
