import AppSvg from 'components/elements/AppSvg';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';

const EmptyWorkspaceItems = ({ workspace }: { workspace: IWorkspace }) => {
  return (
    <DashboardCard className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-full">
      <AppSvg path={'/images/emptyItems/noshared.svg'} className="tw-w-max" />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">
        It&apos;s empty here...
      </h2>
      <p className="tw-text-center">
        Add items in <b>{workspace?.name}</b> by adding them from Add
        Image/Video button or from your images/videos context menu.
        <br />
      </p>
    </DashboardCard>
  );
};

export default EmptyWorkspaceItems;
