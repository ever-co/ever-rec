import { RootStateOrAny, useSelector } from 'react-redux';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import { disconnectTrelloUser, trelloSaveToken } from 'app/services/general';
import DisconnectServiceModal from 'components/shared/DisconnectServiceModal';
import { trelloOauthUrl } from 'app/services/api/messages';
import { useRouter } from 'next/router';
import styles from './IntegrationPage.module.scss';
import { useTranslation } from 'react-i18next';

const Trello: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const [isDisconnect, setIsDisconnect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded && window.location.hash) {
      setLoaded(true);
      handleSaveToken(window.location.hash);
    }
  }, [router]);

  const handleSaveToken = useCallback(
    async (token: string) => {
      setLoading(true);
      const res = await trelloSaveToken(token);
      if (res.status == 'error') {
        errorMessage(res.message);
      }
      setLoading(false);
    },
    [router],
  );

  const connectToAccount = async () => {
    setLoading(true);
    const res = await trelloOauthUrl();
    setLoading(false);
    if (res.status != 'error') {
      window.open(res, '_blank');
    } else {
      errorMessage(res.message);
    }
  };

  const disconnectTrelloAccount = useCallback(async () => {
    setLoading(true);
    const res = await disconnectTrelloUser();
    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage('Successfully disconnected trello account');
    } else {
      setLoading(false);
      errorMessage(res.message);
    }
  }, []);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-font-semibold">
        <div className="tw-flex">
          <AppSvg size="22px" className="tw-mr-2" path="/settings/trello.svg" />
          {t('page.integrations.trello.title')}
        </div>
      </h1>

      {user &&
      user.trello &&
      user.trello.isIntegrated &&
      user.trello.isIntegrated === true ? (
        <>
          <h2 className="tw-max-w-full tw-text-center">
            <div className="tw-flex tw-flex-col tw-gap-2 tw-justify-center">
              <div className="tw-mr-2">
                {t('page.integrations.connectedTo')}
              </div>
              <div className="tw-flex">
                <span className="tw-text-primary-purple tw-font-bold">
                  {user.trello.email}
                </span>
              </div>
            </div>
          </h2>

          <div className="tw-w-90p">
            <AppButton
              full={true}
              className={styles.disconnectBtn}
              onClick={() => setIsDisconnect(true)}
            >
              {t('page.integrations.trello.disconnectTrello')}
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            {t('page.integrations.trello.connectedDiscription')}
          </p>
          <div className="tw-w-90p">
            <AppButton onClick={connectToAccount} full={true}>
              {t('page.integrations.trello.connectWithTrello')}
            </AppButton>
          </div>
        </>
      )}
      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={disconnectTrelloAccount}
          loading={loading}
          title={t('page.integrations.trello.disconnectErrorTitle')}
          subTitle={t('page.integrations.trello.disconnectErrorDescription')}
        />
      )}
    </div>
  );
};

export default Trello;
