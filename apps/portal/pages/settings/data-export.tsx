import { useRouter } from 'next/router';
import { RootStateOrAny, useSelector } from 'react-redux';
import Settings from '.';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import DataExport from 'components/pagesComponents/everPlatform/DataExport';

/**
 * *Settings → Your data export* (`/settings/data-export?job=<id>`): the address Ever Platform shows a
 * person whose export request this installation answered. Only the account the export was made of
 * can download it, for 7 days.
 */
const DataExportPage: React.FC = () => {
  const router = useRouter();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const job = typeof router.query.job === 'string' ? router.query.job : '';
  return (
    <Settings>
      <SCHeader filterValue={null} userPhotoURL={user?.photoURL} />
      <div className="tw-p-6">
        {router.isReady && <DataExport job={job} uid={user?.id} />}
      </div>
    </Settings>
  );
};

export default DataExportPage;
