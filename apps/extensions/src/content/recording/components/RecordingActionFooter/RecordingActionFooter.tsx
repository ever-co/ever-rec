import React from 'react';
import IRecordingActionsProps from '../../interfaces/IRecordingActionsProps';
import Timer from '../Timer';
import RecordingButtons from './RecordingButtons/RecordingButtons';

const RecordingActionFooter: React.FC<IRecordingActionsProps> = ({
  recordingStatus,
  microphoneMuted,
  microphoneEnabled,
  stopRecording,
  pauseRecording,
  resumeRecording,
  muteOrUnmute,
  cancelRecording,
}) => {
  return (
    <div className="tw-flex tw-my-4 tw-pr-4">
      <div
        className="tw-flex tw-w-6/12 tw-justify-end tw-items-center"
        style={{ marginLeft: 46 }}
      >
        <span className="tw-text-primary-purple tw-font-bold tw-text-lg">
          <Timer status={recordingStatus} />
        </span>
      </div>
      <div className="tw-flex tw-w-6/12 tw-justify-end">
        <RecordingButtons
          recordingStatus={recordingStatus}
          microphoneMuted={microphoneMuted}
          microphoneEnabled={microphoneEnabled}
          stopRecording={stopRecording}
          pauseRecording={pauseRecording}
          resumeRecording={resumeRecording}
          muteOrUnmute={muteOrUnmute}
          cancelRecording={cancelRecording}
        />
      </div>
    </div>
  );
};

export default RecordingActionFooter;
