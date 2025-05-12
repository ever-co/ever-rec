import React from 'react';
import Image from 'next/legacy/image';
import LogoWrapper from 'components/elements/LogoWrapper';
import Layout from 'antd/lib/layout/layout';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import Index from 'pages/_index';
import { getSlackLoginUrl } from 'app/services/screenshots';
import { errorMessage } from 'app/services/helpers/toastMessages';
import AppButton from 'components/controls/AppButton';
import { useRouter } from 'next/router';
import AppHeader from 'components/elements/AppHeader';
import { useTranslation } from 'react-i18next';

const PanelSlackIntegration: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthenticateUser();
  const router = useRouter();

  const connectToAccount = async () => {
    if (user) {
      const res = await getSlackLoginUrl();
      if (res.status != 'error') {
        window.open(res);
      } else {
        errorMessage(res.message);
      }
    } else {
      router.push({
        pathname: '/auth/login',
        query: { type: 'slack' },
      });
    }
  };

  return (
    <div className="tw-inline-grid tw-grid-cols-7 tw-p-4 tw-min-h-screen tw-w-screen tw-gap-36">
      <div className="tw-col-span-3 tw-col-start-2 tw-flex tw-flex-col">
        <Index />
        <div className="tw-flex-1">
          <LogoWrapper />
          <div className="tw-w-full">
            <div className="tw-w-26rem">
              <AppHeader part1="Hello," part2="Welcome!" className="tw-mb-8" />
              <p className="tw-mb-6">{t('page.integrations.gladYouHere')}</p>
              <p className="tw-mb-8">{t('page.integrations.installSlack')}</p>
              <Layout>
                <div className="">
                  <div className="tw-text-center tw-my-7 tw-flex tw-justify-center">
                    <div className="lg:tw-w-300px mx-xl:tw-w-full">
                      <AppButton onClick={connectToAccount} full={true}>
                        {t('page.integrations.connectWithSlack')}
                      </AppButton>
                    </div>
                  </div>
                </div>
              </Layout>
            </div>
          </div>
        </div>
      </div>
      <div className="tw-col-span-3 tw-bg-blue-grey tw-rounded-3xl tw-flex tw-items-center tw-justify-center">
        <div className="tw-w-8/12 tw-h-full tw-relative">
          <Image src="/sign/signin1.svg" alt="Google" layout="fill" />
        </div>
      </div>
    </div>
  );
};

export default PanelSlackIntegration;
