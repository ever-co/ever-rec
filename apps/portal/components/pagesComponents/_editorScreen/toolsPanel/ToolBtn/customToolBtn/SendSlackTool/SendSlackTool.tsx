import React, { useEffect, useRef, useState } from 'react';
import {
  ITool,
  tools,
} from 'components/pagesComponents/_editorScreen/toolsPanel/tools';
import ToolBtn from 'components/pagesComponents/_editorScreen/toolsPanel/ToolBtn/ToolBtn';
import AppButton from 'components/controls/AppButton';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppSelect from 'components/controls/AppSelect';
import { getChannels, sendSlackPostMessage } from 'app/services/screenshots';
import { infoMessage, errorMessage } from 'app/services/helpers/toastMessages';
import IEditorImage from 'app/interfaces/IEditorImage';
import styles from './sendSlackToll.module.scss';

interface ISlackToolProps {
  active: boolean;
  isOpenSlackTool: boolean;
  onSelect: (tool: ITool | null) => void;
  onSave: () => void;
}

const SendSlackTool: React.FC<ISlackToolProps> = ({
  active,
  isOpenSlackTool,
  onSelect,
  onSave,
}) => {
  const [selectedChannel, setSelectedChannel] = useState('');
  const [error, setError] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const subPanelRef = useRef<{
    closePanel: () => void;
  }>(null);
  const closeSubPanelHandler = () => onSelect(null);
  const closeSubPanel = () => subPanelRef?.current?.closePanel();
  const image: IEditorImage = useSelector(
    (state: RootStateOrAny) => state.panel.editorImage,
  );
  const channelsData: any[] = useSelector(
    (state: RootStateOrAny) => state.panel.channels,
  );

  useEffect(() => {
    if (
      user &&
      user.isSlackIntegrate &&
      channelsData &&
      channelsData.length == 0
    ) {
      (async function () {
        await getChannels();
      })();
    }
  }, [channelsData, user]);

  const sendSlackScreenShot = async () => {
    const id = image.dbData.id;
    if (id && selectedChannel) {
      try {
        setLoading(true);
        await onSave();
        const res = await sendSlackPostMessage(selectedChannel, id);
        console.log(res, 'res');
        if (res.status != 'error') {
          infoMessage('Screenshot sent successfully');
          closeSubPanel();
        } else {
          errorMessage(res.message);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ToolBtn
      isOpenEditTool={isOpenSlackTool}
      onSelect={() => onSelect(tools.slack)}
      icon={tools.slack.icon}
      active={active}
      onSubpanelClose={closeSubPanelHandler}
      ref={subPanelRef}
      placement="left"
      toolTitle="Share on Slack"
    >
      <div className={styles.parentContainer}>
        <div className={styles.innerContainer}>
          <h2 className={styles.title}>Share with slack</h2>
          <AppSelect
            placeholder="Please select an option"
            value={selectedChannel}
            errors={error}
            onChange={(value: any) => {
              setError([]);
              setSelectedChannel(value);
            }}
            options={channelsData}
          />
          <div className={styles.wrapper}>
            <div className={styles.flexContainer}>
              <AppButton
                className={styles.button}
                onClick={async () => {
                  if (selectedChannel) {
                    await sendSlackScreenShot();
                  } else errorMessage('Please select channel.');
                }}
                disabled={loading}
              >
                <span>Send</span>
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </ToolBtn>
  );
};

export default SendSlackTool;
