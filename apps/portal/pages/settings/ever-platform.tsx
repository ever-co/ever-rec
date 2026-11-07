import { useTranslation } from 'react-i18next';
import { RootStateOrAny, useSelector } from 'react-redux';
import Settings from '.';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import EverPlatformStatistics from 'components/pagesComponents/everPlatform/EverPlatformStatistics';

/** *Settings → Ever Platform*: the Statistics tab (the operator of the installation only). */
const EverPlatformSettings: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  return (
    <Settings>
      <SCHeader filterValue={null} userPhotoURL={user?.photoURL} />
      <div className="tw-p-6">
        <h1 className="tw-text-2xl tw-font-semibold">{t('page.everPlatform.title')}</h1>
        <EverPlatformStatistics />
      </div>
    </Settings>
  );
};

export default EverPlatformSettings;
