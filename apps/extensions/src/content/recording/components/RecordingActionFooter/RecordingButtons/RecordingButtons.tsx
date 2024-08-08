import React from 'react';
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
  const subFolder = '/recordingWindowIcons';

  return (
    <div id="recording-window-overwrite" className="rec-main">
      <ControllerButton
        className="stopButton"
        onClick={stopRecording}
        subFoldersWithPrefix={subFolder}
        imgSource="button-stop-red-fill.svg"
      ></ControllerButton>
      {recordingStatus === 'recording' ? (
        <ControllerButton
          className="pauseButton"
          onClick={pauseRecording}
          subFoldersWithPrefix={subFolder}
          imgSource="button-pause-grey.svg"
        ></ControllerButton>
      ) : (
        <ControllerButton
          className="pauseButton"
          onClick={resumeRecording}
          subFoldersWithPrefix={subFolder}
          imgSource="button-play-grey.svg"
        ></ControllerButton>
      )}
      {!microphoneMuted && microphoneEnabled && (
        <ControllerButton
          className="micButton"
          onClick={() => muteOrUnmute(true)}
          subFoldersWithPrefix={subFolder}
          imgSource="button-unmute.svg"
        />
      )}
      {(microphoneMuted || !microphoneEnabled) && (
        <ControllerButton
          className="micButton"
          onClick={() => muteOrUnmute(false)}
          subFoldersWithPrefix={subFolder}
          imgSource="button-mute.svg"
          disabled={!microphoneEnabled}
        ></ControllerButton>
      )}
      <ControllerButton
        className="binButton"
        onClick={cancelRecording}
        subFoldersWithPrefix={subFolder}
        imgSource="button-bin-grey.svg"
      ></ControllerButton>
    </div>
  );
};

export default RecordingButtons;
