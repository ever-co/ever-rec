import { useTranslation } from 'react-i18next';
import { RootStateOrAny, useSelector } from 'react-redux';
import Settings from '.';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import EverPlatformTabs from 'components/pagesComponents/everPlatform/EverPlatformTabs';

/**
 * *Settings → Ever Platform*: the Statistics tab (the operator of the installation only) and, when
 * the Ever Platform connection is switched on, the Connect tabs.
 */
const EverPlatformSettings: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  return (
    <Settings>
      <SCHeader filterValue={null} userPhotoURL={user?.photoURL} />
      <div className="tw-p-6">
        <h1 className="tw-text-2xl tw-font-semibold">{t('page.everPlatform.title')}</h1>
        <EverPlatformTabs uid={user?.id} />
      </div>
    </Settings>
  );
};

export default EverPlatformSettings;
