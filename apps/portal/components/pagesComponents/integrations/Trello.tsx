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
      infoMessage(t('toasts.trelloDisconnected'));
    } else {
      setLoading(false);
      errorMessage(res.message);
    }
  }, []);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-m-0 tw-text-sm tw-font-medium tw-text-foreground">
        <div className="tw-flex tw-h-7 tw-items-center">
          <AppSvg size="22px" className="tw-me-2" path="/settings/trello.svg" />
          {t('page.integrations.trello.title')}
        </div>
      </h1>

      {user &&
      user.trello &&
      user.trello.isIntegrated &&
      user.trello.isIntegrated === true ? (
        <>
          <h2 className="tw-m-0 tw-max-w-full tw-text-[13px] tw-font-normal tw-leading-5 tw-text-muted-foreground">
            <div className="tw-flex tw-flex-col">
              <div>{t('page.integrations.connectedTo')}</div>
              <div className="tw-flex tw-min-w-0">
                <span className="tw-truncate tw-font-medium tw-text-foreground">
                  {user.trello.email}
                </span>
              </div>
            </div>
          </h2>

          <div className={styles.action}>
            <AppButton
              full={true}
              bgColor="tw-bg-transparent hover:tw-bg-destructive-muted"
              twTextColor="tw-text-destructive-text"
              twPadding="tw-px-4 tw-py-[7px]"
              onClick={() => setIsDisconnect(true)}
            >
              {t('page.integrations.trello.disconnectTrello')}
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            {t('page.integrations.trello.connectedDescription')}
          </p>
          <div className={styles.action}>
            <AppButton
              outlined
              twPadding="tw-px-4 tw-py-[7px]"
              onClick={connectToAccount}
              full={true}
            >
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
