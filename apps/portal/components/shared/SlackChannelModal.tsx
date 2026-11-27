import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import AppButton from 'components/controls/AppButton';
import AppSelect from 'components/controls/AppSelect';
import { RootStateOrAny, useSelector } from 'react-redux';
import { getChannels, sendSlackPostMessage } from 'app/services/screenshots';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [selectedChannel, setSelectedChannel] = useState('');
  const [errors, setErrors] = useState<null | string[]>(null);
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
          await onSave?.();
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
      setErrors(null);
      sendSlackScreenShot(selectedItemId, selectedChannel);
    } else {
      setErrors([t('toasts.pleaseSelectChannel')]);
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
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton
            onClick={onCancel}
            outlined
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={handleOnsubmit}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
            disabled={loading}
          >
            {t('common.send')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-4 tw-pr-6 tw-text-base tw-font-semibold">
        {t('modals.sendToSlack')}
      </h2>
      <AppSpinner show={channelLoading} local={true} />
      <AppSelect
        label={t('modals.selectChannel')}
        placeholder={t('modals.selectAOption')}
        value={selectedChannel}
        errors={errors || undefined}
        onChange={(value) => {
          setErrors(null);
          setSelectedChannel(value);
        }}
        options={channelsData}
      />
    </Modal>
  );
};

export default SlackChannelModal;
