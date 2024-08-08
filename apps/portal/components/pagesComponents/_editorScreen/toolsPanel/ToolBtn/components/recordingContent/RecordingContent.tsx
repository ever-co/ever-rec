import React, { useEffect, useRef, useState } from 'react';
import ControllerButton from './controllerButton/ControllerButton';
import { RecoringStatus } from 'hooks/useEditorVideo';
import styles from './recording-content.module.scss';
import classNames from 'classnames';
import { useStopwatch } from 'react-timer-hook';
import Draggable from 'react-draggable';

interface IRecordingContentProps {
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  muteAudio: () => void;
  unMuteAudio: () => void;
  onCancelRecording: () => void;
  recordStatus: RecoringStatus | undefined;
}

const RecordingContent: React.FC<IRecordingContentProps> = ({
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  muteAudio,
  unMuteAudio,
  onCancelRecording,
  recordStatus,
}) => {
  const [playPauseImgSource, setPlayPauseImgSource] =
    useState<string>('pause-light.svg');
  const [micImgSource, setMicImgSource] = useState<string>('unmute.svg');
  const mainContainerGlobal: any = useRef();

  const { seconds, minutes, isRunning, start, pause, reset } = useStopwatch({
    autoStart: false,
  });

  const textM = minutes >= 10 ? `${minutes}` : `0${minutes}`;
  const textS = seconds >= 10 ? `${seconds}` : `0${seconds}`;

  useEffect(() => {
    if (recordStatus == 'resume') {
      start();
    }
  }, [recordStatus]);

  const binButtonClickHandler = (): void => {
    onCancelRecording();
  };

  const stopButtonClickHandler = (): void => {
    onStopRecording();
  };

  const pausePlayClickHandler = (): void => {
    if (playPauseImgSource == 'pause-light.svg') {
      onPauseRecording();
      pause();
      setPlayPauseImgSource('play.svg');
    } else if (playPauseImgSource == 'play.svg') {
      onResumeRecording();
      start();
      setPlayPauseImgSource('pause-light.svg');
    }
  };

  const micClickHandler = (): void => {
    if (micImgSource == 'unmute.svg') {
      setMicImgSource('mute.svg');
      muteAudio();
    } else if (micImgSource == 'mute.svg') {
      setMicImgSource('unmute.svg');
      unMuteAudio();
    }
  };

  return (
    <Draggable
      bounds={{
        left: 0,
        bottom: 0,
        right: window.innerWidth - 250,
        top: -window.innerHeight + 100,
      }}
    >
      <div
        ref={mainContainerGlobal}
        className={classNames(
          styles.removePointerEvents,
          styles.recMain,
        )}
      >
        <div
          className={classNames(styles.recContainerEditor)}
          id="small-rec"
        >
          <div className={classNames(styles.content)}>
            <div className={classNames(styles.timer)}>
              {textM}:{textS}
            </div>
            <div className={classNames(styles.line)}></div>
            <div className={classNames(styles.mainButtons)}>
              <ControllerButton
                className={classNames(styles.stopButton)}
                onClick={stopButtonClickHandler}
                imgSource="button-stop-red-fill.svg"
              ></ControllerButton>
              <ControllerButton
                className={classNames(styles.pauseButton)}
                onClick={pausePlayClickHandler}
                imgSource={playPauseImgSource}
              ></ControllerButton>
              <ControllerButton
                className={classNames(styles.micButton)}
                onClick={micClickHandler}
                imgSource={micImgSource}
              ></ControllerButton>
              <ControllerButton
                className={classNames(styles.binButton)}
                onClick={binButtonClickHandler}
                imgSource={'bin.svg'}
              ></ControllerButton>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default RecordingContent;
