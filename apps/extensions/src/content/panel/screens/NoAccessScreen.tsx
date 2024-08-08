import AppContainer from '@/content/components/containers/appContainer/AppContainer';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { Col, Row } from 'antd';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { AppMessagesEnum } from '@/app/messagess';
import { useCallback } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const NoAccessScreen = () => {
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const navigate = useNavigate();
  const updateTab = useCallback(async () => {
    const activeTab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    sendRuntimeMessage({
      action: AppMessagesEnum.createLoginTabSW,
      payload: { justInstalled: false, tab: activeTab[0] },
    });
  }, []);

  return (
    <AppContainer>
      <Row style={{ minHeight: '85vh', marginLeft: 0, marginRight: 0 }}>
        <Col span={24}>
          <div className="tw-flex tw-justify-center tw-mt-8">
            <img
              src="/images/panel/common/404.svg"
              alt="404"
              width={300}
              height={300}
            />
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
                    user ? navigate(panelRoutes.images.path) : updateTab();
                  }}
                  className="tw-m-auto tw-mt-5 tw-px-10 tw-py-4"
                >
                  Back to Rec
                </AppButton>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </AppContainer>
  );
};

export default NoAccessScreen;
