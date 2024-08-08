import { Col, Row } from 'antd';
import Image from 'next/image';
import AppButton from 'components/controls/AppButton';
import { panelRoutes, preRoutes } from 'components/_routes';
import AppContainer from 'components/containers/appContainer/AppContainer';
import React from 'react';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import { useRouter } from 'next/router';

const NoAccess = () => {
  const user = useAuthenticateUser();
  const router = useRouter();
  return (
    <AppContainer>
      <Row style={{ minHeight: '85vh', marginLeft: 0, marginRight: 0 }}>
        <Col span={24}>
          <div className="tw-flex tw-justify-center tw-mt-8">
            <Image src="/images/404.svg" alt="404" width={300} height={300} />
          </div>
          <div className="tw-flex tw-justify-center">
            <div>
              <div className="tw-font-bold tw-text-3xl tw-text-center tw-mt-4">
                Whoo...oops!
              </div>
              <div className="tw-text-lg tw-text-center tw-mt-2">
                You don’t have the access to this item anymore.
              </div>

              <div>
                <AppButton
                  onClick={() => {
                    user
                      ? router.push(preRoutes.media + panelRoutes.images)
                      : router.push(preRoutes.auth + panelRoutes.login);
                  }}
                  className="tw-m-auto tw-mt-5 tw-px-10 tw-py-4"
                >
                  Back to Portal
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
