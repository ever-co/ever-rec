import React, { useEffect, useRef, useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { errorMessage } from '@/app/services/helpers/toastMessages';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppSelect from '@/content/components/controls/appSelect/AppSelect';
import { useSearchParams } from 'react-router-dom';
import { getChannels, sendSlackPostMessage } from '@/app/services/screenshots';
import { infoMessage } from '@/app/services/helpers/toastMessages';

interface ISlackToolProps {
  active: boolean;
  isOpenSlackTool: boolean;
  onSelect: (tool: ITool | null) => void;
  onSave: () => void;
  history: any;
}

const SendSlackTool: React.FC<ISlackToolProps> = ({
  active,
  isOpenSlackTool,
  onSelect,
  onSave,
  history,
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
  const [searchParams, setSearchParams] = useSearchParams();

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
    const id = searchParams.get('id');
    if (id && selectedChannel) {
      try {
        setLoading(true);
        if (history.length > 1) await onSave();
        const res = await sendSlackPostMessage(selectedChannel, id);
        if (res.status != 'error') {
          infoMessage('Item sent successfully');
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
      toolTitle={tools.slack.title}
    >
      <div className="tw-flex tw-flex-col tw-w-280px">
        <div className="tw-flex tw-w-full tw-items-start tw-justify-start  tw-flex-col">
          <h2 className="tw-text-2xl tw-font-semibold tw-mb-2">
            Share with slack
          </h2>
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
          <div
            className={`tw-pt-13px tw-flex tw-w-full tw-items-start tw-justify-between  tw-flex-row'} `}
          >
            <div className={`tw-flex tw-w- tw-items-center tw-justify-end`}>
              <AppButton
                className="tw-px-5 tw-pb-1 tw-pt-1 tw-rounded-full tw-border-2 tw-border-torea-bay"
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
