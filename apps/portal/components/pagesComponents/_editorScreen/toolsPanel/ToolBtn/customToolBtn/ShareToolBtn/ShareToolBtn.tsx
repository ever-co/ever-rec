/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { shareData } from 'app/utilities/popupsData';
import Image from 'next/legacy/image';
import PanelSplitter from '../../../PanelSplitter';
import EmailModal from 'components/elements/EmailModal';
import { infoMessage } from 'app/services/helpers/toastMessages';
import { emailModalIntF } from 'pages/image/[id]';
import IEditorImage from 'app/interfaces/IEditorImage';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PopupButton from '../../components/popupButton';
import SendWhatsAppMessageModal from 'components/shared/SendWhatsAppMessageModal';
import SlackChannelModal from 'components/shared/SlackChannelModal';
import styles from './shareToolBtn.module.scss';
import { useRouter } from 'next/router';
import { panelRoutes, preRoutes } from 'components/_routes';
import { Tooltip } from 'antd';

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
  const router = useRouter();

  const [emailModalState, setEmailModalState] = useState<emailModalIntF>({
    state: false,
    screenshot: null,
  });
  const [whatsappModalState, setWhatsappModalState] = useState<boolean>(false);
  const [slackModalState, setSlackModalState] = useState<boolean>(false);
  const [slackTooltipVisible, setSlackTooltipVisible] = useState(false);

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
        onSubpanelClose={() => onToolChange(null as any)}
        onSelect={() => {
          onResetShape();
          onToolChange(tools.share);
          // infoMessage('We are working hard to add this feature!');
        }}
        icon={tools.share.icon}
      >
        <div className={styles.mainContainer}>
          <h2 className={styles.title}>Send to</h2>
          <div className={styles.container}>
            {shareData.map((data, index) =>
              data.type === 'slack' && user.isSlackIntegrate ? (
                <PopupButton
                  key={index}
                  iconSrc={data.icon.src}
                  onSelect={() => setSlackModalState(!slackModalState)}
                />
              ) : data.type !== 'slack' ? (
                <PopupButton
                  key={index}
                  iconSrc={data.icon.src}
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
                  disabled={true}
                  key={index}
                  iconSrc={data.icon.src}
                  tooltipTitle="Please connect Slack from Integrations page."
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
        itemPublicLink={image?.url as string}
        onSave={save}
        fromEditor={true}
      />

      {slackModalState ? (
        <SlackChannelModal
          selectedItemId={image.dbData?.id as string}
          user={user}
          onCancel={() => setSlackModalState(false)}
          forEditor={true}
          onSave={save}
        />
      ) : null}

      {whatsappModalState ? (
        <SendWhatsAppMessageModal
          selectedItemId={image.dbData?.id as string}
          onCancel={() => setWhatsappModalState(false)}
          forEditor={true}
          onSave={save}
        />
      ) : null}
    </>
  );
};

export default ShareTool;
