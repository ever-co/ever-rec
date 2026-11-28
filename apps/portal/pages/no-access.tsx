import { Col, Row } from 'antd';
import Image from 'next/legacy/image';
import AppButton from 'components/controls/AppButton';
import { panelRoutes, preRoutes } from 'components/_routes';
import AppContainer from 'components/containers/appContainer/AppContainer';
import React from 'react';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';

const NoAccess = () => {
  const user = useAuthenticateUser();
  const router = useRouter();

  const { t } = useTranslation();
  return (
    <AppContainer>
      <Row style={{ minHeight: '100vh', marginLeft: 0, marginRight: 0 }}>
        <Col
          span={24}
          className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12"
        >
          <div className="tw-flex tw-justify-center">
            <Image
              src="/images/404.svg"
              alt=""
              width={240}
              height={240}
              className="dark:tw-invert dark:tw-hue-rotate-180"
            />
          </div>
          <div className="tw-flex tw-justify-center">
            <div>
              <div className="tw-mt-6 tw-text-center tw-text-2xl tw-font-semibold tw-text-foreground">
                {t('page.video.oops')}
              </div>
              <div className="tw-mt-2 tw-text-center tw-text-sm tw-text-muted-foreground">
                {t('page.video.noAccess')}
              </div>

              <div>
                <AppButton
                  onClick={() => {
                    user
                      ? router.push(preRoutes.media + panelRoutes.images)
                      : router.push(preRoutes.auth + panelRoutes.login);
                  }}
                  twPadding="tw-px-6"
                  className="tw-m-auto tw-mt-6 tw-flex tw-h-10 tw-items-center tw-justify-center"
                >
                  {t('page.video.backToPortal')}
                </AppButton>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </AppContainer>
  );
};

export default NoAccess;
