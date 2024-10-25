import React, { FC, useEffect, useState } from 'react';
import classNames from 'classnames';
//@ts-ignore
import * as styles from '../VideoEditorScreen.module.scss';

import { PlaybackStatusEnum } from '@/app/enums/StreamingServicesEnums';
import { IAppMessage, AppMessagesEnum } from '@/app/messagess';

interface IStreamLoadingInfoProps {
  streamState: any;
  uploadStatus: PlaybackStatusEnum | null;
}

const StreamLoadingInfo: FC<IStreamLoadingInfoProps> = ({
  streamState,
  uploadStatus,
}) => {
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

  let infoMessage = 'Your stream is getting ready...';
  if (isPreparing) infoMessage = 'Your stream is getting ready...';
  if (isUploading) infoMessage = 'Uploading your video';

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
