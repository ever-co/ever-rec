import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSelect from 'components/controls/AppSelect';
import { RootStateOrAny, useSelector } from 'react-redux';
import { getChannels, sendSlackPostMessage } from 'app/services/screenshots';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';

interface ISlackChannelModalProps {
  selectedItemId: string;
  type?: string;
  user: any;
  onCancel: () => void;
  forEditor?: boolean;
  onSave?: () => void;
}

const SlackChannelModal: React.FC<ISlackChannelModalProps> = ({
  onCancel,
  selectedItemId,
  user,
  type = 'image',
  forEditor,
  onSave,
}) => {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [channelLoading, setChannelLoading] = useState<boolean>(false);

  const channelsData: any[] = useSelector(
    (state: RootStateOrAny) => state.panel.channels,
  );

  const sendSlackScreenShot = async (selectedItemId: string, channelId) => {
    if (selectedItemId && channelId) {
      try {
        setLoading(true);
        if (forEditor) {
          await onSave();
        }
        const res = await sendSlackPostMessage(channelId, selectedItemId, type);
        if (res.status != 'error') {
          infoMessage('Item sent successfully');
          onCancel();
        } else {
          errorMessage(res.message);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOnsubmit = useCallback(() => {
    if (selectedItemId && selectedChannel) {
      setError(null);
      sendSlackScreenShot(selectedItemId, selectedChannel);
    } else {
      setError(['Please select channel']);
    }
  }, [selectedItemId, selectedChannel]);

  useEffect(() => {
    if (
      user &&
      user.isSlackIntegrate &&
      channelsData &&
      channelsData.length == 0
    ) {
      (async function () {
        setChannelLoading(true);
        await getChannels();
        setChannelLoading(false);
      })();
    }
  }, [channelsData, user]);

  return (
    <Modal
      visible={true}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={handleOnsubmit}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            disabled={loading}
          >
            Send
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">Send to slack</h2>
      <AppSpinner show={channelLoading} local={true} />
      <AppSelect
        label="Pick a channel or conversation to share and preview the code you've created in your Slack workspace."
        placeholder="Please select an option"
        value={selectedChannel}
        errors={error}
        onChange={(value) => {
          setError(null);
          setSelectedChannel(value);
        }}
        options={channelsData}
      />
    </Modal>
  );
};

export default SlackChannelModal;
