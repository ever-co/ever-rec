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
      <div className="tw-flex-1 tw-overflow-y-auto">
        <div className="tw-mx-auto tw-w-full tw-max-w-3xl tw-px-4 tw-py-8 md:tw-px-8">
          <h1 className="tw-m-0 tw-mb-4 tw-text-2xl tw-font-semibold tw-text-foreground">
            {t('page.everPlatform.title')}
          </h1>
          <EverPlatformTabs uid={user?.id} />
        </div>
      </div>
    </Settings>
  );
};

export default EverPlatformSettings;
