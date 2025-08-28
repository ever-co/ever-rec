import React, { FC, useEffect, useState } from 'react';
import classNames from 'classnames';
//@ts-ignore
import * as styles from '../VideoEditorScreen.module.scss';

import { PlaybackStatusEnum } from '@/app/enums/StreamingServicesEnums';
import { IAppMessage, AppMessagesEnum } from '@/app/messagess';
import { useTranslation } from 'react-i18next';

interface IStreamLoadingInfoProps {
  streamState: any;
  uploadStatus: PlaybackStatusEnum | null;
}

const StreamLoadingInfo: FC<IStreamLoadingInfoProps> = ({
  streamState,
  uploadStatus,
}) => {
  const { t } = useTranslation();
  const [isPreparing, setIsPreparing] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState<boolean | null>(true);
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);

  // Playback state effect
  useEffect(() => {
    setIsPreparing(
      streamState?.playbackStatus === PlaybackStatusEnum.PREPARING,
    );

    console.log(uploadStatus);
    if (uploadStatus === PlaybackStatusEnum.PREPARING) {
      setIsUploading(true);
      setUploadPercentage(0);
    } else {
      setIsUploading(false);
    }
  }, [streamState, uploadStatus]);

  // Upload progress effect
  useEffect(() => {
    const runtimeListener = (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.streamServiceUploadProgress) {
        const { percentage } = message.payload;
        setUploadPercentage(percentage);
      }
      return true;
    };

    chrome.runtime.onMessage.addListener(runtimeListener);
    return () => {
      chrome.runtime.onMessage.removeListener(runtimeListener);
    };
  }, []);

  let infoMessage = t('ext.streamReady');
  if (isPreparing) infoMessage = t('ext.streamReady');
  if (isUploading) infoMessage = t('ext.uploading');

  if (!isUploading && !isPreparing) return null;

  return (
    <div className="tw-relative tw-flex">
      <div className={classNames(styles.loadingSpinner)}></div>
      <b>{infoMessage}</b>
      {isUploading && <b className="tw-ml-1">({uploadPercentage}%)</b>}
    </div>
  );
};

export default StreamLoadingInfo;
