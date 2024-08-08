import { useCallback, useEffect, useState } from 'react';
import CommonAC from '@/app/store/popup/actions/CommonAC';
import { AppMessagesEnum } from '@/app/messagess';
import { useDispatch } from 'react-redux';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { IVideoRecordingType } from '../../Main';
import sendMsgToController from '@/content/recording/helpers/sendMsgToController';

type hoverTypes = 'stop' | 'pause' | 'bin';

interface IProps {
  recording: IVideoRecordingType;
}

const RecordPopup = ({ recording }: IProps) => {
  const dispatch = useDispatch();
  const [playButton, setPlayButton] = useState<string>('');
  const [stopBtnHover, setStopBtnHover] = useState<boolean>(false);
  const [pauseBtnHover, setPauseBtnHover] = useState<boolean>(false);
  const [binBtnHover, setBinBtnHover] = useState<boolean>(false);
  const pickHoverImg = useCallback(
    (type: hoverTypes | string) => {
      if (type === 'stop') {
        return stopBtnHover
          ? 'stop-video-dark-hover.svg'
          : 'stop-video-dark-1.svg';
      } else if (type === 'bin') {
        return binBtnHover ? 'bin.svg' : 'bin-dark.svg';
      } else {
        if (playButton.match('play')) {
          return pauseBtnHover
            ? 'play-video-dark-hover.svg'
            : 'play-video-dark.svg';
        } else if (playButton.match('pause')) {
          return pauseBtnHover
            ? 'pause-video-dark-hover.svg'
            : 'pause-video-dark-1.svg';
        }
      }
    },
    [stopBtnHover, pauseBtnHover, playButton, binBtnHover],
  );

  const pausePlayClickHandler = async () => {
    if (playButton.match('pause')) {
      sendRuntimeMessage({
        action: AppMessagesEnum.resumeOrPauseRecordingSW,
        payload: {
          command: 'pause',
        },
      });

      sendMsgToController({
        action: AppMessagesEnum.controllerHandlerCS,
        payload: {
          command: 'pause',
        },
      });

      setPlayButton('play-video-dark.svg');
    } else if (playButton.match('play')) {
      sendRuntimeMessage({
        action: AppMessagesEnum.resumeOrPauseRecordingSW,
        payload: {
          command: 'resume',
        },
      });
      setPlayButton('pause-video-dark-1.svg');
    }
  };

  const stopVideo = (messagesEnum: AppMessagesEnum) => {
    dispatch(CommonAC.setRecordingVideo({ recording: null }));
    sendRuntimeMessage({
      action: messagesEnum,
      payload: {
        videoType: recording.recordStatus.videoType,
        command: 'stop',
      },
    });
    messagesEnum == AppMessagesEnum.discardCameraOnlySW && window.close();
  };

  useEffect(() => {
    if (recording?.recordStatus.videoStatus == 'recording') {
      setPlayButton('pause-video-dark-1.svg');
    } else if (recording?.recordStatus.videoStatus == 'pause') {
      setPlayButton('play-video-dark.svg');
    }
  }, [recording]);

  const hoverHandler = (type: hoverTypes) =>
    type === 'stop'
      ? setStopBtnHover(!stopBtnHover)
      : type === 'bin'
      ? setBinBtnHover(!binBtnHover)
      : setPauseBtnHover(!pauseBtnHover);

  let container: JSX.Element;
  if (
    recording.recordStatus.videoType == 'fullScreen' ||
    recording.recordStatus.videoType == 'tabScreen'
  ) {
    container = (
      <>
        <img
          src={chrome.runtime.getURL(
            `./images/contentImages/${pickHoverImg('stop')}`,
          )}
          onMouseOver={() => hoverHandler('stop')}
          onMouseLeave={() => hoverHandler('stop')}
          onClick={() => stopVideo(AppMessagesEnum.stopRecordingSW)}
          style={{ cursor: 'pointer' }}
        />
        <img
          src={chrome.runtime.getURL(
            `./images/contentImages/${pickHoverImg(
              recording?.recordStatus.videoStatus,
            )}`,
          )}
          onMouseOver={() => hoverHandler('pause')}
          onMouseLeave={() => hoverHandler('pause')}
          onClick={pausePlayClickHandler}
          style={{ cursor: 'pointer' }}
        />
      </>
    );
  } else if (recording.recordStatus.videoType == 'cameraOnly') {
    container = (
      <>
        <img
          src={chrome.runtime.getURL(
            `./images/contentImages/${pickHoverImg('stop')}`,
          )}
          onMouseOver={() => hoverHandler('stop')}
          onMouseLeave={() => hoverHandler('stop')}
          onClick={() => stopVideo(AppMessagesEnum.stopCameraOnlySW)}
          style={{ cursor: 'pointer' }}
        />
        <img
          src={chrome.runtime.getURL(
            `./images/contentImages/${pickHoverImg('bin')}`,
          )}
          onMouseOver={() => hoverHandler('bin')}
          onMouseLeave={() => hoverHandler('bin')}
          onClick={() => stopVideo(AppMessagesEnum.discardCameraOnlySW)}
          style={{ cursor: 'pointer' }}
        />
      </>
    );
  } else {
    container = <></>;
  }

  return (
    <div className="tw-p-6 tw-bg-blue-grey">
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-rounded-lg tw-bg-white">
        <h2 className="tw-mb-0 tw-mt-3 tw-font-bold tw-text-lg">
          {recording.recordTime}
        </h2>
        <hr className="tw-w-full tw-h-1 tw-my-3" />
        <div className="tw-mb-5 tw-flex tw-w-350px tw-justify-evenly">
          {container}
        </div>
      </div>
    </div>
  );
};

export default RecordPopup;
