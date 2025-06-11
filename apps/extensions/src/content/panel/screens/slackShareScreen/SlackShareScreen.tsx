import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import { RootStateOrAny, useSelector } from 'react-redux';
import { getChannels, sendSlackPostMessage } from '@/app/services/screenshots';
import {
  errorMessage,
  infoMessage,
} from '@/app/services/helpers/toastMessages';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import AppSelect from '@/content/components/controls/appSelect/AppSelect';
import { useTranslation } from 'react-i18next';

interface ISlackShareScreenProps {
  selectedItemId: string;
  type?: string;
  user: any;
  onCancel: () => void;
  forEditor?: boolean;
  onSave?: () => void;
}

const SlackShareScreen: React.FC<ISlackShareScreenProps> = ({
  onCancel,
  selectedItemId,
  user,
  type = 'image',
  forEditor,
  onSave,
}) => {
  const { t } = useTranslation();
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [channelLoading, setChannelLoading] = useState<boolean>(false);

  const channelsData: any[] = useSelector(
    (state: RootStateOrAny) => state.panel.channels,
  );

  const sendSlackScreenShot = async (
    selectedItemId: string,
    channelId: string,
  ) => {
    if (selectedItemId && channelId) {
      try {
        setLoading(true);
        if (forEditor && onSave) {
          await onSave();
        }
        const res = await sendSlackPostMessage(channelId, selectedItemId, type);
        if (res.status != 'error') {
          infoMessage(t('toasts.itemSentSuccess'));
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
      setError([t('toasts.pleaseSelectChannel')]);
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
      open={true}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={handleOnsubmit}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            disabled={loading}
          >
            {t('common.send')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
        {t('modals.sendToSlack')}
      </h2>
      <AppSpinner show={channelLoading} local={true} />
      <AppSelect
        label={t('modals.selectChannel')}
        placeholder={t('modals.selectAOption')}
        value={selectedChannel}
        errors={error}
        onChange={(value: any) => {
          setError(null);
          setSelectedChannel(value);
        }}
        options={channelsData}
      />
    </Modal>
  );
};

export default SlackShareScreen;
