import React from 'react';
import { useTranslation } from 'react-i18next';
import ControllerButton from '@/content/overlay/components/recordingContent/controllerButton/ControllerButton';
import IRecordingActionsProps from '@/content/recording/interfaces/IRecordingActionsProps';

const RecordingButtons: React.FC<IRecordingActionsProps> = ({
  recordingStatus,
  microphoneMuted,
  microphoneEnabled,
  stopRecording,
  pauseRecording,
  resumeRecording,
  muteOrUnmute,
  cancelRecording,
}) => {
  const { t } = useTranslation();
  const subFolder = '/recordingWindowIcons';
  const canMute = !microphoneMuted && microphoneEnabled;

  return (
    <div id="recording-window-overwrite" className="rec-main">
      <ControllerButton
        className="stopButton"
        onClick={stopRecording}
        subFoldersWithPrefix={subFolder}
        imgSource="button-stop-red-fill.svg"
        label={t('ext.recordingControls.stop')}
      ></ControllerButton>
      {recordingStatus === 'recording' ? (
        <ControllerButton
          className="pauseButton"
          onClick={pauseRecording}
          subFoldersWithPrefix={subFolder}
          imgSource="button-pause-grey.svg"
          label={t('ext.recordingControls.pause')}
        ></ControllerButton>
      ) : (
        <ControllerButton
          className="pauseButton"
          onClick={resumeRecording}
          subFoldersWithPrefix={subFolder}
          imgSource="button-play-grey.svg"
          label={t('ext.recordingControls.resume')}
        ></ControllerButton>
      )}
      {/* One mounted button, so keyboard focus survives a mute toggle. */}
      <ControllerButton
        className="micButton"
        onClick={() => muteOrUnmute(canMute)}
        subFoldersWithPrefix={subFolder}
        imgSource={canMute ? 'button-unmute.svg' : 'button-mute.svg'}
        disabled={!microphoneEnabled}
        label={
          canMute
            ? t('ext.recordingControls.mute')
            : t('ext.recordingControls.unmute')
        }
      ></ControllerButton>
      <ControllerButton
        className="binButton"
        onClick={cancelRecording}
        subFoldersWithPrefix={subFolder}
        imgSource="button-bin-grey.svg"
        label={t('ext.recordingControls.cancel')}
      ></ControllerButton>
    </div>
  );
};

export default RecordingButtons;
