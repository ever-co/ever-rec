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
    <div className="tw-grid tw-min-h-screen tw-w-full tw-grid-cols-2 tw-gap-4 tw-bg-background tw-p-4 mx-lg:tw-grid-cols-1">
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-px-4 tw-py-16">
        <Index />
        <div className="tw-w-full tw-max-w-[24rem]">
          <LogoWrapper />
          <div className="tw-w-full">
            <div className="tw-w-full">
              <AppHeader
                part1={t('page.integrations.hello')}
                part2={t('page.integrations.welcome')}
                textSize="2xl"
                className="tw-mb-2"
              />
              <p className="tw-m-0 tw-text-sm tw-text-muted-foreground">
                {t('page.integrations.gladYouHere')}
              </p>
              <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-muted-foreground">
                {t('page.integrations.installSlack')}
              </p>
              <Layout>
                <div className="">
                  <div className="tw-mt-6 tw-flex tw-justify-center tw-text-center">
                    <div className="tw-w-full">
                      <AppButton
                        onClick={connectToAccount}
                        full={true}
                        twPadding="tw-px-4"
                        className="tw-flex tw-h-10 tw-items-center tw-justify-center"
                      >
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
      <div className="tw-flex tw-items-center tw-justify-center tw-rounded-[0.75rem] tw-bg-muted mx-lg:tw-hidden">
        <div className="tw-relative tw-h-full tw-w-8/12">
          <Image
            src="/sign/signin1.svg"
            alt=""
            layout="fill"
            className="dark:tw-invert dark:tw-hue-rotate-180"
          />
        </div>
      </div>
    </div>
  );
};

export default PanelSlackIntegration;
