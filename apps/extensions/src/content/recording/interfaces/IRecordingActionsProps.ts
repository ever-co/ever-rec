import { StatusMessages } from '@/content/utilities/hooks/useReactMediaRecorder';

export default interface IRecordingActionsProps {
  recordingStatus: StatusMessages;
  microphoneMuted: boolean;
  microphoneEnabled: boolean;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  muteOrUnmute: (mute: boolean) => void;
  cancelRecording: () => void;
}
