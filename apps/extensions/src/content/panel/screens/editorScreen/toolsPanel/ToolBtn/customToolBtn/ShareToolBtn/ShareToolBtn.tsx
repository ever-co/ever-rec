import React, { useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { shareData } from '@/app/utilities/popupsData';
import PopupButton from '../../components/popupButton';
import EmailModal from '@/content/panel/screens/imagesScreen/components/emailModal/EmailModal';
import IEditorImage from '@/app/interfaces/IEditorImage';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import SlackShareScreen from '@/content/panel/screens/slackShareScreen/SlackShareScreen';
import SendWhatsAppMessageScreen from '@/content/panel/screens/sendWhatsAppMessageScreen/SendWhatsAppMessageScreen';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { panelRoutes } from '@/content/panel/router/panelRoutes';

export interface emailModalIntF {
  state: boolean;
  screenshot: IEditorImage | null;
}

interface IShareProps {
  isOpenEditTool: boolean;
  active: boolean;
  onToolChange: (tool: ITool) => void;
  onResetShape: () => void;
  title?: string;
  image: IEditorImage;
  save: () => void;
}
const ShareTool: React.FC<IShareProps> = ({
  isOpenEditTool,
  active,
  onToolChange,
  onResetShape,
  title,
  image,
  save,
}) => {
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const navigate = useNavigate();
  const [slackModalState, setSlackModalState] = useState<boolean>(false);
  const [emailModalState, setEmailModalState] = useState<emailModalIntF>({
    state: false,
    screenshot: null,
  });

  const [whatsappModalState, setWhatsappModalState] = useState<boolean>(false);

  const openEmailModal = (screenshot: IEditorImage) => {
    setEmailModalState({
      state: true,
      screenshot,
    });
  };

  const closeEmailModal = () => {
    setEmailModalState({
      state: false,
      screenshot: null,
    });
  };

  return (
    <>
      <ToolBtn
        toolTitle={tools.share.title}
        isOpenEditTool={isOpenEditTool}
        active={active}
        placement="right"
        title={title}
        onSubpanelClose={() => onToolChange({} as ITool)}
        onSelect={() => {
          onResetShape();
          onToolChange(tools.share);
          // infoMessage('We are working hard to add this feature!');
        }}
        icon={tools.share.icon}
      >
        <div className="tw-transition-all">
          <h2 className="tw-text-ml tw-font-semibold tw-mb-2">Send to</h2>
          <div className="  tw-flex tw-items-center  tw-mb-4 tw-w-300px">
            {shareData.map((data, index) =>
              data.type === 'slack' && user?.isSlackIntegrate ? (
                <PopupButton
                  key={index}
                  iconSrc={data.icon}
                  onSelect={() => setSlackModalState(!slackModalState)}
                />
              ) : data.type !== 'slack' ? (
                <PopupButton
                  key={index}
                  iconSrc={data.icon}
                  onSelect={() => {
                    data.type === 'email'
                      ? openEmailModal(image)
                      : data.type === 'slack'
                        ? setSlackModalState(!slackModalState)
                        : data.type === 'whatsapp'
                          ? setWhatsappModalState(!whatsappModalState)
                          : infoMessage(
                              'We are working hard to add this feature!',
                            );
                  }}
                />
              ) : (
                <PopupButton
                  tooltipTitle="Please connect Slack from Integrations page."
                  key={index}
                  disabled={true}
                  iconSrc={data.icon}
                  onSelect={() => void 0}
                />
              ),
            )}
          </div>
        </div>
      </ToolBtn>

      <EmailModal
        visible={emailModalState.state}
        item={emailModalState.screenshot}
        onCancel={closeEmailModal}
        itemType={'image'}
        itemPublicLink={image?.url}
        onSave={save}
        fromEditor={true}
      />

      {slackModalState && image.dbData ? (
        <SlackShareScreen
          selectedItemId={image?.dbData?.id}
          user={user}
          onCancel={() => setSlackModalState(false)}
          forEditor={true}
          onSave={save}
        />
      ) : null}

      {whatsappModalState && image.dbData ? (
        <SendWhatsAppMessageScreen
          selectedItemId={image?.dbData?.id}
          onCancel={() => setWhatsappModalState(false)}
          forEditor={true}
          onSave={save}
        />
      ) : null}
    </>
  );
};

export default ShareTool;
